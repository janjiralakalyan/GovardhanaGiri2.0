"""
GovardhanaGiri 2.0: Real-Time Inference & Warning Engine
=======================================================
Loads the trained XGBoost models to provide instant hazard classification,
flood occurrence probabilities, and evacuation lead times for Telangana stations.
"""

import os
import json
import joblib
import numpy as np
import pandas as pd

MODEL_DIR = "models"

class FlashFloodPredictor:
    def __init__(self):
        with open(os.path.join(MODEL_DIR, "model_metadata.json"), "r") as f:
            self.metadata = json.load(f)
        
        self.risk_model = joblib.load(os.path.join(MODEL_DIR, "flash_flood_risk_xgb.joblib"))
        self.occ_model = joblib.load(os.path.join(MODEL_DIR, "flash_flood_binary_xgb.joblib"))
        self.lead_model = joblib.load(os.path.join(MODEL_DIR, "lead_time_regressor_xgb.joblib"))
        self.risk_encoder = joblib.load(os.path.join(MODEL_DIR, "risk_label_encoder.joblib"))
        self.feature_columns = self.metadata["feature_columns"]
        self.risk_classes = self.metadata["risk_classes"]

    def _engineer_and_align(self, sample_df):
        df = sample_df.copy()
        
        # Add engineered features
        df["Rainfall_Acceleration"] = df["Rainfall_1h"] / (df["Rainfall_3h"] + 0.1)
        df["Soil_Runoff_Potential"] = (df["Soil_Saturation"] / 100.0) * np.sin(np.radians(df["Slope"]))
        df["River_Stage_Proximity"] = df["Water_Level"] / (np.log1p(df["Distance_to_River"]))
        df["Catchment_Surge_Index"] = np.log1p(df["Flow_Accumulation"]) * df["Rainfall_Intensity"]

        # One-hot encode
        df_encoded = pd.get_dummies(df, columns=["Land_Cover", "Soil_Type"], drop_first=True)

        # Align with training features (fill missing encoded columns with 0)
        for col in self.feature_columns:
            if col not in df_encoded.columns:
                df_encoded[col] = 0.0

        return df_encoded[self.feature_columns]

    def predict(self, input_dict):
        """
        Takes raw telemetry dictionary and outputs early warning intelligence.
        """
        df_input = pd.DataFrame([input_dict])
        X = self._engineer_and_align(df_input)

        # 1. Multi-class Risk Level
        risk_class_idx = self.risk_model.predict(X)[0]
        risk_level = self.risk_encoder.inverse_transform([risk_class_idx])[0]
        risk_probs = self.risk_model.predict_proba(X)[0]
        prob_dict = {
            self.risk_encoder.inverse_transform([i])[0]: round(float(p) * 100, 1)
            for i, p in enumerate(risk_probs)
        }

        # 2. Binary Flood Occurrence
        flood_occurred = int(self.occ_model.predict(X)[0])
        flood_prob = round(float(self.occ_model.predict_proba(X)[0, 1]) * 100, 1)

        # 3. Evacuation Lead Time
        lead_time_hrs = max(0.2, round(float(self.lead_model.predict(X)[0]), 1))
        lead_time_mins = int(lead_time_hrs * 60)

        # Recommended Action & Tier
        action_map = {
            "Low": "Normal monitoring. Stream levels within safe threshold.",
            "Moderate": "Advisory Issued: Water levels rising. Low-lying and riverbank wards on watch.",
            "High": "Evacuation Warning: High probability of flash flooding. Initiate localized evacuation.",
            "Critical": "IMMEDIATE EVACUATION: Flash flood wave imminent. Sound public sirens & move to designated high ground."
        }

        return {
            "risk_level": risk_level,
            "flood_occurred_predicted": bool(flood_occurred),
            "flood_probability_pct": flood_prob,
            "class_probabilities_pct": prob_dict,
            "lead_time_hours": lead_time_hrs,
            "lead_time_minutes": lead_time_mins,
            "action_protocol": action_map.get(risk_level, "Monitor closely.")
        }

if __name__ == "__main__":
    predictor = FlashFloodPredictor()
    
    print("=" * 70)
    print("GovardhanaGiri 2.0: Inference Test Across Telangana Disaster Scenarios")
    print("=" * 70)

    # Scenario A: Medaram Jampanna Vagu - Extreme Cloudburst & Saturated Hill
    scen_a = {
        "District": "Mulugu",
        "Mandal": "SS Tadwai",
        "Village_Area": "Medaram (Jampanna Vagu)",
        "Rainfall_1h": 85.0,
        "Rainfall_3h": 140.0,
        "Rainfall_6h": 190.0,
        "Rainfall_24h": 260.0,
        "Rainfall_Intensity": 115.0,
        "Forecast_Rainfall_6h": 90.0,
        "Soil_Moisture": 92.0,
        "Soil_Saturation": 96.5,
        "Infiltration_Rate": 0.8,
        "Elevation": 142.0,
        "Slope": 19.5,
        "Terrain_Ruggedness": 28.5,
        "Flow_Accumulation": 24000,
        "Distance_to_River": 35.0,
        "Drainage_Density": 5.2,
        "Land_Cover": "Thick Canopy Forest",
        "Soil_Type": "Forest Clay Loam",
        "NDVI": 0.76,
        "Water_Level": 6.8,  # Danger mark is 5.2
        "Historical_Flood_Frequency": 12
    }

    res_a = predictor.predict(scen_a)
    print("\n[Scenario A: Medaram Jampanna Vagu - Cloudburst Surge]")
    print(f"  Risk Level         : {res_a['risk_level']} (Prob: {res_a['flood_probability_pct']}%)")
    print(f"  Lead Time Remaining: {res_a['lead_time_hours']} hrs (~{res_a['lead_time_minutes']} mins)")
    print(f"  Action Protocol    : {res_a['action_protocol']}")

    # Scenario B: Kerameri Ghats, Asifabad - Moderate Monsoon Rain
    scen_b = {
        "District": "Kumuram Bheem Asifabad",
        "Mandal": "Kerameri",
        "Village_Area": "Kerameri Ghat Range",
        "Rainfall_1h": 8.0,
        "Rainfall_3h": 16.0,
        "Rainfall_6h": 24.0,
        "Rainfall_24h": 35.0,
        "Rainfall_Intensity": 9.5,
        "Forecast_Rainfall_6h": 15.0,
        "Soil_Moisture": 38.0,
        "Soil_Saturation": 42.0,
        "Infiltration_Rate": 8.5,
        "Elevation": 610.0,
        "Slope": 32.5,
        "Terrain_Ruggedness": 58.0,
        "Flow_Accumulation": 18500,
        "Distance_to_River": 75.0,
        "Drainage_Density": 6.4,
        "Land_Cover": "Scrub & Dry Forest",
        "Soil_Type": "Gravelly Black Cotton & Lithic",
        "NDVI": 0.51,
        "Water_Level": 1.9,  # Danger mark is 4.5
        "Historical_Flood_Frequency": 8
    }

    res_b = predictor.predict(scen_b)
    print("\n[Scenario B: Kerameri Ghat Range - Routine Monsoon]")
    print(f"  Risk Level         : {res_b['risk_level']} (Prob: {res_b['flood_probability_pct']}%)")
    print(f"  Lead Time Remaining: {res_b['lead_time_hours']} hrs (~{res_b['lead_time_minutes']} mins)")
    print(f"  Action Protocol    : {res_b['action_protocol']}")
    print("=" * 70)
