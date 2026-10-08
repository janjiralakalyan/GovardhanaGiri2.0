"""
GovardhanaGiri 2.0: FastAPI Early Warning & Decision Support Backend
====================================================================
Serves real-time telemetry, live XGBoost hazard inference, cloudburst simulations,
and disaster response coordination for Telangana flash flood prone areas.
"""

import os
import sys
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel
from typing import Optional, Dict, Any, List

from backend.predictor import ai_bridge
from backend.mock_telemetry import (
    get_all_stations,
    get_station_by_id,
    update_station_telemetry,
    trigger_cloudburst_scenario,
    reset_to_normal_monsoon
)

app = FastAPI(
    title="GovardhanaGiri 2.0 API",
    description="Hyper-Local Flash Flood Early Warning System for Hilly Regions (Telangana Hotspots)",
    version="2.0.0"
)

# Enable CORS for local and web client access
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FRONTEND_DIR = os.path.join(BASE_DIR, "frontend")

# Pydantic Models
class TelemetryUpdate(BaseModel):
    Rainfall_1h: Optional[float] = None
    Rainfall_3h: Optional[float] = None
    Rainfall_6h: Optional[float] = None
    Rainfall_24h: Optional[float] = None
    Rainfall_Intensity: Optional[float] = None
    Soil_Moisture: Optional[float] = None
    Soil_Saturation: Optional[float] = None
    Water_Level: Optional[float] = None

class AlertDispatch(BaseModel):
    station_id: str
    alert_tier: str
    channels: List[str]  # e.g. ["public_siren", "sms_broadcast", "sdrf_dispatch"]
    custom_message: Optional[str] = None

# API Endpoints
@app.get("/api/health")
def health_check():
    return {
        "status": "healthy",
        "system": "GovardhanaGiri 2.0",
        "ai_engine": "XGBoost Hazard Models Active"
    }

@app.get("/api/geography")
def get_geography_layers():
    """Returns geospatial features for Telangana rivers, streams, and ghat ranges."""
    geo_path = os.path.join(BASE_DIR, "data", "telangana_geography_layers.json")
    if os.path.exists(geo_path):
        import json
        with open(geo_path, "r") as f:
            return json.load(f)
    return {"type": "FeatureCollection", "features": []}

@app.get("/api/stations")
def list_stations():
    """Returns all 10 Telangana stations enriched with live AI hazard predictions."""
    raw_stations = get_all_stations()
    enriched = []
    
    total_population_at_risk = 0
    critical_count = 0
    warning_count = 0

    for stn in raw_stations:
        pred = ai_bridge.predict_station_telemetry(stn["telemetry"])
        
        # Aggregate stats
        if pred["risk_level"] in ["High", "Critical"]:
            total_population_at_risk += stn["population"]
            if pred["risk_level"] == "Critical":
                critical_count += 1
            else:
                warning_count += 1

        enriched_stn = {
            **stn,
            "prediction": pred
        }
        enriched.append(enriched_stn)

    return {
        "summary": {
            "total_stations": len(enriched),
            "critical_evacuations_active": critical_count,
            "warnings_active": warning_count,
            "population_at_risk": total_population_at_risk
        },
        "stations": enriched
    }

@app.get("/api/stations/{station_id}")
def station_detail(station_id: str):
    stn = get_station_by_id(station_id)
    if not stn:
        raise HTTPException(status_code=404, detail="Station not found")
    pred = ai_bridge.predict_station_telemetry(stn["telemetry"])
    return {
        **stn,
        "prediction": pred
    }

@app.post("/api/predict")
def predict_adhoc(telemetry: Dict[str, Any]):
    """Runs prediction on any custom user-provided telemetry payload."""
    try:
        res = ai_bridge.predict_station_telemetry(telemetry)
        return res
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Prediction error: {str(e)}")

@app.post("/api/stations/{station_id}/simulate-cloudburst")
def simulate_cloudburst(station_id: str):
    stn = trigger_cloudburst_scenario(station_id)
    if not stn:
        raise HTTPException(status_code=404, detail="Station not found")
    pred = ai_bridge.predict_station_telemetry(stn["telemetry"])
    return {
        "message": f"Cloudburst shockwave simulated on {stn['village_area']}",
        "station": {**stn, "prediction": pred}
    }

@app.post("/api/stations/{station_id}/reset-normal")
def reset_station(station_id: str):
    stn = reset_to_normal_monsoon(station_id)
    if not stn:
        raise HTTPException(status_code=404, detail="Station not found")
    pred = ai_bridge.predict_station_telemetry(stn["telemetry"])
    return {
        "message": f"Station {stn['village_area']} reset to normal conditions.",
        "station": {**stn, "prediction": pred}
    }

@app.post("/api/stations/{station_id}/telemetry")
def update_telemetry(station_id: str, update: TelemetryUpdate):
    filtered_update = {k: v for k, v in update.model_dump().items() if v is not None}
    stn = update_station_telemetry(station_id, filtered_update)
    if not stn:
        raise HTTPException(status_code=404, detail="Station not found")
    pred = ai_bridge.predict_station_telemetry(stn["telemetry"])
    return {
        "message": "Telemetry updated successfully",
        "station": {**stn, "prediction": pred}
    }

@app.post("/api/dispatch-alert")
def dispatch_alert(req: AlertDispatch):
    stn = get_station_by_id(req.station_id)
    if not stn:
        raise HTTPException(status_code=404, detail="Station not found")
    
    # Simulate dispatch logic
    sent_sms_count = int(stn["population"] * 0.82)
    siren_activated = "public_siren" in req.channels
    sdrf_alerted = "sdrf_dispatch" in req.channels

    return {
        "status": "DISPATCHED",
        "station_id": req.station_id,
        "village_area": stn["village_area"],
        "mandal": stn["mandal"],
        "alert_tier": req.alert_tier,
        "actions_taken": {
            "sms_broadcast_count": sent_sms_count,
            "public_siren_sounding": siren_activated,
            "sdrf_ndrf_mobilized": sdrf_alerted,
            "relief_camps_opened": [s["name"] for s in stn["shelters"][:2]]
        },
        "dispatch_timestamp": "Real-time Immediate"
    }

@app.get("/api/model-info")
def model_info():
    return ai_bridge.metadata

from backend.nelens_router import router as nelens_router
from backend.copilot_router import router as copilot_router

app.include_router(nelens_router)
app.include_router(copilot_router)

# Mount frontend directory for static assets if exists
if os.path.exists(FRONTEND_DIR):
    app.mount("/static", StaticFiles(directory=FRONTEND_DIR), name="static")

    @app.get("/")
    def serve_frontend_index():
        nelens_path = os.path.join(FRONTEND_DIR, "nelens.html")
        if os.path.exists(nelens_path):
            return FileResponse(nelens_path)
        return FileResponse(os.path.join(FRONTEND_DIR, "index.html"))

    @app.get("/floods")
    def serve_flood_index():
        return FileResponse(os.path.join(FRONTEND_DIR, "index.html"))

    @app.get("/nelens")
    def serve_nelens_explicit():
        return FileResponse(os.path.join(FRONTEND_DIR, "nelens.html"))

if __name__ == "__main__":
    import uvicorn
    print("[GovardhanaGiri 2.0] Starting server at http://127.0.0.1:8000 ...")
    uvicorn.run("backend.main:app", host="127.0.0.1", port=8000, reload=True)

