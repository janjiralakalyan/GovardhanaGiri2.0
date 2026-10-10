"""
Unit Tests for Project GovardhanaGiri: Landslide Geotechnical Forecasting Engine
===============================================================================
Verifies:
1. Limit-equilibrium infinite slope Factor of Safety (FoS) calculations.
2. Dynamic pore-water pressure progression.
3. Antecedent Precipitation Index (API 24h, 48h, 72h).
4. Progressive shear creep velocity.
5. Multi-horizon progression (+1h through +7h).
"""

import pytest
from backend.landslide_engine import (
    LandslideForecastEngine,
    calculate_factor_of_safety,
    calculate_antecedent_precipitation_index,
    classify_landslide_risk_tier
)

def test_factor_of_safety_physics():
    # Dry slope with modest incline should have FoS > 1.3
    fos_stable = calculate_factor_of_safety(
        slope_deg=25.0,
        cohesion_kpa=12.0,
        friction_angle_deg=34.0,
        pore_pressure_kpa=0.0
    )
    assert fos_stable > 1.5

    # High pore pressure u(t) on steep 42 deg slope should destabilize slope (FoS < 1.0)
    fos_critical = calculate_factor_of_safety(
        slope_deg=42.0,
        cohesion_kpa=4.0,
        friction_angle_deg=28.0,
        pore_pressure_kpa=35.0
    )
    assert fos_critical < 1.0

def test_antecedent_precipitation_index():
    api = calculate_antecedent_precipitation_index(r_24h=80.0, r_48h=130.0, r_72h=170.0)
    assert api == 63.0
    assert api > 50.0

def test_classify_landslide_risk_tier():
    assert classify_landslide_risk_tier(92.0, 0.92) == "CRITICAL"
    assert classify_landslide_risk_tier(72.0, 1.15) == "HIGH"
    assert classify_landslide_risk_tier(45.0, 1.35) == "MODERATE"
    assert classify_landslide_risk_tier(15.0, 1.65) == "LOW"

def test_multi_horizon_landslide_forecast():
    engine = LandslideForecastEngine()
    dummy_location = {
        "id": "NE-TEST-01",
        "corridor_name": "Test Durtlang Pass",
        "district": "Aizawl",
        "state": "Mizoram",
        "risk_drivers": {
            "slope": {"value": 39.0},
            "soil_moisture": {"value": 84.0},
            "rainfall_24h": {"value": 155.0}
        },
        "rainfall_metrics": {
            "current_rate": 22.0,
            "last_6h": 85.0,
            "last_48h": 210.0,
            "last_72h": 265.0,
            "forecast_next_6h": 70.0,
            "forecast_next_12h": 125.0
        },
        "exposure": {
            "population_affected": 3500
        }
    }

    result = engine.compute_multi_horizon_forecast(dummy_location)

    assert result["location_id"] == "NE-TEST-01"
    assert "horizons" in result
    assert len(result["horizons"]) == 7

    for i, h in enumerate(result["horizons"]):
        assert h["horizon_hours"] == i + 1
        assert "factor_of_safety" in h
        assert "estimated_pore_water_pressure_kpa" in h
        assert "shear_creep_displacement_velocity_mmh" in h
        assert "landslide_probability_pct" in h
        assert "uncertainty_margin_pct" in h
        assert len(h["primary_factors"]) > 0

    # +7h uncertainty should be wider than +1h
    assert result["horizons"][6]["uncertainty_margin_pct"] > result["horizons"][0]["uncertainty_margin_pct"]
