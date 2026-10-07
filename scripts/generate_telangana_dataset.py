"""
GovardhanaGiri 2.0: Telangana Multi-Source Flash Flood & Disaster Dataset Generator
==================================================================================
Generates realistic, physically-consistent multi-source telemetry and geospatial disaster datasets
tailored to Telangana's hilly, river basin, and flash-flood vulnerable zones:
- Bhadradri Kothagudem (Godavari River basin, Papikondalu hill fringes, Bhadrachalam)
- Mulugu & Jayashankar Bhupalpally (Jampanna Vagu / Medaram, Eturnagaram, Dayam Vagu)
- Kumuram Bheem Asifabad & Adilabad (Kerameri Ghats, Kuntala/Pochera catchments, Penganga)
- Nirmal (Kadam Dam catchment, Kadam River, Nirmal Ghats)
- Khammam (Munneru River flash flood corridor, Wyra basin)
- Nagarkurnool & Mahabubnagar (Amrabad Plateau, Nallamala ravines, Dindi river)
- Hyderabad Urban Catchment (Musi River, rocky Deccan terrain, high impervious surface)
"""

import os
import json
import math
import numpy as np
import pandas as pd
from datetime import datetime, timedelta

# Create output directories
os.makedirs("data", exist_ok=True)
os.makedirs("data/processed", exist_ok=True)

# Define Telangana Target Locations (Centroids, Topography, Rivers, Hydrology)
LOCATIONS = [
    {
        "district": "Bhadradri Kothagudem",
        "mandal": "Bhadrachalam",
        "village_area": "Bhadrachalam Ghat / Vista Complex",
        "lat": 17.6688, "lon": 80.8936,
        "elevation_base": 48.0, "slope_base": 8.5, "aspect": 115, "ruggedness": 12.4,
        "river_id": "RIV-GODAVARI-01", "river_name": "Godavari River",
        "distance_to_river_base": 80, "flow_accum_base": 85000, "drainage_density": 3.8,
        "soil_type": "Alluvial Loam", "rock_type": "Gondwana Sandstone",
        "land_use": "Riparian / Settlement", "land_cover": "Settlement & Mixed Vegetation",
        "ndvi_base": 0.42, "impervious_base": 45.0, "population": 50087,
        "building_density": "High", "hist_flood_freq": 14, "base_danger_water_level": 15.5
    },
    {
        "district": "Bhadradri Kothagudem",
        "mandal": "Charla",
        "village_area": "Subbanapalli / Taliperu Catchment",
        "lat": 18.0645, "lon": 80.7022,
        "elevation_base": 65.0, "slope_base": 14.0, "aspect": 180, "ruggedness": 18.2,
        "river_id": "RIV-TALIPERU-02", "river_name": "Taliperu River",
        "distance_to_river_base": 150, "flow_accum_base": 32000, "drainage_density": 4.1,
        "soil_type": "Red Sandy Loam", "rock_type": "Archean Granites",
        "land_use": "Forest / Rural Catchment", "land_cover": "Deciduous Forest",
        "ndvi_base": 0.68, "impervious_base": 12.0, "population": 4820,
        "building_density": "Low", "hist_flood_freq": 9, "base_danger_water_level": 7.8
    },
    {
        "district": "Mulugu",
        "mandal": "SS Tadwai",
        "village_area": "Medaram (Jampanna Vagu Flash Corridor)",
        "lat": 18.3186, "lon": 80.2472,
        "elevation_base": 142.0, "slope_base": 19.5, "aspect": 210, "ruggedness": 28.5,
        "river_id": "RIV-JAMPANNA-03", "river_name": "Jampanna Vagu",
        "distance_to_river_base": 45, "flow_accum_base": 24000, "drainage_density": 5.2,
        "soil_type": "Forest Clay Loam", "rock_type": "Pakhal Quartzite & Shale",
        "land_use": "Dense Forest & Pilgrimage Grounds", "land_cover": "Thick Canopy Forest",
        "ndvi_base": 0.76, "impervious_base": 8.0, "population": 3200,
        "building_density": "Sparse", "hist_flood_freq": 12, "base_danger_water_level": 5.2
    },
    {
        "district": "Mulugu",
        "mandal": "Eturnagaram",
        "village_area": "Eturnagaram Wildlife Valley / Dayam Vagu",
        "lat": 18.3364, "lon": 80.4328,
        "elevation_base": 82.0, "slope_base": 16.2, "aspect": 95, "ruggedness": 22.0,
        "river_id": "RIV-DAYAM-04", "river_name": "Dayam Vagu (Godavari Trib)",
        "distance_to_river_base": 110, "flow_accum_base": 41000, "drainage_density": 4.6,
        "soil_type": "Silty Clay Loam", "rock_type": "Metasedimentary Schist",
        "land_use": "Forested Valley", "land_cover": "Moist Deciduous",
        "ndvi_base": 0.72, "impervious_base": 10.0, "population": 9400,
        "building_density": "Low", "hist_flood_freq": 11, "base_danger_water_level": 6.5
    },
    {
        "district": "Kumuram Bheem Asifabad",
        "mandal": "Kerameri",
        "village_area": "Kerameri Ghat Range / Pittaguda",
        "lat": 19.4520, "lon": 79.1672,
        "elevation_base": 610.0, "slope_base": 32.5, "aspect": 340, "ruggedness": 58.0,
        "river_id": "RIV-KERAMERI-05", "river_name": "Kerameri Hill Torrent",
        "distance_to_river_base": 60, "flow_accum_base": 18500, "drainage_density": 6.4,
        "soil_type": "Gravelly Black Cotton & Lithic", "rock_type": "Deccan Basaltic Traps",
        "land_use": "Steep Hill Slopes & Agriculture", "land_cover": "Scrub & Dry Forest",
        "ndvi_base": 0.51, "impervious_base": 14.0, "population": 2650,
        "building_density": "Sparse", "hist_flood_freq": 8, "base_danger_water_level": 4.5
    },
    {
        "district": "Adilabad",
        "mandal": "Neradigonda",
        "village_area": "Kuntala Falls Gorge Catchment",
        "lat": 19.3089, "lon": 78.4892,
        "elevation_base": 415.0, "slope_base": 28.0, "aspect": 245, "ruggedness": 52.4,
        "river_id": "RIV-KUNTALA-06", "river_name": "Kadem Stream Gorge",
        "distance_to_river_base": 90, "flow_accum_base": 29000, "drainage_density": 5.8,
        "soil_type": "Skeletal Loamy Soil", "rock_type": "Basalt with Intertrappeans",
        "land_use": "Ghat Forest & Ravine", "land_cover": "Deciduous Ravine Forest",
        "ndvi_base": 0.65, "impervious_base": 6.0, "population": 1890,
        "building_density": "Very Sparse", "hist_flood_freq": 10, "base_danger_water_level": 6.0
    },
    {
        "district": "Nirmal",
        "mandal": "Kadam (Peddur)",
        "village_area": "Kadam Dam Reservoir Rim / Maddipadaga",
        "lat": 19.1235, "lon": 78.7845,
        "elevation_base": 218.0, "slope_base": 21.0, "aspect": 160, "ruggedness": 34.2,
        "river_id": "RIV-KADAM-07", "river_name": "Kadam River",
        "distance_to_river_base": 120, "flow_accum_base": 64000, "drainage_density": 4.9,
        "soil_type": "Clayey Black & Red Soil", "rock_type": "Granitic Gneiss",
        "land_use": "Reservoir Foreshore / Farms", "land_cover": "Cropland & Scrub",
        "ndvi_base": 0.55, "impervious_base": 15.0, "population": 6200,
        "building_density": "Moderate", "hist_flood_freq": 13, "base_danger_water_level": 8.9
    },
    {
        "district": "Khammam",
        "mandal": "Khammam Urban",
        "village_area": "Prakash Nagar / Munneru River Bank",
        "lat": 17.2472, "lon": 80.1514,
        "elevation_base": 105.0, "slope_base": 6.2, "aspect": 135, "ruggedness": 8.5,
        "river_id": "RIV-MUNNERU-08", "river_name": "Munneru River",
        "distance_to_river_base": 50, "flow_accum_base": 78000, "drainage_density": 3.4,
        "soil_type": "Alluvial Clay", "rock_type": "Peninsular Gneiss",
        "land_use": "Urban Floodplain", "land_cover": "Built-up & Riverbed",
        "ndvi_base": 0.28, "impervious_base": 72.0, "population": 48200,
        "building_density": "Very High", "hist_flood_freq": 16, "base_danger_water_level": 9.2
    },
    {
        "district": "Nagarkurnool",
        "mandal": "Amrabad",
        "village_area": "Mannanur / Nallamala Plateau Ravine",
        "lat": 16.3218, "lon": 78.8251,
        "elevation_base": 585.0, "slope_base": 26.5, "aspect": 200, "ruggedness": 46.0,
        "river_id": "RIV-DINDI-09", "river_name": "Dindi Stream Headwaters",
        "distance_to_river_base": 130, "flow_accum_base": 21000, "drainage_density": 5.1,
        "soil_type": "Red Rocky Clay Loam", "rock_type": "Cuddapah Sedimentary Sandstone",
        "land_use": "Forest Ghat & Tiger Reserve Rim", "land_cover": "Dry Deciduous Forest",
        "ndvi_base": 0.69, "impervious_base": 7.0, "population": 3840,
        "building_density": "Low", "hist_flood_freq": 7, "base_danger_water_level": 4.8
    },
    {
        "district": "Hyderabad",
        "mandal": "Bahadurpura",
        "village_area": "Musi River Basin / Puranapool Bridge",
        "lat": 17.3621, "lon": 78.4611,
        "elevation_base": 492.0, "slope_base": 9.0, "aspect": 90, "ruggedness": 11.2,
        "river_id": "RIV-MUSI-10", "river_name": "Musi River Urban Canal",
        "distance_to_river_base": 35, "flow_accum_base": 92000, "drainage_density": 2.9,
        "soil_type": "Urban Made Ground & Clay", "rock_type": "Deccan Sheet Granite",
        "land_use": "Dense Urban Catchment", "land_cover": "Concrete & Impermeable",
        "ndvi_base": 0.15, "impervious_base": 88.0, "population": 65000,
        "building_density": "Extremely High", "hist_flood_freq": 18, "base_danger_water_level": 5.8
    }
]

def save_locations_meta():
    """Saves metadata description of the Telangana stations."""
    with open("data/telangana_monitoring_stations.json", "w") as f:
        json.dump(LOCATIONS, f, indent=2)
    print("[OK] Saved data/telangana_monitoring_stations.json")

def generate_multi_source_dataset(num_records=16000, random_seed=42):
    """
    Simulates multi-source hydrological, meteorological, IoT, and geological telemetry
    covering monsoonal cloudbursts, severe depressions, regular rains, and dry baseline conditions.
    """
    np.random.seed(random_seed)
    records = []

    # Simulation timeline: Covers South-West Monsoon & Post-Monsoon depression cycles (June to November)
    start_date = datetime(2024, 6, 1, 0, 0)
    
    # Pre-calculate probabilities for weather regimes:
    # 0: Dry/Calm (45%)
    # 1: Light to Moderate Monsoon Rains (30%)
    # 2: Heavy Continuous Monsoon Rain (16%)
    # 3: Extreme Cloudburst / Cyclonic Depression Event (9%)
    weather_regimes = [0, 1, 2, 3]
    regime_probs = [0.45, 0.30, 0.16, 0.09]

    print(f"Generating {num_records} multi-source flood prediction records across Telangana...")

    for i in range(num_records):
        # Pick location
        loc = LOCATIONS[np.random.randint(0, len(LOCATIONS))]
        
        # Pick timestamp (simulating periodic 15-min / 1-hr IoT telemetry across monsoon window)
        step_hours = np.random.randint(0, 24 * 160)
        timestamp = start_date + timedelta(hours=step_hours, minutes=int(np.random.choice([0, 15, 30, 45])))
        date_str = timestamp.strftime("%Y-%m-%d")
        time_str = timestamp.strftime("%H:%M:%S")

        regime = np.random.choice(weather_regimes, p=regime_probs)

        # 1. Rainfall Attributes
        if regime == 0:  # Dry
            rain_1h = round(float(np.random.exponential(0.2)), 2)
            rain_3h = round(rain_1h + float(np.random.exponential(0.3)), 2)
            rain_6h = round(rain_3h + float(np.random.exponential(0.5)), 2)
            rain_24h = round(rain_6h + float(np.random.exponential(1.5)), 2)
            intensity = round(rain_1h * np.random.uniform(0.8, 1.2), 2)
            forecast_rain_6h = round(float(np.random.uniform(0.0, 5.0)), 2)
            temp = round(float(np.random.normal(32.5, 3.0)), 1)
            humidity = round(float(np.random.uniform(45.0, 70.0)), 1)
            pressure = round(float(np.random.normal(1011.0, 2.5)), 1)
            wind_speed = round(float(np.random.uniform(5.0, 18.0)), 1)
        elif regime == 1:  # Light to Moderate
            rain_1h = round(float(np.random.uniform(3.0, 18.0)), 2)
            rain_3h = round(rain_1h + float(np.random.uniform(5.0, 25.0)), 2)
            rain_6h = round(rain_3h + float(np.random.uniform(8.0, 35.0)), 2)
            rain_24h = round(rain_6h + float(np.random.uniform(12.0, 50.0)), 2)
            intensity = round(rain_1h * np.random.uniform(1.0, 1.5), 2)
            forecast_rain_6h = round(float(np.random.uniform(10.0, 40.0)), 2)
            temp = round(float(np.random.normal(27.5, 2.0)), 1)
            humidity = round(float(np.random.uniform(70.0, 88.0)), 1)
            pressure = round(float(np.random.normal(1005.0, 3.0)), 1)
            wind_speed = round(float(np.random.uniform(12.0, 30.0)), 1)
        elif regime == 2:  # Heavy Continuous Monsoon
            rain_1h = round(float(np.random.uniform(22.0, 58.0)), 2)
            rain_3h = round(rain_1h + float(np.random.uniform(35.0, 85.0)), 2)
            rain_6h = round(rain_3h + float(np.random.uniform(45.0, 120.0)), 2)
            rain_24h = round(rain_6h + float(np.random.uniform(60.0, 180.0)), 2)
            intensity = round(rain_1h * np.random.uniform(1.2, 1.8), 2)
            forecast_rain_6h = round(float(np.random.uniform(40.0, 95.0)), 2)
            temp = round(float(np.random.normal(24.5, 1.5)), 1)
            humidity = round(float(np.random.uniform(88.0, 98.0)), 1)
            pressure = round(float(np.random.normal(998.0, 3.5)), 1)
            wind_speed = round(float(np.random.uniform(25.0, 55.0)), 1)
        else:  # Extreme Cloudburst / Cyclonic Depression
            rain_1h = round(float(np.random.uniform(65.0, 140.0)), 2)
            rain_3h = round(rain_1h + float(np.random.uniform(80.0, 190.0)), 2)
            rain_6h = round(rain_3h + float(np.random.uniform(110.0, 260.0)), 2)
            rain_24h = round(rain_6h + float(np.random.uniform(140.0, 380.0)), 2)
            intensity = round(rain_1h * np.random.uniform(1.5, 2.2), 2)
            forecast_rain_6h = round(float(np.random.uniform(80.0, 180.0)), 2)
            temp = round(float(np.random.normal(22.0, 1.8)), 1)
            humidity = round(float(np.random.uniform(94.0, 100.0)), 1)
            pressure = round(float(np.random.normal(989.0, 4.0)), 1)
            wind_speed = round(float(np.random.uniform(45.0, 85.0)), 1)

        # 2. Soil & Ground Telemetry
        # Saturation increases asymptotically with 24h & 6h antecedent rainfall
        soil_saturation = min(100.0, max(12.0, (rain_24h * 0.28 + rain_6h * 0.35 + np.random.normal(22.0, 5.0))))
        soil_moisture = min(100.0, max(8.0, soil_saturation * np.random.uniform(0.85, 0.98)))
        # Infiltration rate drops sharply as soil saturates
        base_infil = 25.0 if "Sandy" in loc["soil_type"] else (14.0 if "Loam" in loc["soil_type"] else 6.5)
        infil_rate = max(0.5, round(base_infil * (1.0 - (soil_saturation / 100.0) ** 1.8) + np.random.uniform(0.1, 0.5), 2))
        soil_saturation = round(soil_saturation, 1)
        soil_moisture = round(soil_moisture, 1)

        # 3. Terrain & Geospatial Attributes
        elevation = round(loc["elevation_base"] + np.random.uniform(-4.0, 4.0), 1)
        slope = round(max(1.0, loc["slope_base"] + np.random.normal(0.0, 1.8)), 1)
        aspect = int((loc["aspect"] + np.random.randint(-15, 15)) % 360)
        ruggedness = round(max(2.0, loc["ruggedness"] + np.random.normal(0.0, 2.0)), 1)
        
        # 4. Land Cover & Exposure
        ndvi = round(min(0.95, max(0.05, loc["ndvi_base"] + np.random.normal(0.0, 0.04))), 3)
        impervious = round(min(100.0, max(2.0, loc["impervious_base"] + np.random.normal(0.0, 2.5))), 1)

        # 5. Hydrology & River Telemetry
        dist_to_river = max(10.0, round(loc["distance_to_river_base"] + np.random.normal(0.0, 15.0), 1))
        flow_accum = int(loc["flow_accum_base"] * np.random.uniform(0.9, 1.15))
        drainage_density = round(loc["drainage_density"] + np.random.uniform(-0.3, 0.3), 2)

        # Rational Runoff Coefficient (C): depends on impervious surface, slope, and soil saturation
        runoff_c = (impervious / 100.0) * 0.65 + (soil_saturation / 100.0) * 0.25 + min(0.2, (slope / 45.0) * 0.15)
        runoff_c = min(0.95, max(0.15, runoff_c))

        # Peak discharge proxy (Q = C * I * A)
        flow_rate = round(float(runoff_c * (intensity / 10.0) * (flow_accum / 5000.0) + np.random.uniform(1.5, 4.0)), 2)

        # Water Level: base level + surge induced by rain, flow rate, and proximity to river channel
        surge = (rain_3h * 0.038) + (rain_6h * 0.024) + (flow_rate * 0.015)
        surge *= (1.0 / math.sqrt(max(20.0, dist_to_river) / 50.0))
        water_level = round(float(loc["base_danger_water_level"] * 0.32 + surge + np.random.normal(0.0, 0.15)), 2)

        # 6. Geology & Landslide Susceptibility Index
        # High slope + high saturation + high 24h rain triggers landslide susceptibility in hilly zones
        landslide_score = (slope / 40.0) * 0.45 + (soil_saturation / 100.0) * 0.35 + (rain_24h / 200.0) * 0.20 - (ndvi * 0.15)
        if landslide_score < 0.30:
            landslide_susc = "Low"
        elif landslide_score < 0.55:
            landslide_susc = "Medium"
        elif landslide_score < 0.78:
            landslide_susc = "High"
        else:
            landslide_susc = "Very High"

        # 7. Physical Flood Risk Calculation & Ground Truth Target Formulation
        # Physically-sound Flash Flood Index (FFI) between 0 and 100
        # Components:
        # - Water Level vs Danger Level ratio (35%)
        # - Rain Intensity & 3h/1h downpour (30%)
        # - Soil Saturation & Runoff Coefficient (20%)
        # - Terrain Vulnerability: low elevation, low distance to river, high flow accumulation (15%)
        danger_ratio = water_level / loc["base_danger_water_level"]
        rain_hazard = min(1.0, (rain_1h / 60.0) * 0.6 + (rain_3h / 120.0) * 0.4)
        soil_hazard = (soil_saturation / 100.0) * 0.6 + runoff_c * 0.4
        proximity_hazard = max(0.0, 1.0 - (dist_to_river / 300.0))

        ffi = (
            (danger_ratio * 38.0) +
            (rain_hazard * 30.0) +
            (soil_hazard * 18.0) +
            (proximity_hazard * 14.0) +
            np.random.normal(0.0, 3.0)
        )
        ffi = min(100.0, max(2.0, round(ffi, 2)))

        # Target 1: Flood Risk Level (Multi-class)
        if ffi < 28.0:
            risk_level = "Low"
            flood_occurred = 0
            lead_time_hrs = round(float(np.random.uniform(12.0, 24.0)), 1)
            flood_depth_m = 0.0
        elif ffi < 55.0:
            risk_level = "Moderate"
            flood_occurred = 0 if np.random.random() > 0.12 else 1
            lead_time_hrs = round(float(np.random.uniform(4.5, 9.0)), 1)
            flood_depth_m = round(float(np.random.uniform(0.1, 0.45)), 2) if flood_occurred else 0.0
        elif ffi < 78.0:
            risk_level = "High"
            flood_occurred = 1 if np.random.random() > 0.10 else 0
            lead_time_hrs = round(float(np.random.uniform(1.5, 4.0)), 1)
            flood_depth_m = round(float(np.random.uniform(0.5, 1.6)), 2)
        else:
            risk_level = "Critical"
            flood_occurred = 1
            lead_time_hrs = round(float(np.random.uniform(0.3, 1.4)), 1)  # Urgent 20-80 mins window!
            flood_depth_m = round(float(np.random.uniform(1.8, 4.2)), 2)

        # 8. Exposure & Demographics
        road_distance = max(10, int(loc["distance_to_river_base"] * 1.5 + np.random.normal(80, 20)))
        critical_infra = np.random.choice([
            "Primary Health Centre, Mandal School",
            "Electricity Substation, Temple Complex",
            "State Highway Culvert, Bus Stand",
            "Bridge Approach, Pumping Station",
            "Relief Camp Shelter, Village Panchayat Hall"
        ])
        sensor_status = "Active" if np.random.random() > 0.015 else "Degraded"

        rec = {
            # Temporal & Geospatial
            "Timestamp": timestamp.isoformat(),
            "Date": date_str,
            "Time": time_str,
            "District": loc["district"],
            "Mandal": loc["mandal"],
            "Village_Area": loc["village_area"],
            "Latitude": round(loc["lat"] + np.random.uniform(-0.005, 0.005), 5),
            "Longitude": round(loc["lon"] + np.random.uniform(-0.005, 0.005), 5),

            # Rainfall Data
            "Rainfall_mm": round(rain_1h, 2),
            "Rainfall_Intensity": round(intensity, 2),
            "Rainfall_1h": round(rain_1h, 2),
            "Rainfall_3h": round(rain_3h, 2),
            "Rainfall_6h": round(rain_6h, 2),
            "Rainfall_24h": round(rain_24h, 2),
            "Forecast_Rainfall_6h": round(forecast_rain_6h, 2),

            # Soil Data
            "Soil_Moisture": soil_moisture,
            "Soil_Saturation": soil_saturation,
            "Soil_Type": loc["soil_type"],
            "Infiltration_Rate": infil_rate,

            # Terrain & Topography
            "Elevation": elevation,
            "Slope": slope,
            "Aspect": aspect,
            "Terrain_Ruggedness": ruggedness,

            # Hydrology
            "River_Stream_ID": loc["river_id"],
            "River_Name": loc["river_name"],
            "Water_Level": water_level,
            "Flow_Rate": flow_rate,
            "Flow_Accumulation": flow_accum,
            "Distance_to_River": dist_to_river,
            "Drainage_Density": drainage_density,

            # Land & Geology
            "Land_Use": loc["land_use"],
            "Land_Cover": loc["land_cover"],
            "NDVI": ndvi,
            "Impervious_Surface": impervious,
            "Rock_Type": loc["rock_type"],
            "Landslide_Susceptibility": landslide_susc,

            # Weather
            "Temperature": temp,
            "Humidity": humidity,
            "Wind_Speed": wind_speed,
            "Atmospheric_Pressure": pressure,

            # Historical & IoT
            "Historical_Flood_Frequency": loc["hist_flood_freq"],
            "Sensor_ID": f"TEL-IOT-{loc['district'][:3].upper()}-{loc['river_id'][-2:]}",
            "Sensor_Status": sensor_status,

            # Exposure
            "Population": loc["population"],
            "Building_Density": loc["building_density"],
            "Road_Distance": road_distance,
            "Critical_Infrastructure": critical_infra,

            # Supervised Prediction Targets
            "Flood_Index_Score": ffi,
            "Flood_Occurred": int(flood_occurred),
            "Flood_Risk_Level": risk_level,
            "Expected_Flood_Depth_m": flood_depth_m,
            "Lead_Time_Hours": lead_time_hrs
        }
        records.append(rec)

    df_full = pd.DataFrame(records)
    
    # Save Full Multi-Source Dataset
    full_path = "data/telangana_flash_flood_dataset.csv"
    df_full.to_csv(full_path, index=False)
    print(f"[OK] Saved Full Dataset ({len(df_full)} rows, {len(df_full.columns)} columns) -> {full_path}")

    # Extract user-requested Core ML Dataset
    core_columns = [
        "Timestamp",
        "Latitude",
        "Longitude",
        "Rainfall_1h",
        "Rainfall_3h",
        "Rainfall_6h",
        "Rainfall_24h",
        "Rainfall_Intensity",
        "Soil_Moisture",
        "Soil_Saturation",
        "Elevation",
        "Slope",
        "Flow_Accumulation",
        "Distance_to_River",
        "Drainage_Density",
        "Land_Cover",
        "NDVI",
        "Water_Level",
        "Historical_Flood_Frequency",
        "Forecast_Rainfall_6h",
        "Flood_Occurred",
        "Flood_Risk_Level"
    ]
    df_core = df_full[core_columns].copy()
    core_path = "data/telangana_flash_flood_core_ml.csv"
    df_core.to_csv(core_path, index=False)
    print(f"[OK] Saved Core ML Dataset ({len(df_core)} rows, {len(core_columns)} columns) -> {core_path}")

    return df_full, df_core

if __name__ == "__main__":
    save_locations_meta()
    df_full, df_core = generate_multi_source_dataset(num_records=16000)
    print("\nTarget Class Distribution (Flood_Risk_Level):")
    print(df_full["Flood_Risk_Level"].value_counts(normalize=True).round(3))
    print("\nBinary Target Distribution (Flood_Occurred):")
    print(df_full["Flood_Occurred"].value_counts(normalize=True).round(3))
