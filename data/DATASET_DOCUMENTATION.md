# Telangana Multi-Source Flash Flood & Disaster Prediction Dataset
**GovardhanaGiri 2.0 Project**

This dataset is synthesized using hydro-meteorological, geotechnical, and geospatial modeling principles specifically tuned to flash flood and landslide vulnerable zones in **Telangana, India**.

---

## 1. Geographical Hotspots Covered

| S.No | District | Mandal / Micro-Catchment | River / Drainage Corridor | Terrain & Vulnerability Profile |
|------|----------|--------------------------|---------------------------|---------------------------------|
| 1 | **Bhadradri Kothagudem** | Bhadrachalam Ghat | Godavari River | Riparian lowlands prone to massive river surges (crossing 43/53 ft marks) |
| 2 | **Bhadradri Kothagudem** | Charla / Subbanapalli | Taliperu River Catchment | Forested catchment with rapid runoff from Chhattisgarh hill borders |
| 3 | **Mulugu** | SS Tadwai (Medaram) | Jampanna Vagu | Steep forest stream; notorious for sudden flash flooding during monsoons |
| 4 | **Mulugu** | Eturnagaram Wildlife Valley | Dayam Vagu (Godavari trib) | Heavy canopy, high runoff accumulation in deep gorges |
| 5 | **Kumuram Bheem Asifabad** | Kerameri Ghat Range | Kerameri Hill Torrents | Highest elevation ghats in North Telangana (~610m, slope > 30°), debris flows |
| 6 | **Adilabad** | Neradigonda (Kuntala Catchment)| Kadem Stream Gorge | Steep basaltic waterfall ravine; violent sudden discharge during cloudbursts |
| 7 | **Nirmal** | Kadam Dam / Maddipadaga | Kadam River | Flash flood catchment that experienced historic spillway overtopping |
| 8 | **Khammam** | Prakash Nagar / Urban Core | Munneru River | Dense urban floodway; high impervious surface; rapid flood wave transit |
| 9 | **Nagarkurnool** | Amrabad Plateau / Mannanur | Dindi Stream Headwaters | Nallamala hilly plateau, deep ravines and rocky gorges |
| 10 | **Hyderabad** | Puranapool / Chaderghat | Musi River Corridor | High impervious surface (>85%), rapid urban flash flooding from catchment lakes |

---

## 2. Dataset Files Generated

1. `data/telangana_flash_flood_core_ml.csv`
   - **Records:** 16,000
   - **Features:** 22 core features (the exact ML schema specified)
   - **Target variables:** `Flood_Occurred` (Binary: 0/1), `Flood_Risk_Level` (Multi-class: Low, Moderate, High, Critical)

2. `data/telangana_flash_flood_dataset.csv`
   - **Records:** 16,000
   - **Features:** 52 comprehensive features across Rainfall, Soil, Terrain, Hydrology, Land Cover, Geology, Weather, IoT, Exposure, and Disaster Targets.

3. `data/telangana_monitoring_stations.json`
   - Detailed geographic centroids, baseline elevations, danger water level thresholds, river IDs, and demographics for all monitoring stations.

---

## 3. Data Dictionary & Attribute Specifications

### A. Rainfall & Meteorology
| Feature | Type | Unit | Description |
|---------|------|------|-------------|
| `Rainfall_1h` | Float | mm | Accumulated rainfall in the preceding 1 hour |
| `Rainfall_3h` | Float | mm | Accumulated rainfall in the preceding 3 hours |
| `Rainfall_6h` | Float | mm | Accumulated rainfall in the preceding 6 hours |
| `Rainfall_24h` | Float | mm | Antecedent rainfall over 24 hours |
| `Rainfall_Intensity` | Float | mm/hr | Instantaneous precipitation rate |
| `Forecast_Rainfall_6h` | Float | mm | Numerical Weather Prediction (NWP) 6-hour nowcast |
| `Temperature` | Float | °C | Ambient air temperature |
| `Humidity` | Float | % | Relative humidity |
| `Atmospheric_Pressure` | Float | hPa | Barometric pressure (drops during cyclonic depressions) |
| `Wind_Speed` | Float | km/h | Sustained wind velocity |

### B. Soil & Geotechnical
| Feature | Type | Unit | Description |
|---------|------|------|-------------|
| `Soil_Moisture` | Float | % | Volumetric water content measured by ground TDR/FDR sensors |
| `Soil_Saturation` | Float | % | Soil pore water saturation level (approaches 100% in continuous rains) |
| `Soil_Type` | String | - | Classification (e.g. Alluvial Loam, Red Sandy Loam, Clayey Black) |
| `Infiltration_Rate` | Float | mm/hr | Dynamic rate of water absorption; decays as saturation approaches 100% |

### C. Terrain & Geospatial
| Feature | Type | Unit | Description |
|---------|------|------|-------------|
| `Elevation` | Float | meters | Height above mean sea level (MSL) |
| `Slope` | Float | degrees | Gradient of local slope (steep slopes accelerate runoff) |
| `Aspect` | Integer | degrees | Cardinal compass direction of slope face (0-360°) |
| `Terrain_Ruggedness` | Float | TRI | Topographic Ruggedness Index |

### D. Hydrology & River Dynamics
| Feature | Type | Unit | Description |
|---------|------|------|-------------|
| `Water_Level` | Float | meters | Real-time stream gauge stage / water level |
| `Flow_Rate` | Float | m³/s | Estimated peak discharge calculated via Rational formula |
| `Flow_Accumulation` | Integer | grid cells | Upstream contributing catchment drainage count |
| `Distance_to_River` | Float | meters | Euclidean proximity to the active stream channel |
| `Drainage_Density` | Float | km/km² | Ratio of total stream length to watershed area |

### E. Land Cover & Geology
| Feature | Type | Unit | Description |
|---------|------|------|-------------|
| `Land_Cover` | String | - | Vegetation / land classification |
| `NDVI` | Float | - | Normalized Difference Vegetation Index (0.05 to 0.95) |
| `Impervious_Surface`| Float | % | Percentage of sealed/built-up surface area |
| `Landslide_Susceptibility`| String | - | Landslide risk category (Low, Medium, High, Very High) |

### F. Prediction Targets
| Feature | Type | Possible Values | Meaning |
|---------|------|-----------------|---------|
| `Flood_Occurred` | Binary (int) | `0` (No), `1` (Yes) | Inundation/overtopping confirmed at station |
| `Flood_Risk_Level`| String | `Low`, `Moderate`, `High`, `Critical` | Tiered emergency response classification |
| `Expected_Flood_Depth_m` | Float | 0.0 to 4.5 meters | Expected flood water depth above ground |
| `Lead_Time_Hours` | Float | 0.3 to 24.0 hours | Actionable time remaining for safe evacuation |

---

## 4. Target Class Balance
- **Binary Target (`Flood_Occurred`):**
  - `0` (No Flood): ~64.3%
  - `1` (Flood Occurred): ~35.7%
- **Multi-Class Target (`Flood_Risk_Level`):**
  - `Low`: ~25.6%
  - `Moderate`: ~42.7%
  - `High`: ~9.2%
  - `Critical`: ~22.5%

This distribution provides realistic class imbalance for training robust ML classifiers (e.g. Random Forest, XGBoost, LightGBM, Multi-Layer Perceptrons) without extreme single-class collapse.
