"""
GovardhanaGiri 2.0: AI Model Predictor Bridge
Loads trained XGBoost models, applies hydrological feature engineering,
and returns risk levels, occurrence probabilities, and evacuation lead times.
"""

import os
import json
import joblib
import numpy as np
import pandas as pd

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MODEL_DIR = os.path.join(BASE_DIR, "models")

class FlashFloodAIBridge:
    def __init__(self):
        meta_path = os.path.join(MODEL_DIR, "model_metadata.json")
        with open(meta_path, "r") as f:
            self.metadata = json.load(f)

        self.risk_model = joblib.load(os.path.join(MODEL_DIR, "flash_flood_risk_xgb.joblib"))
        self.occ_model = joblib.load(os.path.join(MODEL_DIR, "flash_flood_binary_xgb.joblib"))
        self.lead_model = joblib.load(os.path.join(MODEL_DIR, "lead_time_regressor_xgb.joblib"))
        self.risk_encoder = joblib.load(os.path.join(MODEL_DIR, "risk_label_encoder.joblib"))

        self.feature_columns = self.metadata["feature_columns"]
        self.risk_classes = self.metadata["risk_classes"]
        print("[AI Bridge] Successfully loaded XGBoost Risk, Occurrence, and Lead-Time models.")

    def _engineer_features(self, df):
        df_feat = df.copy()
        
        # Hydrological Domain Features
        rain_1h = df_feat["Rainfall_1h"].fillna(0.0)
        rain_3h = df_feat["Rainfall_3h"].fillna(0.0)
        df_feat["Rainfall_Acceleration"] = rain_1h / (rain_3h + 0.1)

        soil_sat = df_feat["Soil_Saturation"].fillna(20.0)
        slope = df_feat["Slope"].fillna(10.0)
        df_feat["Soil_Runoff_Potential"] = (soil_sat / 100.0) * np.sin(np.radians(slope))

        water_lvl = df_feat["Water_Level"].fillna(1.0)
        dist_riv = df_feat["Distance_to_River"].fillna(100.0)
        df_feat["River_Stage_Proximity"] = water_lvl / (np.log1p(dist_riv))

        flow_acc = df_feat["Flow_Accumulation"].fillna(10000)
        rain_int = df_feat["Rainfall_Intensity"].fillna(5.0)
        df_feat["Catchment_Surge_Index"] = np.log1p(flow_acc) * rain_int

        # Categorical dummies
        df_encoded = pd.get_dummies(df_feat, columns=["Land_Cover", "Soil_Type"], drop_first=True)

        # Align with model input vector
        for col in self.feature_columns:
            if col not in df_encoded.columns:
                df_encoded[col] = 0.0

        return df_encoded[self.feature_columns]

    def predict_station_telemetry(self, telemetry: dict) -> dict:
        """Runs multi-task prediction on station telemetry."""
        df_input = pd.DataFrame([telemetry])
        X = self._engineer_features(df_input)

        # 1. Multi-Class Risk Tier
        risk_idx = int(self.risk_model.predict(X)[0])
        risk_level = str(self.risk_encoder.inverse_transform([risk_idx])[0])
        risk_probs = self.risk_model.predict_proba(X)[0]
        prob_breakdown = {
            self.risk_encoder.inverse_transform([i])[0]: round(float(p) * 100, 1)
            for i, p in enumerate(risk_probs)
        }

        # 2. Binary Flood Occurrence
        flood_occ = bool(self.occ_model.predict(X)[0])
        flood_prob = round(float(self.occ_model.predict_proba(X)[0, 1]) * 100, 1)

        # 3. Actionable Evacuation Lead Time
        raw_lead = float(self.lead_model.predict(X)[0])
        # Physical bounds: if critical, lead time cannot exceed 2.5 hours
        if risk_level == "Critical":
            lead_time_hrs = max(0.3, min(2.5, round(raw_lead, 1)))
        elif risk_level == "High":
            lead_time_hrs = max(1.2, min(5.0, round(raw_lead, 1)))
        elif risk_level == "Moderate":
            lead_time_hrs = max(3.5, min(9.0, round(raw_lead, 1)))
        else:
            lead_time_hrs = max(8.0, min(24.0, round(raw_lead, 1)))

        lead_time_mins = int(lead_time_hrs * 60)

        # SOP Protocol
        sop = {
            "Low": {
                "badge_color": "emerald",
                "summary": "Normal Baseflow",
                "action": "Routine hydrometric monitoring. Catchment capacity stable.",
                "siren_required": False
            },
            "Moderate": {
                "badge_color": "amber",
                "summary": "Hydrological Advisory",
                "action": "Issue Yellow Watch. Alert low-lying riparian communities to monitor rising stream stages.",
                "siren_required": False
            },
            "High": {
                "badge_color": "orange",
                "summary": "Evacuation Warning",
                "action": "Issue Orange Alert. Deploy local revenue staff, mobilize SDRF boats, initiate evacuation of riverside wards.",
                "siren_required": True
            },
            "Critical": {
                "badge_color": "rose",
                "summary": "IMMEDIATE FLASH FLOOD IMMINENT",
                "action": "RED ALERT: Immediate evacuation order. Sound public siren horns, dispatch emergency SMS blasts, move villagers to elevated relief shelters.",
                "siren_required": True
            }
        }.get(risk_level, {})

        return {
            "risk_level": risk_level,
            "flood_occurred": flood_occ,
            "flood_probability_pct": flood_prob,
            "class_probabilities_pct": prob_breakdown,
            "lead_time_hours": lead_time_hrs,
            "lead_time_minutes": lead_time_mins,
            "sop": sop
        }

# Global singleton
ai_bridge = FlashFloodAIBridge()
