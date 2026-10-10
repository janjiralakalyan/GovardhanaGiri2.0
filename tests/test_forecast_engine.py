"""
Unit Tests for GovardhanaGiri 2.0 Flood Forecasting Engine
==========================================================
Verifies:
1. Multi-horizon forecasting for +1h through +7h.
2. Horton infiltration capacity decay and rational runoff coefficient.
3. Catchment lag time and surge peak routing.
4. Expanding uncertainty intervals.
5. Incomplete data handling and INSUFFICIENT_DATA state.
"""

import pytest
from backend.forecast_engine import (
    FloodForecastEngine,
    calculate_horton_infiltration,
    calculate_kirpich_lag_time,
    classify_flood_risk_tier
)

def test_horton_infiltration_decay():
    # As time t increases, infiltration rate should decay towards fc
    f_0h = calculate_horton_infiltration(f_0=25.0, f_c=8.0, k_decay=0.5, elapsed_hours=0.0)
    f_2h = calculate_horton_infiltration(f_0=25.0, f_c=8.0, k_decay=0.5, elapsed_hours=2.0)
    f_7h = calculate_horton_infiltration(f_0=25.0, f_c=8.0, k_decay=0.5, elapsed_hours=7.0)

    assert f_0h == pytest.approx(25.0, 0.01)
    assert f_2h < f_0h
    assert f_7h < f_2h
    assert f_7h >= 8.0

def test_kirpich_lag_time():
    tc = calculate_kirpich_lag_time(length_m=5000.0, slope_pct=3.0)
    assert tc > 0.5
    assert tc < 10.0

def test_classify_flood_risk_tier():
    assert classify_flood_risk_tier(95.0, 1.05) == "CRITICAL"
    assert classify_flood_risk_tier(60.0, 0.88) == "HIGH"
    assert classify_flood_risk_tier(45.0, 0.70) == "MODERATE"
    assert classify_flood_risk_tier(15.0, 0.40) == "LOW"

def test_multi_horizon_forecast_generation():
    engine = FloodForecastEngine()
    dummy_station = {
        "id": "TEL-TEST-01",
        "village_area": "Test Medaram Gorge",
        "river_stream": "Test Vagu",
        "danger_water_level": 5.0,
        "slope": 8.0,
        "flow_accumulation": 25000.0,
        "distance_to_river": 50.0,
        "population": 12000,
        "telemetry": {
            "Water_Level": 3.8,
            "Rainfall_1h": 22.0,
            "Rainfall_3h": 45.0,
            "Rainfall_6h": 70.0,
            "Rainfall_24h": 110.0,
            "Rainfall_48h": 140.0,
            "Rainfall_72h": 165.0,
            "Rainfall_Intensity": 35.0,
            "Soil_Moisture": 78.0,
            "Soil_Saturation": 82.0,
            "Infiltration_Rate": 16.0
        }
    }

    result = engine.compute_multi_horizon_forecast(dummy_station)

    assert result["station_id"] == "TEL-TEST-01"
    assert "horizons" in result
    assert len(result["horizons"]) == 7

    # Check each horizon +1h to +7h
    horizons = result["horizons"]
    for i, h in enumerate(horizons):
        expected_h = i + 1
        assert h["horizon_hours"] == expected_h
        assert "projected_water_level_m" in h
        assert "flood_probability_pct" in h
        assert "uncertainty_margin_pct" in h
        assert "ci_90_range" in h
        assert "primary_factors" in h
        assert len(h["primary_factors"]) > 0
        assert h["risk_tier"] in ["LOW", "MODERATE", "HIGH", "CRITICAL", "INSUFFICIENT_DATA"]

    # Uncertainty should expand as horizon increases
    assert horizons[6]["uncertainty_margin_pct"] > horizons[0]["uncertainty_margin_pct"]

def test_missing_critical_sensor_fallback():
    engine = FloodForecastEngine()
    # Missing Water_Level entirely
    corrupt_station = {
        "id": "TEL-BROKEN-01",
        "village_area": "Broken Sensor Outpost",
        "river_stream": "Gauging Failure Stream",
        "danger_water_level": 6.0,
        "telemetry": {
            "Water_Level": None,
            "Rainfall_1h": 10.0
        }
    }

    result = engine.compute_multi_horizon_forecast(corrupt_station)
    assert result["earliest_breach"]["status"] == "INSUFFICIENT_DATA"
    for h in result["horizons"]:
        assert h["risk_tier"] == "INSUFFICIENT_DATA"
        assert h["uncertainty_margin_pct"] >= 15.0
