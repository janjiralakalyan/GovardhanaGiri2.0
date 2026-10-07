# GovardhanaGiri 2.0
### Hyper-Local Flash Flood & Landslide Prediction System for Hilly Regions (Telangana Hotspots)

GovardhanaGiri 2.0 is an end-to-end AI-powered Early Warning and Decision Support System (DSS) engineered to bridge the macro-forecast gap in flash flood prone and hilly catchments. By combining multi-source telemetry (rainfall nowcasting, soil moisture probes, rational runoff physics, slope stability, and river gauge stages), it delivers hyper-local warnings with actionable evacuation lead times.

---

## 🌟 Key Capabilities

1. **Multi-Source Data Fusion Engine:**
   - Ingests rainfall intensity, antecedent precipitation (1h, 3h, 6h, 24h), volumetric soil moisture, soil saturation percentage, terrain slope, flow accumulation, proximity to river, and impervious land cover.
   - 10 targeted hotspots across Telangana (e.g. Medaram Jampanna Vagu, Bhadrachalam Godavari Ghats, Kerameri Ghats in Asifabad, Munneru Basin in Khammam, Kuntala Falls gorge in Adilabad, Musi River corridor in Hyderabad).

2. **Machine Learning Hazard Suite (XGBoost & Scikit-Learn):**
   - **Hazard Tier Classifier (4-Class):** Evaluates risk as `Low`, `Moderate`, `High`, or `Critical` with **85.88% Accuracy** and **0.9741 ROC-AUC**.
   - **Flood Occurrence Predictor (Binary):** Flags inundation/overtopping with **92.09% Accuracy** and **0.9432 ROC-AUC**.
   - **Evacuation Lead Time Regressor:** Forecasts actionable evacuation window remaining with a Mean Absolute Error of **2.40 hours** (~144 minutes).

3. **High-Tech Emergency Operations Dashboard:**
   - **Interactive Geospatial Map (Leaflet.js + CartoDB Dark Matter):** Color-coded radar pulse markers, danger buffer rings, and high-ground shelters.
   - **River Stage Hydrograph Meter:** Visual indicator comparing live water level to bankfull danger mark.
   - **"What-If" Cloudburst Simulator:** Sliders to stress-test real-time hydro-meteorological shocks (e.g., sudden 120 mm/hr cloudburst or 98% saturated soil) and observe instant AI re-evaluations in <20ms.
   - **Multi-Channel Emergency Alert Dispatcher:** Simulates automated SMS broadcasts to ward populations, public warning sirens (via native Web Audio API), and SDRF/NDRF team mobilization.

---

## 📂 Project Architecture

```
GovardhanaGiri 2.0/
├── backend/
│   ├── main.py                     # FastAPI REST API & static server
│   ├── predictor.py                # AI model bridge with hydrological feature engineering
│   └── mock_telemetry.py           # State manager & cloudburst scenario injector
├── frontend/
│   ├── index.html                  # Emergency Command Center UI
│   ├── css/
│   │   └── dashboard.css           # Dark-mode glassmorphic design system
│   └── js/
│       ├── app.js                  # App controller, API bindings & state synchronization
│       ├── map.js                  # Leaflet geospatial mapping & SVG radar markers
│       └── audio_alerts.js         # Web Audio API emergency siren & chime synthesizer
├── models/
│   ├── flash_flood_risk_xgb.joblib # Trained XGBoost 4-class risk classifier
│   ├── flash_flood_binary_xgb.joblib # Trained XGBoost binary occurrence predictor
│   ├── lead_time_regressor_xgb.joblib # Trained XGBoost evacuation lead-time regressor
│   ├── risk_label_encoder.joblib   # Label encoder for target tiers
│   ├── model_metadata.json         # Training metrics, features, hyperparameters
│   └── MODEL_EVALUATION_REPORT.md  # Detailed ML performance metrics & analysis
├── data/
│   ├── telangana_flash_flood_core_ml.csv # 16,000 rows x 22 core features
│   ├── telangana_flash_flood_dataset.csv # 16,000 rows x 52 full features
│   ├── telangana_monitoring_stations.json # 10 station centroids & geomorphic profiles
│   └── DATASET_DOCUMENTATION.md    # Detailed data dictionary & physical units
└── scripts/
    ├── generate_telangana_dataset.py # Synthetic data generation pipeline
    ├── train_flood_models.py        # ML training and evaluation pipeline
    └── predict_flood_risk.py        # Standalone CLI inference tester
```

---

## 🚀 Quick Start Guide

### 1. Prerequisites
Ensure Python (3.10+) is installed. The required packages are:
```powershell
pip install fastapi uvicorn xgboost scikit-learn pandas numpy joblib
```

### 2. Start the Early Warning Server
From the root directory (`d:\GovardhanaGiri 2.0`):
```powershell
python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000
```

### 3. Open the Command Center Dashboard
Open your browser and navigate to:
```
http://127.0.0.1:8000
```
Interactive API docs are also available at `http://127.0.0.1:8000/docs`.

---

## 🔬 How to Test the System

1. **Inspect Stations:** Click any station on the bottom carousel or on the map (e.g. *Medaram Jampanna Vagu*, *Bhadrachalam Ghat*, or *Kerameri Ghat Range*).
2. **Trigger a Cloudburst Shock:**
   - In the inspector panel on the right, switch to the **"What-If Cloudburst Lab"** tab.
   - Click **"⚡ Simulate Extreme Cloudburst"**.
   - Notice the water level gauge surging, the Risk Tier instantly escalating to **Critical (Red Alert)**, the Evacuation Lead Time dropping to under 60 minutes, and the emergency audio chime triggering!
3. **Dispatch Public Alerts:**
   - Switch to the **"Safe Shelters & Evacuation"** tab.
   - Click **"🚨 Dispatch Emergency Evacuation Alert"** to test simulated SMS broadcasting to ward residents and trigger the wailing siren.
4. **Reset:** Click **"☀️ Reset to Calm Monsoon Conditions"** to restore peaceful baseline conditions.
