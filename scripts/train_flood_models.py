"""
GovardhanaGiri 2.0: Flash Flood & Disaster Risk Model Training Pipeline
========================================================================
Trains production-grade machine learning models using XGBoost and Scikit-Learn:
1. Multi-Class Flood Risk Level Classifier (Low, Moderate, High, Critical)
2. Binary Flash Flood Occurrence Predictor (0 / 1)
3. Actionable Evacuation Lead Time Regressor (Hours remaining)

Saves trained model artifacts, label encoders, feature metadata, and evaluation metrics.
"""

import os
import json
import joblib
import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.preprocessing import LabelEncoder, StandardScaler
from sklearn.metrics import (
    classification_report,
    confusion_matrix,
    accuracy_score,
    f1_score,
    roc_auc_score,
    mean_absolute_error,
    r2_score
)
from sklearn.ensemble import RandomForestClassifier
import xgboost as xgb

# Ensure models directory exists
os.makedirs("models", exist_ok=True)

def engineer_features(df):
    """Adds hydrological domain features derived from raw sensor telemetry."""
    df_feat = df.copy()

    # Hydrological Domain Features
    # 1. Rainfall acceleration: ratio of 1h intensity to 3h accumulated trend
    df_feat["Rainfall_Acceleration"] = df_feat["Rainfall_1h"] / (df_feat["Rainfall_3h"] + 0.1)

    # 2. Saturated runoff potential: high saturation on steep slopes creates torrential runoff
    df_feat["Soil_Runoff_Potential"] = (df_feat["Soil_Saturation"] / 100.0) * np.sin(np.radians(df_feat["Slope"]))

    # 3. Riverine proximity pressure: high water stage close to channel
    df_feat["River_Stage_Proximity"] = df_feat["Water_Level"] / (np.log1p(df_feat["Distance_to_River"]))

    # 4. Catchment surge index: flow accumulation multiplied by instantaneous rain intensity
    df_feat["Catchment_Surge_Index"] = np.log1p(df_feat["Flow_Accumulation"]) * df_feat["Rainfall_Intensity"]

    return df_feat

def run_training_pipeline():
    print("=" * 70)
    print("GovardhanaGiri 2.0 - Flash Flood Prediction Model Training Pipeline")
    print("=" * 70)

    # 1. Load Data
    data_path = "data/telangana_flash_flood_dataset.csv"
    print(f"[*] Loading dataset from {data_path}...")
    df = pd.read_csv(data_path)
    print(f"[OK] Loaded {len(df)} records across {df['District'].nunique()} Telangana districts.")

    # Apply Feature Engineering
    df = engineer_features(df)

    # Define feature set
    numeric_features = [
        "Rainfall_1h",
        "Rainfall_3h",
        "Rainfall_6h",
        "Rainfall_24h",
        "Rainfall_Intensity",
        "Forecast_Rainfall_6h",
        "Soil_Moisture",
        "Soil_Saturation",
        "Infiltration_Rate",
        "Elevation",
        "Slope",
        "Terrain_Ruggedness",
        "Flow_Accumulation",
        "Distance_to_River",
        "Drainage_Density",
        "NDVI",
        "Water_Level",
        "Historical_Flood_Frequency",
        "Rainfall_Acceleration",
        "Soil_Runoff_Potential",
        "River_Stage_Proximity",
        "Catchment_Surge_Index"
    ]

    categorical_features = ["Land_Cover", "Soil_Type"]

    # One-hot encode categoricals
    df_encoded = pd.get_dummies(df, columns=categorical_features, drop_first=True)
    
    # Extract feature matrix X
    encoded_cat_cols = [c for c in df_encoded.columns if any(c.startswith(f"{cat}_") for cat in categorical_features)]
    feature_cols = numeric_features + encoded_cat_cols
    X = df_encoded[feature_cols].copy()

    # Targets
    y_risk_str = df["Flood_Risk_Level"].copy()
    y_occurred = df["Flood_Occurred"].copy()
    y_lead_time = df["Lead_Time_Hours"].copy()

    # Encode target labels for Risk Level: Low (0), Moderate (1), High (2), Critical (3)
    risk_label_order = ["Low", "Moderate", "High", "Critical"]
    risk_encoder = LabelEncoder()
    risk_encoder.fit(risk_label_order)
    y_risk = risk_encoder.transform(y_risk_str)

    print(f"[*] Features selected: {len(feature_cols)} features ({len(numeric_features)} numerical, {len(encoded_cat_cols)} encoded categorical)")
    print(f"[*] Target classes: {dict(zip(range(len(risk_label_order)), risk_label_order))}")

    # Train / Test Split (80% Train, 20% Holdout Test)
    indices = np.arange(len(X))
    train_idx, test_idx = train_test_split(indices, test_size=0.20, random_state=42, stratify=y_risk)

    X_train, X_test = X.iloc[train_idx], X.iloc[test_idx]
    y_risk_train, y_risk_test = y_risk[train_idx], y_risk[test_idx]
    y_occ_train, y_occ_test = y_occurred.iloc[train_idx], y_occurred.iloc[test_idx]
    y_lead_train, y_lead_test = y_lead_time.iloc[train_idx], y_lead_time.iloc[test_idx]

    print(f"[OK] Split into {len(X_train)} training records and {len(X_test)} validation records.\n")

    # =========================================================================
    # MODEL 1: Multi-Class Flood Risk Level Classifier (XGBoost)
    # =========================================================================
    print("-----------------------------------------------------------------------")
    print("Training Model 1: Multi-Class Flood Risk Level Classifier (XGBoost)")
    print("-----------------------------------------------------------------------")
    
    risk_xgb = xgb.XGBClassifier(
        n_estimators=180,
        max_depth=6,
        learning_rate=0.08,
        subsample=0.85,
        colsample_bytree=0.85,
        objective="multi:softprob",
        num_class=4,
        random_state=42,
        eval_metric="mlogloss",
        use_label_encoder=False
    )
    risk_xgb.fit(X_train, y_risk_train)

    y_risk_pred = risk_xgb.predict(X_test)
    y_risk_proba = risk_xgb.predict_proba(X_test)

    acc_risk = accuracy_score(y_risk_test, y_risk_pred)
    f1_risk = f1_score(y_risk_test, y_risk_pred, average="weighted")
    auc_risk = roc_auc_score(y_risk_test, y_risk_proba, multi_class="ovr")

    print(f"[METRIC] Risk Level Accuracy : {acc_risk * 100:.2f}%")
    print(f"[METRIC] Risk Level Weighted F1: {f1_risk:.4f}")
    print(f"[METRIC] Risk Level ROC-AUC (OvR): {auc_risk:.4f}")
    print("\nClassification Report (Risk Level):")
    print(classification_report(y_risk_test, y_risk_pred, target_names=risk_label_order))

    # =========================================================================
    # MODEL 2: Binary Flash Flood Occurrence Predictor (XGBoost)
    # =========================================================================
    print("-----------------------------------------------------------------------")
    print("Training Model 2: Binary Flash Flood Occurrence Predictor (XGBoost)")
    print("-----------------------------------------------------------------------")
    
    occ_xgb = xgb.XGBClassifier(
        n_estimators=150,
        max_depth=5,
        learning_rate=0.08,
        subsample=0.85,
        colsample_bytree=0.85,
        scale_pos_weight=(len(y_occ_train) - sum(y_occ_train)) / sum(y_occ_train),
        objective="binary:logistic",
        random_state=42,
        eval_metric="logloss"
    )
    occ_xgb.fit(X_train, y_occ_train)

    y_occ_pred = occ_xgb.predict(X_test)
    y_occ_proba = occ_xgb.predict_proba(X_test)[:, 1]

    acc_occ = accuracy_score(y_occ_test, y_occ_pred)
    f1_occ = f1_score(y_occ_test, y_occ_pred)
    auc_occ = roc_auc_score(y_occ_test, y_occ_proba)

    print(f"[METRIC] Flood Occurrence Accuracy : {acc_occ * 100:.2f}%")
    print(f"[METRIC] Flood Occurrence F1-Score : {f1_occ:.4f}")
    print(f"[METRIC] Flood Occurrence ROC-AUC  : {auc_occ:.4f}")
    print("\nClassification Report (Flood Occurrence):")
    print(classification_report(y_occ_test, y_occ_pred, target_names=["No Flood", "Flood Occurred"]))

    # =========================================================================
    # MODEL 3: Evacuation Lead Time Regressor (XGBoost Regressor)
    # =========================================================================
    print("-----------------------------------------------------------------------")
    print("Training Model 3: Actionable Evacuation Lead Time Regressor (XGBoost)")
    print("-----------------------------------------------------------------------")

    lead_xgb = xgb.XGBRegressor(
        n_estimators=150,
        max_depth=5,
        learning_rate=0.07,
        subsample=0.85,
        colsample_bytree=0.85,
        objective="reg:squarederror",
        random_state=42
    )
    lead_xgb.fit(X_train, y_lead_train)

    y_lead_pred = lead_xgb.predict(X_test)
    mae_lead = mean_absolute_error(y_lead_test, y_lead_pred)
    r2_lead = r2_score(y_lead_test, y_lead_pred)

    print(f"[METRIC] Evacuation Lead Time MAE : {mae_lead:.2f} hours (~{mae_lead * 60:.1f} minutes)")
    print(f"[METRIC] Evacuation Lead Time R²  : {r2_lead:.4f}")

    # =========================================================================
    # Feature Importance Extraction
    # =========================================================================
    importance_scores = risk_xgb.feature_importances_
    feat_imp_df = pd.DataFrame({
        "Feature": feature_cols,
        "Importance": importance_scores
    }).sort_values(by="Importance", ascending=False)

    print("\nTop 10 Most Influential Flash Flood Predictors:")
    for idx, row in feat_imp_df.head(10).iterrows():
        print(f"  • {row['Feature']:<25}: {row['Importance'] * 100:.2f}%")

    # =========================================================================
    # Save Model Artifacts & Pipeline Metadata
    # =========================================================================
    print("\n[*] Saving model artifacts to models/ directory...")

    joblib.dump(risk_xgb, "models/flash_flood_risk_xgb.joblib")
    joblib.dump(occ_xgb, "models/flash_flood_binary_xgb.joblib")
    joblib.dump(lead_xgb, "models/lead_time_regressor_xgb.joblib")
    joblib.dump(risk_encoder, "models/risk_label_encoder.joblib")

    # Metadata for live inference
    metadata = {
        "model_version": "GovardhanaGiri-2.0-v1.0",
        "training_date": "2026-10-07",
        "framework": "XGBoost + Scikit-Learn",
        "feature_columns": feature_cols,
        "numeric_features": numeric_features,
        "categorical_features": categorical_features,
        "risk_classes": risk_label_order,
        "metrics": {
            "risk_classifier": {
                "accuracy": round(float(acc_risk), 4),
                "f1_score": round(float(f1_risk), 4),
                "roc_auc_ovr": round(float(auc_risk), 4)
            },
            "occurrence_classifier": {
                "accuracy": round(float(acc_occ), 4),
                "f1_score": round(float(f1_occ), 4),
                "roc_auc": round(float(auc_occ), 4)
            },
            "lead_time_regressor": {
                "mae_hours": round(float(mae_lead), 3),
                "mae_minutes": round(float(mae_lead * 60), 1),
                "r2_score": round(float(r2_lead), 4)
            }
        },
        "top_features": feat_imp_df.head(10).to_dict(orient="records")
    }

    with open("models/model_metadata.json", "w") as f:
        json.dump(metadata, f, indent=2)

    print("[OK] Models and metadata saved successfully!")
    print("=" * 70)

if __name__ == "__main__":
    run_training_pipeline()
