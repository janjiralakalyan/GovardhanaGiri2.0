# Machine Learning Model Evaluation Report
**GovardhanaGiri 2.0: Multi-Source Flash Flood Prediction System**

---

## 1. Executive Summary

We developed and trained three machine learning models using **XGBoost** and **Scikit-Learn** on the 16,000-record Telangana multi-source dataset. The models predict:
1. **Multi-Class Flash Flood Risk Tier** (`Low`, `Moderate`, `High`, `Critical`)
2. **Binary Flash Flood Inundation Occurrence** (`0` or `1`)
3. **Hyper-Local Evacuation Lead Time** (in hours and minutes)

---

## 2. Key Performance Metrics

### A. Model 1: Multi-Class Flood Risk Level Classifier (`XGBoost`)
- **Accuracy:** **85.88%**
- **Weighted F1-Score:** **0.8593**
- **ROC-AUC (One-vs-Rest):** **0.9741**

| Class | Precision | Recall | F1-Score | Support |
| :--- | :---: | :---: | :---: | :---: |
| **Low** | 0.98 | 0.98 | 0.98 | 721 |
| **Moderate** | 0.83 | 0.83 | 0.83 | 293 |
| **High** | 0.76 | 0.83 | 0.79 | 820 |
| **Critical** | 0.87 | 0.82 | 0.84 | 1,366 |
| **Overall** | **0.86** | **0.86** | **0.86** | **3,200** |

---

### B. Model 2: Binary Flash Flood Occurrence Predictor (`XGBoost`)
- **Accuracy:** **92.09%**
- **F1-Score:** **0.8843**
- **ROC-AUC:** **0.9432**

| Outcome | Precision | Recall | F1-Score | Support |
| :--- | :---: | :---: | :---: | :---: |
| **No Flood (0)** | 0.92 | 0.96 | 0.94 | 2,053 |
| **Flood Occurred (1)** | 0.93 | 0.84 | 0.88 | 1,147 |

---

### C. Model 3: Actionable Evacuation Lead Time Regressor (`XGBoost`)
- **Mean Absolute Error (MAE):** **2.40 hours** (~144 minutes)
- **Coefficient of Determination ($R^2$):** **0.6946**
- Accurately captures rapid lead time drops under heavy 1h rain intensity and river stage spikes.

---

## 3. Top Most Influential Flash Flood Predictors

Based on XGBoost feature importance scoring:

1. **`Soil_Moisture` (15.03%)**: Saturated soils lose infiltration capacity, driving direct overland runoff into streams.
2. **`Historical_Flood_Frequency` (11.46%)**: Geographic geomorphology and basin shape determine recurrence baseline.
3. **`Rainfall_Intensity` (9.13%)**: Cloudburst rates (>60 mm/hr) trigger immediate flash waves regardless of baseflow.
4. **`Catchment_Surge_Index` (8.21%)**: Interaction of flow accumulation area and peak rain rate.
5. **`Rainfall_6h` (5.01%)**: Medium-term saturation buffer before river cresting.
6. **`Land_Cover` (Deciduous Forest vs Concrete) (4.70% / 3.74%)**: High impervious surfaces accelerate urban flash floods, while forest canopies delay peak discharge.
7. **`Distance_to_River` (3.46%)**: Proximity to active drainage channels.

---

## 4. Persisted Model Files

| File | Type | Purpose |
| :--- | :--- | :--- |
| [`models/flash_flood_risk_xgb.joblib`](file:///d:/GovardhanaGiri%202.0/models/flash_flood_risk_xgb.joblib) | Joblib Serialized XGBClassifier | 4-tier risk classification |
| [`models/flash_flood_binary_xgb.joblib`](file:///d:/GovardhanaGiri%202.0/models/flash_flood_binary_xgb.joblib) | Joblib Serialized XGBClassifier | Probability of flood inundation |
| [`models/lead_time_regressor_xgb.joblib`](file:///d:/GovardhanaGiri%202.0/models/lead_time_regressor_xgb.joblib) | Joblib Serialized XGBRegressor | Remaining evacuation window |
| [`models/risk_label_encoder.joblib`](file:///d:/GovardhanaGiri%202.0/models/risk_label_encoder.joblib) | LabelEncoder | Target label mapping |
| [`models/model_metadata.json`](file:///d:/GovardhanaGiri%202.0/models/model_metadata.json) | JSON Metadata | Features, thresholds, parameters |
