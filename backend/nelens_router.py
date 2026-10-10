"""
NE-LENS: Northeast India Landslide Early Warning & Risk Monitoring System
Backend API Router & In-Memory State Manager
"""

import os
import json
from datetime import datetime
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List, Dict, Any

router = APIRouter(prefix="/api/nelens", tags=["NE-LENS"])

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_FILE = os.path.join(BASE_DIR, "data", "nelens_northeast_data.json")

# In-memory store
NELENS_STATE: Dict[str, Any] = {}

def load_nelens_data():
    global NELENS_STATE
    if os.path.exists(DATA_FILE):
        with open(DATA_FILE, "r", encoding="utf-8") as f:
            NELENS_STATE = json.load(f)
    else:
        NELENS_STATE = {"locations": []}

load_nelens_data()

# Request schemas
class AlertDispatchPayload(BaseModel):
    location_id: str
    priority: str
    channels: List[str]
    alert_title: str
    instructions: List[str]
    recipient_groups: Optional[List[str]] = None

class NewFieldReport(BaseModel):
    location_id: str
    title: str
    type: str  # Crack, Rockfall, Mudslide, Road blockage, Slope movement, Drainage blockage
    location: str
    reporter: str
    notes: str
    lat: Optional[float] = None
    lon: Optional[float] = None

from backend.landslide_engine import landslide_forecast_engine

@router.get("/overview")
def get_overview(data_mode: str = "SIMULATED_DEMO"):
    load_nelens_data()
    raw_locations = NELENS_STATE.get("locations", [])
    locations = []
    critical_count = 0
    high_count = 0
    mod_count = 0
    low_count = 0
    total_exposed_pop = 0

    for loc in raw_locations:
        forecast_7h = landslide_forecast_engine.compute_multi_horizon_forecast(loc, data_source_mode=data_mode)
        peak_tier = forecast_7h["peak_risk_horizon"]["risk_tier"]
        enriched_loc = {
            **loc,
            "forecast_7h": forecast_7h
        }
        locations.append(enriched_loc)

        if peak_tier == "CRITICAL":
            critical_count += 1
            total_exposed_pop += loc.get("exposure", {}).get("population_affected", 0)
        elif peak_tier == "HIGH":
            high_count += 1
            total_exposed_pop += loc.get("exposure", {}).get("population_affected", 0)
        elif peak_tier == "MODERATE":
            mod_count += 1
        else:
            low_count += 1

    # Selected default is Aizawl
    default_loc = next((l for l in locations if l.get("id") == "AIZAWL-01"), locations[0] if locations else None)

    return {
        "system_name": NELENS_STATE.get("system_name", "NE-LENS"),
        "full_title": NELENS_STATE.get("full_title", ""),
        "last_updated": datetime.now().strftime("%d %b %Y | %H:%M:%S IST"),
        "data_mode": data_mode,
        "is_demo_simulated": (data_mode == "SIMULATED_DEMO"),
        "horizons_supported": [1, 2, 3, 4, 5, 6, 7],
        "sensors_online": "52 / 52 Active",
        "station_summary": {
            "total_locations": len(locations),
            "critical_count": critical_count,
            "high_count": high_count,
            "moderate_count": mod_count,
            "low_count": low_count,
            "total_exposed_population": total_exposed_pop
        },
        "default_location": default_loc,
        "locations": locations
    }

@router.get("/locations")
def list_locations():
    return NELENS_STATE.get("locations", [])

@router.get("/locations/{loc_id}")
def get_location_detail(loc_id: str, data_mode: str = "SIMULATED_DEMO"):
    locations = NELENS_STATE.get("locations", [])
    loc = next((l for l in locations if l.get("id") == loc_id), None)
    if not loc:
        raise HTTPException(status_code=404, detail="Location not found")
    forecast_7h = landslide_forecast_engine.compute_multi_horizon_forecast(loc, data_source_mode=data_mode)
    return {
        **loc,
        "forecast_7h": forecast_7h
    }

@router.get("/forecast/{loc_id}")
def get_location_forecast(loc_id: str, data_mode: str = "SIMULATED_DEMO"):
    locations = NELENS_STATE.get("locations", [])
    loc = next((l for l in locations if l.get("id") == loc_id), None)
    if not loc:
        raise HTTPException(status_code=404, detail="Location not found")
    return landslide_forecast_engine.compute_multi_horizon_forecast(loc, data_source_mode=data_mode)

@router.post("/dispatch-alert")
def dispatch_alert(req: AlertDispatchPayload):
    locations = NELENS_STATE.get("locations", [])
    loc = next((l for l in locations if l.get("id") == req.location_id), None)
    if not loc:
        raise HTTPException(status_code=404, detail="Location not found")
    
    timestamp = datetime.now().strftime("%H:%M IST, %d %b %Y")
    alert_ref = f"ALERT-NE-{int(datetime.now().timestamp()) % 100000:05d}"
    
    return {
        "status": "ISSUED",
        "alert_id": alert_ref,
        "location": loc.get("corridor_name"),
        "district": loc.get("district"),
        "state": loc.get("state"),
        "priority": req.priority,
        "issued_at": timestamp,
        "channels_broadcast": req.channels,
        "target_recipients": req.recipient_groups or ["DDMA Quick Response", "Village Disaster Committees", "State PWD", "SDRF"],
        "sms_count_dispatched": int(loc.get("exposure", {}).get("population_affected", 3000) * 0.85),
        "message": f"Official Landslide Early Warning {req.priority} broadcasted for {loc.get('corridor_name')}, {loc.get('district')}."
    }

@router.post("/verify-report/{report_id}")
def verify_field_report(report_id: str):
    for loc in NELENS_STATE.get("locations", []):
        for rep in loc.get("field_reports", []):
            if rep.get("id") == report_id:
                rep["status"] = "Verified"
                rep["verified_at"] = datetime.now().strftime("%H:%M IST")
                return {"message": "Field report marked as verified", "report": rep}
    raise HTTPException(status_code=404, detail="Report not found")

@router.post("/submit-field-report")
def submit_field_report(report: NewFieldReport):
    locations = NELENS_STATE.get("locations", [])
    loc = next((l for l in locations if l.get("id") == report.location_id), None)
    if not loc:
        raise HTTPException(status_code=404, detail="Location not found")
    
    new_rep_id = f"REP-FLD-{int(datetime.now().timestamp()) % 10000:04d}"
    rep_obj = {
        "id": new_rep_id,
        "title": report.title,
        "type": report.type,
        "location": report.location,
        "time_ago": "Just now",
        "status": "Awaiting verification",
        "reporter": report.reporter,
        "lat": report.lat or (loc.get("lat") + 0.003),
        "lon": report.lon or (loc.get("lon") + 0.002),
        "notes": report.notes
    }
    if "field_reports" not in loc:
        loc["field_reports"] = []
    loc["field_reports"].insert(0, rep_obj)
    return {"message": "Field report submitted successfully", "report": rep_obj}

@router.get("/report")
def get_assessment_report():
    report_path = os.path.join(BASE_DIR, "reports", "LANDSLIDE_HAZARD_ASSESSMENT_REPORT.md")
    if os.path.exists(report_path):
        with open(report_path, "r", encoding="utf-8") as f:
            return {"content": f.read()}
    return {"content": "Report not generated yet."}

