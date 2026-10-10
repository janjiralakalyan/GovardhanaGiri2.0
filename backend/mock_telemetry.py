"""
GovardhanaGiri 2.0: Telemetry Manager & Station State Store
Maintains active telemetry states for all 10 Telangana stations,
supports real-time cloudburst simulation, and provides evacuation shelter metadata.
"""

import os
import json
import random
from datetime import datetime

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
STATIONS_FILE = os.path.join(BASE_DIR, "data", "telangana_monitoring_stations.json")

# In-memory station registry with live telemetry
STATION_STATES = {}

def init_stations():
    global STATION_STATES
    with open(STATIONS_FILE, "r") as f:
        stations = json.load(f)

    # Initial realistic telemetry baseline (late monsoon scenario)
    for idx, s in enumerate(stations):
        s_id = f"TEL-STN-{idx+1:02d}"
        
        # Determine baseline conditions based on location
        if "Medaram" in s["village_area"]:
            # Jampanna Vagu starts in active moderate/rising state
            rain_1h = 24.5
            rain_3h = 58.0
            rain_6h = 82.0
            rain_24h = 110.0
            rain_intensity = 32.0
            soil_moist = 72.0
            soil_sat = 76.0
            water_lvl = 3.8
        elif "Bhadrachalam" in s["village_area"]:
            # Godavari starts in rising state (near first warning level 13.0m)
            rain_1h = 14.0
            rain_3h = 35.0
            rain_6h = 62.0
            rain_24h = 95.0
            rain_intensity = 18.0
            soil_moist = 68.0
            soil_sat = 70.0
            water_lvl = 11.2
        elif "Kerameri" in s["village_area"]:
            # Kerameri ghat range steep runoff
            rain_1h = 18.0
            rain_3h = 36.0
            rain_6h = 48.0
            rain_24h = 70.0
            rain_intensity = 22.0
            soil_moist = 55.0
            soil_sat = 60.0
            water_lvl = 2.4
        else:
            rain_1h = 5.2
            rain_3h = 12.0
            rain_6h = 22.0
            rain_24h = 40.0
            rain_intensity = 7.5
            soil_moist = 44.0
            soil_sat = 48.0
            water_lvl = round(s["base_danger_water_level"] * 0.35, 2)

        # Evacuation Shelters & Relief Camps
        shelters = [
            {
                "name": f"{s['mandal']} Model Residential School & College",
                "type": "Cyclone & Flood Safe Shelter",
                "elevation_m": round(s["elevation_base"] + 25.0, 1),
                "distance_km": 1.8,
                "capacity": 1500,
                "contact": "+91-94906-88001"
            },
            {
                "name": f"{s['district']} Zilla Parishad High School Ground",
                "type": "Primary Relief Camp",
                "elevation_m": round(s["elevation_base"] + 18.5, 1),
                "distance_km": 2.4,
                "capacity": 2200,
                "contact": "+91-94906-88002"
            },
            {
                "name": "Mandal Revenue Office Community Hall",
                "type": "Emergency Transit Center",
                "elevation_m": round(s["elevation_base"] + 32.0, 1),
                "distance_km": 3.1,
                "capacity": 800,
                "contact": "+91-94906-88003"
            }
        ]

        STATION_STATES[s_id] = {
            "id": s_id,
            "district": s["district"],
            "mandal": s["mandal"],
            "village_area": s["village_area"],
            "lat": s["lat"],
            "lon": s["lon"],
            "elevation": s["elevation_base"],
            "slope": s["slope_base"],
            "aspect": s["aspect"],
            "terrain_ruggedness": s["ruggedness"],
            "river_id": s["river_id"],
            "river_name": s["river_name"],
            "danger_water_level": s["base_danger_water_level"],
            "distance_to_river": s["distance_to_river_base"],
            "flow_accumulation": s["flow_accum_base"],
            "drainage_density": s["drainage_density"],
            "land_cover": s["land_cover"],
            "soil_type": s["soil_type"],
            "ndvi": s["ndvi_base"],
            "impervious_surface": s["impervious_base"],
            "population": s["population"],
            "building_density": s["building_density"],
            "historical_flood_frequency": s["hist_flood_freq"],
            "shelters": shelters,
            # Live Telemetry State
            "telemetry": {
                "Rainfall_1h": rain_1h,
                "Rainfall_3h": rain_3h,
                "Rainfall_6h": rain_6h,
                "Rainfall_24h": rain_24h,
                "Rainfall_48h": round(rain_24h * 1.35, 1),
                "Rainfall_72h": round(rain_24h * 1.60, 1),
                "Rainfall_Intensity": rain_intensity,
                "Forecast_Rainfall_6h": round(rain_6h * 0.8, 1),
                "Forecast_Rainfall_12h": round(rain_6h * 1.35, 1),
                "Soil_Moisture": soil_moist,
                "Soil_Saturation": soil_sat,
                "Infiltration_Rate": max(0.8, round(15.0 * (1 - (soil_sat/100)**1.8), 2)),
                "Water_Level": water_lvl,
                "Elevation": s["elevation_base"],
                "Slope": s["slope_base"],
                "Terrain_Ruggedness": s["ruggedness"],
                "Flow_Accumulation": s["flow_accum_base"],
                "Distance_to_River": s["distance_to_river_base"],
                "Drainage_Density": s["drainage_density"],
                "NDVI": s["ndvi_base"],
                "Historical_Flood_Frequency": s["hist_flood_freq"],
                "Land_Cover": s["land_cover"],
                "Soil_Type": s["soil_type"],
                "last_updated": datetime.now().isoformat()
            }
        }

init_stations()

def get_all_stations():
    return list(STATION_STATES.values())

def get_station_by_id(station_id):
    return STATION_STATES.get(station_id)

def update_station_telemetry(station_id, new_telemetry):
    if station_id in STATION_STATES:
        STATION_STATES[station_id]["telemetry"].update(new_telemetry)
        STATION_STATES[station_id]["telemetry"]["last_updated"] = datetime.now().isoformat()
        return STATION_STATES[station_id]
    return None

def trigger_cloudburst_scenario(station_id):
    """
    Simulates a localized cloudburst shock on the selected station:
    Rainfall spikes to 95-125 mm/hr, soil saturates to >95%, and water stage shoots up!
    """
    if station_id not in STATION_STATES:
        return None
    stn = STATION_STATES[station_id]
    danger = stn["danger_water_level"]

    burst_telemetry = {
        "Rainfall_1h": round(random.uniform(85.0, 130.0), 1),
        "Rainfall_3h": round(random.uniform(140.0, 195.0), 1),
        "Rainfall_6h": round(random.uniform(180.0, 260.0), 1),
        "Rainfall_24h": round(random.uniform(220.0, 340.0), 1),
        "Rainfall_48h": round(random.uniform(280.0, 420.0), 1),
        "Rainfall_72h": round(random.uniform(340.0, 490.0), 1),
        "Rainfall_Intensity": round(random.uniform(95.0, 145.0), 1),
        "Forecast_Rainfall_6h": round(random.uniform(90.0, 160.0), 1),
        "Forecast_Rainfall_12h": round(random.uniform(140.0, 240.0), 1),
        "Soil_Moisture": round(random.uniform(92.0, 98.5), 1),
        "Soil_Saturation": round(random.uniform(94.0, 99.2), 1),
        "Infiltration_Rate": 0.45,
        "Water_Level": round(danger * random.uniform(1.15, 1.45), 2),  # Exceeds danger mark!
        "last_updated": datetime.now().isoformat()
    }
    stn["telemetry"].update(burst_telemetry)
    return stn

def reset_to_normal_monsoon(station_id):
    """Resets station to peaceful normal conditions."""
    if station_id not in STATION_STATES:
        return None
    stn = STATION_STATES[station_id]
    normal_telemetry = {
        "Rainfall_1h": 2.5,
        "Rainfall_3h": 6.0,
        "Rainfall_6h": 12.0,
        "Rainfall_24h": 25.0,
        "Rainfall_48h": 38.0,
        "Rainfall_72h": 48.0,
        "Rainfall_Intensity": 4.0,
        "Forecast_Rainfall_6h": 8.0,
        "Forecast_Rainfall_12h": 14.0,
        "Soil_Moisture": 35.0,
        "Soil_Saturation": 38.0,
        "Infiltration_Rate": 12.5,
        "Water_Level": round(stn["danger_water_level"] * 0.32, 2),
        "last_updated": datetime.now().isoformat()
    }
    stn["telemetry"].update(normal_telemetry)
    return stn
