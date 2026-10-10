"""
Integration Tests for Project GovardhanaGiri REST API Endpoints
==============================================================
Verifies:
1. Station list with attached 7-horizon forecasts.
2. Direct 7-horizon flood forecast endpoints.
3. Direct 7-horizon landslide forecast endpoints.
4. Lead-time validation report endpoints.
5. Data provenance metadata endpoint.
"""

import pytest
from fastapi.testclient import TestClient
from backend.main import app

@pytest.fixture
def client():
    return TestClient(app)

def test_get_stations_includes_forecast_7h(client):
    response = client.get("/api/stations")
    assert response.status_code == 200
    data = response.json()
    assert "stations" in data
    assert len(data["stations"]) > 0

    first_stn = data["stations"][0]
    assert "forecast_7h" in first_stn
    fc = first_stn["forecast_7h"]
    assert "horizons" in fc
    assert len(fc["horizons"]) == 7

def test_flood_forecast_endpoint(client):
    response = client.get("/api/forecast/floods/TEL-STN-03")
    assert response.status_code == 200
    data = response.json()
    assert data["station_id"] == "TEL-STN-03"
    assert len(data["horizons"]) == 7
    assert data["horizons"][0]["horizon_hours"] == 1
    assert data["horizons"][6]["horizon_hours"] == 7

def test_all_flood_forecasts_endpoint(client):
    response = client.get("/api/forecast/floods")
    assert response.status_code == 200
    data = response.json()
    assert "catchments" in data or "forecasts" in data
    items = data.get("catchments") or data.get("forecasts")
    assert len(items) >= 10

def test_landslide_forecast_endpoint(client):
    response = client.get("/api/forecast/landslides/AIZAWL-01")
    assert response.status_code == 200
    data = response.json()
    assert data["location_id"] == "AIZAWL-01"
    assert len(data["horizons"]) == 7
    assert "factor_of_safety" in data["horizons"][0]

def test_validation_report_endpoint(client):
    response = client.get("/api/validation/report")
    assert response.status_code == 200
    data = response.json()
    assert "summary_by_horizon" in data
    assert len(data["summary_by_horizon"]) == 4

def test_data_provenance_endpoint(client):
    response = client.get("/api/data-provenance")
    assert response.status_code == 200
    data = response.json()
    assert data["is_demo_mode"] is True
    assert "layers" in data

def test_nelens_overview_includes_forecast_7h(client):
    response = client.get("/api/nelens/overview")
    assert response.status_code == 200
    data = response.json()
    assert "locations" in data
    assert len(data["locations"]) > 0
    first_loc = data["locations"][0]
    assert "forecast_7h" in first_loc
    assert len(first_loc["forecast_7h"]["horizons"]) == 7
