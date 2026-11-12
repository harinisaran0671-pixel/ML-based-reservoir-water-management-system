"""
AquaPredict AI - Core Test Suite
Tests dataset integrity, preprocessing, ML model inference, storage water balance,
risk calculations, scenario simulations, and FastAPI endpoints.
"""

import os
import json
import pytest
import numpy as np
import pandas as pd
from fastapi.testclient import TestClient

from backend.main import app
from ml.preprocess import add_features, chronological_split, PreprocessingPipeline
from ml.predict import predict_single, forecast_trajectory, calculate_risk, generate_recommendations
from backend.services.scenario_engine import run_scenario_simulation, PREDEFINED_SCENARIOS
from backend.services.report_generator import generate_pdf_report

client = TestClient(app)

# 1. Dataset Loading Test
def test_dataset_exists_and_has_records():
    data_path = "data/water_demand_reservoir_dataset.csv"
    assert os.path.exists(data_path), "Dataset CSV must exist"
    df = pd.read_csv(data_path)
    assert len(df) == 3659, f"Expected 3659 records, found {len(df)}"
    assert df["reservoir_name"].nunique() == 14, "Expected 14 unique reservoirs"
    assert df["state"].nunique() == 6, "Expected 6 unique states"
    assert "data_type" in df.columns
    assert (df["data_type"] == "DEMO/SYNTHETIC").all()

# 2. Preprocessing Feature Engineering Test
def test_feature_engineering():
    df = pd.read_csv("data/water_demand_reservoir_dataset.csv").head(50)
    df_feat = add_features(df)
    assert "month" in df_feat.columns
    assert "lag_1_demand" in df_feat.columns
    assert "temp_rain_ratio" in df_feat.columns
    assert not df_feat["lag_1_demand"].isna().any(), "Lag features should not contain NaNs"

# 3. Chronological Split Test (No temporal data leakage)
def test_chronological_split():
    df = pd.read_csv("data/water_demand_reservoir_dataset.csv")
    df_feat = add_features(df)
    train_df, val_df, test_df = chronological_split(df_feat, 0.70, 0.15)
    assert len(train_df) > 0
    assert len(val_df) > 0
    assert len(test_df) > 0
    assert train_df["date"].max() < val_df["date"].min(), "Train dates must strictly precede Val dates"
    assert val_df["date"].max() < test_df["date"].min(), "Val dates must strictly precede Test dates"

# 4. Model Artifacts Exist Test
def test_model_artifacts_exist():
    assert os.path.exists("models/best_water_demand_model.pkl"), "Best model pkl must exist"
    assert os.path.exists("models/inflow_model.pkl"), "Inflow model pkl must exist"
    assert os.path.exists("models/preprocessing.pkl"), "Preprocessing pipeline pkl must exist"
    assert os.path.exists("models/model_metrics.json"), "Model metrics json must exist"

# 5. Prediction Single Inference Test
def test_predict_single_inference():
    payload = {
        "state": "Tamil Nadu",
        "reservoir": "Bhavanisagar",
        "population": 2500000,
        "rainfall_mm": 120,
        "temperature_c": 28,
        "agricultural_area_ha": 120000,
        "industrial_demand_mcm": 60,
        "reservoir_capacity_mcm": 928,
        "current_storage_mcm": 650,
        "month": 7
    }
    result = predict_single(payload)
    assert result["predicted_demand_mcm"] > 0
    assert result["future_storage_mcm"] >= result["dead_storage_mcm"], "Storage cannot drop below dead storage"
    assert 0 <= result["storage_percentage"] <= 100
    assert result["risk_level"] in ["LOW", "MEDIUM", "HIGH", "CRITICAL"]

# 6. Storage Non-Negative Invariant Test
def test_storage_cannot_become_negative():
    # Extreme drought and massive demand simulation
    payload = {
        "state": "Tamil Nadu",
        "reservoir": "Bhavanisagar",
        "population": 9000000,
        "rainfall_mm": 0,
        "temperature_c": 45,
        "agricultural_area_ha": 300000,
        "industrial_demand_mcm": 500,
        "reservoir_capacity_mcm": 928,
        "current_storage_mcm": 50,  # very low storage
        "month": 5
    }
    result = predict_single(payload)
    assert result["future_storage_mcm"] >= 0, "Storage must never become negative"
    assert result["future_storage_mcm"] >= result["dead_storage_mcm"]

# 7. Multi-Month Forecast Trajectory Test
def test_forecast_trajectory_12_months():
    payload = {
        "state": "Karnataka",
        "reservoir": "Krishna Raja Sagara",
        "population": 1920000,
        "rainfall_mm": 100,
        "temperature_c": 27,
        "agricultural_area_ha": 120000,
        "industrial_demand_mcm": 45,
        "reservoir_capacity_mcm": 1400,
        "current_storage_mcm": 880,
        "month": 6
    }
    forecast = forecast_trajectory(payload, horizon_months=12)
    assert len(forecast["monthly_forecast"]) == 12
    assert forecast["average_predicted_demand_mcm"] > 0
    assert forecast["end_storage_mcm"] >= 0
    assert forecast["overall_risk_level"] in ["LOW", "MEDIUM", "HIGH", "CRITICAL"]

# 8. Risk Calculation Engine 7-Factor Test
def test_risk_calculation_seven_factors():
    risk = calculate_risk(
        storage_percentage=22.0,
        current_storage=300.0,
        predicted_demand=400.0,
        predicted_inflow=50.0,
        rainfall_mm=10.0,
        temperature_c=39.0,
        population=3000000.0
    )
    assert 0 <= risk["risk_score"] <= 100
    assert len(risk["factors"]) == 7, "Risk engine must evaluate exactly 7 contributing factors"
    assert risk["risk_level"] in ["HIGH", "CRITICAL"]
    assert len(risk["recommendations"]) >= 1

# 9. Dynamic AI Recommendations Test
def test_dynamic_recommendations():
    recs_critical = generate_recommendations(
        risk_level="CRITICAL",
        storage_percentage=15.0,
        demand_gap=200.0,
        rainfall_mm=10.0,
        temperature_c=40.0
    )
    assert any("curtailment" in r.lower() or "emergency" in r.lower() for r in recs_critical)

    recs_low = generate_recommendations(
        risk_level="LOW",
        storage_percentage=85.0,
        demand_gap=0.0,
        rainfall_mm=260.0,
        temperature_c=25.0
    )
    assert any("flood" in r.lower() or "optimal" in r.lower() or "recharge" in r.lower() for r in recs_low)

# 10. Scenario Simulator Test
def test_scenario_simulator_drought():
    res_info = {
        "state": "Tamil Nadu",
        "capacity_mcm": 928,
        "current_storage_mcm": 650,
        "base_population": 2250000,
        "base_agri_area_ha": 105000
    }
    result = run_scenario_simulation(
        reservoir_name="Bhavanisagar",
        reservoir_info=res_info,
        scenario_preset="Drought"
    )
    assert result["scenario_name"] == "Drought"
    assert result["scenario"]["demand_mcm"] >= result["baseline"]["demand_mcm"]
    assert result["scenario"]["storage_mcm"] <= result["baseline"]["storage_mcm"]
    assert result["scenario"]["risk_score"] >= result["baseline"]["risk_score"]

# 11. API Health Check Endpoint Test
def test_api_health():
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["models_loaded"] is True

# 12. API Reservoirs Endpoint Test
def test_api_get_reservoirs():
    response = client.get("/api/reservoirs")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 14, "Must return all 14 reservoirs"
    assert all("capacity_mcm" in r for r in data)
    assert all("storage_percentage" in r for r in data)

# 13. API Prediction Endpoint Test
def test_api_predict_demand():
    payload = {
        "state": "Tamil Nadu",
        "reservoir": "Mettur",
        "population": 3480000,
        "rainfall_mm": 110,
        "temperature_c": 29,
        "agricultural_area_ha": 175000,
        "industrial_demand_mcm": 80,
        "reservoir_capacity_mcm": 2700,
        "current_storage_mcm": 1890,
        "forecast_months": 6
    }
    response = client.post("/api/predict-demand", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["predicted_demand_mcm"] > 0
    assert data["risk_score"] >= 0

# 14. API Storage Assessment Endpoint Test
def test_api_storage_assessment():
    payload = {
        "reservoir_name": "Tungabhadra",
        "current_storage_mcm": 1750,
        "reservoir_capacity_mcm": 3200,
        "inflow_mcm": 450,
        "domestic_demand_mcm": 120,
        "agricultural_demand_mcm": 310,
        "industrial_demand_mcm": 65,
        "ecological_requirement_mcm": 35,
        "evaporation_mcm": 45
    }
    response = client.post("/api/storage-assessment", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["future_storage_mcm"] >= 0
    assert "water_balance_breakdown" in data

# 15. API PDF Report Generation Test
def test_api_generate_pdf_report():
    payload = {
        "reservoir_name": "Bhavanisagar",
        "forecast_horizon_months": 12,
        "scenario_name": "Drought",
        "notes": "Emergency contingency test for SIH1692 demonstration"
    }
    response = client.post("/api/generate-report", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["pdf_filename"].endswith(".pdf")
    assert os.path.exists(os.path.join("reports", data["pdf_filename"]))

    # Test download endpoint
    dl_resp = client.get(data["download_url"])
    assert dl_resp.status_code == 200
    assert dl_resp.headers["content-type"] == "application/pdf"
