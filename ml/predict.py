"""
AquaPredict AI - Prediction Engine & Decision Support Logic
Loads trained models and provides:
1. Demand inference
2. Month-by-month trajectory forecasting (1 to 60 months)
3. Water balance storage projection (non-negative storage)
4. 7-factor risk scoring (0-100) & risk levels
5. Dynamic, data-driven AI recommendations
"""

import os
import joblib
import numpy as np
import pandas as pd
from typing import Dict, Any, List

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MODELS_DIR = os.path.join(BASE_DIR, "models")

_model = None
_inflow_model_dict = None
_pipeline = None

def load_artifacts():
    global _model, _inflow_model_dict, _pipeline
    if _model is None:
        model_path = os.path.join(MODELS_DIR, "best_water_demand_model.pkl")
        if not os.path.exists(model_path):
            raise FileNotFoundError(f"Trained model not found at {model_path}. Please run train_model.py first.")
        _model = joblib.load(model_path)

    if _inflow_model_dict is None:
        inflow_path = os.path.join(MODELS_DIR, "inflow_model.pkl")
        if os.path.exists(inflow_path):
            _inflow_model_dict = joblib.load(inflow_path)

    if _pipeline is None:
        pipe_path = os.path.join(MODELS_DIR, "preprocessing.pkl")
        from ml.preprocess import PreprocessingPipeline
        _pipeline = joblib.load(pipe_path)

def calculate_risk(
    storage_percentage: float,
    current_storage: float,
    predicted_demand: float,
    predicted_inflow: float,
    rainfall_mm: float,
    temperature_c: float,
    population: float,
    base_population: float = 2500000.0,
    drought_index: float = 0.0
) -> Dict[str, Any]:
    """
    Computes a 0-100 risk score based on 7 contributing factors:
    1. Storage level stress (weight: 25%)
    2. Demand-to-storage gap (weight: 25%)
    3. Inflow vs demand deficit (weight: 15%)
    4. Rainfall deficit (weight: 15%)
    5. Drought index (weight: 10%)
    6. Temperature / evaporation stress (weight: 5%)
    7. Population pressure (weight: 5%)
    """
    # 1. Storage level factor (0-100)
    if storage_percentage <= 15:
        f_storage = 100.0
    elif storage_percentage <= 30:
        f_storage = 85.0 - (storage_percentage - 15) * 1.5
    elif storage_percentage <= 50:
        f_storage = 62.5 - (storage_percentage - 30) * 1.25
    elif storage_percentage <= 75:
        f_storage = 37.5 - (storage_percentage - 50) * 0.9
    else:
        f_storage = max(5.0, 15.0 - (storage_percentage - 75) * 0.4)

    # 2. Storage vs demand gap factor
    # If demand exceeds 40% of current storage in 1 month, severe stress
    demand_ratio = predicted_demand / max(1.0, current_storage)
    if demand_ratio >= 0.7:
        f_gap = 100.0
    elif demand_ratio >= 0.4:
        f_gap = 70.0 + (demand_ratio - 0.4) * 100.0
    elif demand_ratio >= 0.2:
        f_gap = 40.0 + (demand_ratio - 0.2) * 150.0
    else:
        f_gap = max(5.0, demand_ratio * 200.0)

    # 3. Inflow deficit factor
    if predicted_inflow < predicted_demand * 0.3:
        f_inflow = 90.0
    elif predicted_inflow < predicted_demand * 0.7:
        f_inflow = 60.0
    elif predicted_inflow < predicted_demand:
        f_inflow = 35.0
    else:
        f_inflow = 10.0

    # 4. Rainfall deficit factor
    if rainfall_mm < 25.0:
        f_rain = 85.0
    elif rainfall_mm < 70.0:
        f_rain = 55.0
    elif rainfall_mm < 150.0:
        f_rain = 30.0
    else:
        f_rain = 10.0

    # 5. Drought index factor (-2.5 to +2.5)
    if drought_index < -1.5:
        f_drought = 95.0
    elif drought_index < -0.5:
        f_drought = 65.0
    elif drought_index < 0.5:
        f_drought = 35.0
    else:
        f_drought = 10.0

    # 6. Temperature stress
    if temperature_c > 38.0:
        f_temp = 90.0
    elif temperature_c > 32.0:
        f_temp = 60.0
    elif temperature_c > 26.0:
        f_temp = 30.0
    else:
        f_temp = 15.0

    # 7. Population pressure
    pop_ratio = population / max(1.0, base_population)
    f_pop = min(100.0, max(10.0, pop_ratio * 40.0))

    # Weighted composite score (0-100)
    risk_score = (
        0.25 * f_storage +
        0.25 * f_gap +
        0.15 * f_inflow +
        0.15 * f_rain +
        0.10 * f_drought +
        0.05 * f_temp +
        0.05 * f_pop
    )
    risk_score = round(float(np.clip(risk_score, 0.0, 100.0)), 1)

    # Categorical level
    if risk_score >= 75.0:
        risk_level = "CRITICAL"
    elif risk_score >= 55.0:
        risk_level = "HIGH"
    elif risk_score >= 35.0:
        risk_level = "MEDIUM"
    else:
        risk_level = "LOW"

    # Main contributing factors
    factors = [
        {"name": "Storage Level", "score": round(f_storage, 1), "weight": "25%"},
        {"name": "Demand-to-Storage Ratio", "score": round(f_gap, 1), "weight": "25%"},
        {"name": "Inflow Deficit", "score": round(f_inflow, 1), "weight": "15%"},
        {"name": "Rainfall Deficit", "score": round(f_rain, 1), "weight": "15%"},
        {"name": "Drought Index (SPI)", "score": round(f_drought, 1), "weight": "10%"},
        {"name": "Temperature / Evaporation", "score": round(f_temp, 1), "weight": "5%"},
        {"name": "Population Pressure", "score": round(f_pop, 1), "weight": "5%"},
    ]
    # Sort top risk drivers
    sorted_factors = sorted(factors, key=lambda x: x["score"], reverse=True)
    top_risk_factors = [f"{x['name']} ({x['score']}/100)" for x in sorted_factors[:3]]

    # Dynamic recommendations
    recommendations = generate_recommendations(
        risk_level=risk_level,
        storage_percentage=storage_percentage,
        demand_gap=predicted_demand - current_storage,
        rainfall_mm=rainfall_mm,
        temperature_c=temperature_c
    )

    return {
        "risk_score": risk_score,
        "risk_level": risk_level,
        "factors": factors,
        "main_risk_factors": top_risk_factors,
        "recommendations": recommendations
    }

def generate_recommendations(
    risk_level: str,
    storage_percentage: float,
    demand_gap: float,
    rainfall_mm: float,
    temperature_c: float
) -> List[str]:
    recs = []

    if risk_level == "CRITICAL" or storage_percentage < 25.0:
        recs.append("Emergency Action: Enforce municipal demand curtailment and prioritize essential domestic supply.")
        recs.append("Restrict non-critical industrial extraction and canal irrigation releases immediately.")
        recs.append("Activate secondary emergency aquifer wells and interstate water-sharing pact provisions.")
    elif risk_level == "HIGH" or storage_percentage < 45.0:
        recs.append("Implement rotational irrigation schedules (Warabandi system) to prevent agricultural overshoot.")
        recs.append("Increase canal lining inspections to reduce conveyance seepage losses.")
        recs.append("Issue advisory to municipal corporations for leak detection and non-potable water recycling.")
    elif risk_level == "MEDIUM":
        recs.append("Maintain standard conservation releases and incentivize micro-irrigation (drip/sprinkler).")
        recs.append("Monitor upstream gauge stations closely for monsoon onset variations.")
        recs.append("Prepare auxiliary catchment check-dams for upcoming runoff capture.")
    else:
        recs.append("Storage capacity is optimal. Review rule curves for balanced flood cushion management.")
        recs.append("Hydropower generation can run on scheduled baseline without threatening dry-season reserves.")
        recs.append("Facilitate artificial groundwater recharge through managed aquifer replenishment.")

    if rainfall_mm < 35.0:
        recs.append(f"Low precipitation recorded ({rainfall_mm} mm). Prepare localized drought mitigation contingency.")
    elif rainfall_mm > 250.0:
        recs.append("Heavy catchment rainfall: Ensure spillway gates operational and adhere to CWC flood routing protocols.")

    if temperature_c > 36.0:
        recs.append("High ambient temperatures will accelerate reservoir surface evaporation. Deploy shade-balls or surface monolayers where feasible.")

    return recs[:4]

def predict_single(data: Dict[str, Any]) -> Dict[str, Any]:
    load_artifacts()

    state = data.get("state", "Tamil Nadu")
    reservoir = data.get("reservoir", "Bhavanisagar")
    pop = float(data.get("population", 2500000))
    rain = float(data.get("rainfall_mm", 120.0))
    temp = float(data.get("temperature_c", 28.0))
    agri_area = float(data.get("agricultural_area_ha", 120000))
    ind_demand = float(data.get("industrial_demand_mcm", 60.0))
    capacity = float(data.get("reservoir_capacity_mcm", 2000.0))
    storage = float(data.get("current_storage_mcm", 1400.0))
    month = int(data.get("month", 7))
    quarter = (month - 1) // 3 + 1

    # Season
    if month in [6, 7, 8, 9]:
        season = "Monsoon"
    elif month in [10, 11]:
        season = "Post-Monsoon"
    elif month in [12, 1, 2]:
        season = "Winter"
    else:
        season = "Summer"

    storage_pct = min(100.0, max(0.0, (storage / capacity) * 100.0))

    # Base estimate for lags if not supplied
    prev_demand = float(data.get("previous_total_demand", 450.0))

    row = {
        "population": pop,
        "rainfall_mm": rain,
        "temperature_c": temp,
        "agricultural_area_ha": agri_area,
        "reservoir_capacity_mcm": capacity,
        "current_storage_mcm": storage,
        "storage_percentage": storage_pct,
        "industrial_demand_mcm": ind_demand,
        "month": month,
        "quarter": quarter,
        "lag_1_demand": prev_demand,
        "lag_3_demand": prev_demand * 0.98,
        "lag_6_demand": prev_demand * 1.02,
        "lag_12_demand": prev_demand,
        "rolling_mean_3_demand": prev_demand,
        "rolling_std_3_demand": prev_demand * 0.05,
        "temp_rain_ratio": temp / (rain + 10.0),
        "state_Andhra Pradesh": 1.0 if state == "Andhra Pradesh" else 0.0,
        "state_Karnataka": 1.0 if state == "Karnataka" else 0.0,
        "state_Kerala": 1.0 if state == "Kerala" else 0.0,
        "state_Maharashtra": 1.0 if state == "Maharashtra" else 0.0,
        "state_Tamil Nadu": 1.0 if state == "Tamil Nadu" else 0.0,
        "state_Telangana": 1.0 if state == "Telangana" else 0.0,
        "season_Monsoon": 1.0 if season == "Monsoon" else 0.0,
        "season_Post-Monsoon": 1.0 if season == "Post-Monsoon" else 0.0,
        "season_Summer": 1.0 if season == "Summer" else 0.0,
        "season_Winter": 1.0 if season == "Winter" else 0.0,
    }

    df_sample = pd.DataFrame([row])
    X_sample = _pipeline.transform(df_sample)
    pred_demand = float(_model.predict(X_sample)[0])
    pred_demand = max(10.0, round(pred_demand, 2))

    # Inflow estimate
    inflow = 0.0
    if _inflow_model_dict:
        inflow_features = _inflow_model_dict["features"]
        inflow_row = [row.get(f, 0.0) for f in inflow_features]
        inflow_pred = float(_inflow_model_dict["model"].predict([inflow_row])[0])
        inflow = max(5.0, round(inflow_pred, 2))
    else:
        inflow = round(max(5.0, rain * 1.2 * (capacity / 1500.0)), 2)

    # Evaporation
    evap_rate = 0.045 if season == "Summer" else (0.02 if season == "Winter" else 0.03)
    evap_mcm = round(storage * evap_rate * (temp / 28.0), 2)

    # Water balance (Storage cannot become negative!)
    dead_storage = round(capacity * 0.05, 2)
    future_storage = max(dead_storage, min(capacity, storage + inflow - pred_demand - evap_mcm))
    future_storage = round(future_storage, 2)
    future_storage_pct = round((future_storage / capacity) * 100.0, 1)

    # Risk assessment
    risk = calculate_risk(
        storage_percentage=future_storage_pct,
        current_storage=storage,
        predicted_demand=pred_demand,
        predicted_inflow=inflow,
        rainfall_mm=rain,
        temperature_c=temp,
        population=pop
    )

    return {
        "state": state,
        "reservoir": reservoir,
        "month": month,
        "season": season,
        "predicted_demand_mcm": pred_demand,
        "predicted_inflow_mcm": inflow,
        "evaporation_mcm": evap_mcm,
        "future_storage_mcm": future_storage,
        "storage_percentage": future_storage_pct,
        "dead_storage_mcm": dead_storage,
        "capacity_mcm": capacity,
        "risk_score": risk["risk_score"],
        "risk_level": risk["risk_level"],
        "factors": risk["factors"],
        "main_risk_factors": risk["main_risk_factors"],
        "recommendations": risk["recommendations"]
    }

def forecast_trajectory(data: Dict[str, Any], horizon_months: int = 12) -> Dict[str, Any]:
    """Generates monthly trajectory over the specified horizon up to 60 months."""
    load_artifacts()
    horizon_months = min(60, max(1, horizon_months))

    start_month = int(data.get("month", 7))
    curr_storage = float(data.get("current_storage_mcm", 1500.0))
    capacity = float(data.get("reservoir_capacity_mcm", 2500.0))
    pop = float(data.get("population", 2500000.0))
    base_rain = float(data.get("rainfall_mm", 110.0))
    base_temp = float(data.get("temperature_c", 29.0))
    agri_area = float(data.get("agricultural_area_ha", 120000.0))
    ind_demand = float(data.get("industrial_demand_mcm", 55.0))
    state = data.get("state", "Tamil Nadu")
    reservoir = data.get("reservoir", "Bhavanisagar")

    monthly_records = []
    dead_storage = round(capacity * 0.05, 2)
    last_demand = float(data.get("previous_total_demand", 450.0))

    month_names = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

    for step in range(1, horizon_months + 1):
        m = ((start_month - 1 + step) % 12) + 1
        year_offset = (start_month - 1 + step) // 12

        # Seasonality
        if m in [6, 7, 8, 9]:
            season = "Monsoon"
            rain = base_rain * 1.6
            temp = base_temp - 2.0
        elif m in [10, 11]:
            season = "Post-Monsoon"
            rain = base_rain * 1.1 if state == "Tamil Nadu" else base_rain * 0.6
            temp = base_temp - 1.0
        elif m in [12, 1, 2]:
            season = "Winter"
            rain = base_rain * 0.15
            temp = base_temp - 5.0
        else:
            season = "Summer"
            rain = base_rain * 0.3
            temp = base_temp + 4.0

        # Step payload
        step_payload = {
            "state": state,
            "reservoir": reservoir,
            "population": pop * (1.0 + 0.012 * (step / 12.0)),
            "rainfall_mm": max(0.0, rain),
            "temperature_c": temp,
            "agricultural_area_ha": agri_area,
            "industrial_demand_mcm": ind_demand,
            "reservoir_capacity_mcm": capacity,
            "current_storage_mcm": curr_storage,
            "month": m,
            "previous_total_demand": last_demand
        }

        step_res = predict_single(step_payload)
        demand = step_res["predicted_demand_mcm"]
        inflow = step_res["predicted_inflow_mcm"]
        evap = step_res["evaporation_mcm"]

        # Water balance update (storage cannot be negative!)
        new_storage = max(dead_storage, min(capacity, curr_storage + inflow - demand - evap))
        storage_pct = round((new_storage / capacity) * 100.0, 1)

        monthly_records.append({
            "step": step,
            "month_label": f"{month_names[m - 1]} +{step}m",
            "month": m,
            "season": season,
            "predicted_demand_mcm": demand,
            "predicted_inflow_mcm": inflow,
            "evaporation_mcm": evap,
            "predicted_storage_mcm": round(new_storage, 2),
            "storage_percentage": storage_pct,
            "risk_score": step_res["risk_score"],
            "risk_level": step_res["risk_level"]
        })

        curr_storage = new_storage
        last_demand = demand

    # Final summary over horizon
    avg_demand = round(float(np.mean([r["predicted_demand_mcm"] for r in monthly_records])), 2)
    end_storage = monthly_records[-1]["predicted_storage_mcm"]
    end_pct = monthly_records[-1]["storage_percentage"]
    max_risk = max(monthly_records, key=lambda x: x["risk_score"])

    overall_risk = calculate_risk(
        storage_percentage=end_pct,
        current_storage=end_storage,
        predicted_demand=avg_demand,
        predicted_inflow=monthly_records[0]["predicted_inflow_mcm"],
        rainfall_mm=base_rain,
        temperature_c=base_temp,
        population=pop
    )

    return {
        "reservoir": reservoir,
        "state": state,
        "capacity_mcm": capacity,
        "horizon_months": horizon_months,
        "average_predicted_demand_mcm": avg_demand,
        "end_storage_mcm": end_storage,
        "end_storage_percentage": end_pct,
        "peak_risk_month": max_risk["month_label"],
        "peak_risk_level": max_risk["risk_level"],
        "peak_risk_score": max_risk["risk_score"],
        "overall_risk_score": overall_risk["risk_score"],
        "overall_risk_level": overall_risk["risk_level"],
        "factors": overall_risk["factors"],
        "main_risk_factors": overall_risk["main_risk_factors"],
        "recommendations": overall_risk["recommendations"],
        "monthly_forecast": monthly_records
    }
