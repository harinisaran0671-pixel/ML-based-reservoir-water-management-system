"""
AquaPredict AI - Scenario Simulation Engine
Reruns the actual trained ML models with scenario deltas.
Supports 7 Predefined Scenarios + Custom Scenarios.
"""

from typing import Dict, Any
from ml.predict import predict_single

PREDEFINED_SCENARIOS = {
    "Normal Conditions": {
        "pop_change_pct": 0.0,
        "rain_change_pct": 0.0,
        "temp_change_c": 0.0,
        "agri_change_pct": 0.0,
        "ind_change_pct": 0.0,
        "description": "Baseline climatic and socio-economic conditions reflecting long-term seasonal averages."
    },
    "Population Growth": {
        "pop_change_pct": 15.0,
        "rain_change_pct": 0.0,
        "temp_change_c": 0.5,
        "agri_change_pct": 2.0,
        "ind_change_pct": 8.0,
        "description": "Rapid urban demographic expansion (+15% population) driving elevated domestic and commercial consumption."
    },
    "Low Rainfall": {
        "pop_change_pct": 0.0,
        "rain_change_pct": -30.0,
        "temp_change_c": 1.0,
        "agri_change_pct": 10.0,
        "ind_change_pct": 0.0,
        "description": "Monsoon deficiency of 30% with higher crop irrigation dependency and reduced natural catchment recharge."
    },
    "Drought": {
        "pop_change_pct": 2.0,
        "rain_change_pct": -50.0,
        "temp_change_c": 2.5,
        "agri_change_pct": 20.0,
        "ind_change_pct": -5.0,
        "description": "Severe meteorological and hydrological drought (-50% rainfall, +2.5°C heat) causing severe storage depletion."
    },
    "Extreme Rainfall": {
        "pop_change_pct": 0.0,
        "rain_change_pct": 60.0,
        "temp_change_c": -1.0,
        "agri_change_pct": -10.0,
        "ind_change_pct": 0.0,
        "description": "Intense cyclonic/monsoon precipitation (+60% rainfall) resulting in high reservoir inflow and flood-control obligations."
    },
    "High Agricultural Demand": {
        "pop_change_pct": 0.0,
        "rain_change_pct": -10.0,
        "temp_change_c": 0.8,
        "agri_change_pct": 35.0,
        "ind_change_pct": 5.0,
        "description": "Intensive multi-cropping/Rabi season expansion (+35% agricultural area demand) straining canal supplies."
    },
    "Combined Climate Stress": {
        "pop_change_pct": 10.0,
        "rain_change_pct": -40.0,
        "temp_change_c": 3.0,
        "agri_change_pct": 25.0,
        "ind_change_pct": 12.0,
        "description": "Compound crisis: +10% population, -40% rainfall, +3.0°C temperature, and +25% agricultural requirement."
    }
}

def run_scenario_simulation(
    reservoir_name: str,
    reservoir_info: Dict[str, Any],
    scenario_preset: str = "Custom",
    pop_delta_pct: float = 0.0,
    rain_delta_pct: float = 0.0,
    temp_delta_c: float = 0.0,
    agri_delta_pct: float = 0.0,
    ind_delta_pct: float = 0.0
) -> Dict[str, Any]:
    # Resolve preset parameters
    if scenario_preset in PREDEFINED_SCENARIOS:
        params = PREDEFINED_SCENARIOS[scenario_preset]
        pop_p = params["pop_change_pct"]
        rain_p = params["rain_change_pct"]
        temp_c = params["temp_change_c"]
        agri_p = params["agri_change_pct"]
        ind_p = params["ind_change_pct"]
        scen_name = scenario_preset
    else:
        pop_p = pop_delta_pct
        rain_p = rain_delta_pct
        temp_c = temp_delta_c
        agri_p = agri_delta_pct
        ind_p = ind_delta_pct
        scen_name = "Custom Scenario"

    base_pop = float(reservoir_info.get("base_population", 2500000.0))
    base_rain = 120.0
    base_temp = 28.5
    base_agri = float(reservoir_info.get("base_agri_area_ha", 120000.0))
    base_ind = 60.0
    cap = float(reservoir_info.get("capacity_mcm", 2500.0))
    cur_storage = float(reservoir_info.get("current_storage_mcm", 1500.0))
    state = reservoir_info.get("state", "Tamil Nadu")

    # 1. Baseline Run (0% change)
    base_payload = {
        "state": state,
        "reservoir": reservoir_name,
        "population": base_pop,
        "rainfall_mm": base_rain,
        "temperature_c": base_temp,
        "agricultural_area_ha": base_agri,
        "industrial_demand_mcm": base_ind,
        "reservoir_capacity_mcm": cap,
        "current_storage_mcm": cur_storage,
        "month": 7
    }
    baseline_result = predict_single(base_payload)

    # 2. Scenario Run (altered inputs passed into the ML model)
    scen_payload = {
        "state": state,
        "reservoir": reservoir_name,
        "population": max(10000.0, base_pop * (1.0 + pop_p / 100.0)),
        "rainfall_mm": max(0.0, base_rain * (1.0 + rain_p / 100.0)),
        "temperature_c": base_temp + temp_c,  # Temperature uses °C change, not %
        "agricultural_area_ha": max(1000.0, base_agri * (1.0 + agri_p / 100.0)),
        "industrial_demand_mcm": max(1.0, base_ind * (1.0 + ind_p / 100.0)),
        "reservoir_capacity_mcm": cap,
        "current_storage_mcm": cur_storage,
        "month": 7
    }
    scenario_result = predict_single(scen_payload)

    # Deltas
    b_dem = baseline_result["predicted_demand_mcm"]
    s_dem = scenario_result["predicted_demand_mcm"]
    dem_delta_pct = round(((s_dem - b_dem) / max(1.0, b_dem)) * 100.0, 1)

    b_st = baseline_result["future_storage_mcm"]
    s_st = scenario_result["future_storage_mcm"]
    st_delta_pct = round(((s_st - b_st) / max(1.0, b_st)) * 100.0, 1)

    risk_delta = round(scenario_result["risk_score"] - baseline_result["risk_score"], 1)

    # Interpretation
    if s_dem > b_dem and s_st < b_st:
        interpretation = (
            f"Under {scen_name}, water demand surges by {dem_delta_pct}% to {s_dem} MCM while reservoir storage drops "
            f"by {abs(st_delta_pct)}% to {s_st} MCM ({scenario_result['storage_percentage']}% of capacity). "
            f"Risk index escalated from {baseline_result['risk_level']} ({baseline_result['risk_score']}) to "
            f"{scenario_result['risk_level']} ({scenario_result['risk_score']})."
        )
    elif s_st > b_st:
        interpretation = (
            f"Under {scen_name}, enhanced precipitation increases projected reservoir storage by {st_delta_pct}% to {s_st} MCM. "
            f"Storage reaches {scenario_result['storage_percentage']}%, shifting risk index to {scenario_result['risk_level']}."
        )
    else:
        interpretation = (
            f"Under {scen_name}, projected demand is {s_dem} MCM (delta {dem_delta_pct}%) with storage at {s_st} MCM. "
            f"Risk profile remains at {scenario_result['risk_level']} ({scenario_result['risk_score']}/100)."
        )

    return {
        "scenario_name": scen_name,
        "reservoir_name": reservoir_name,
        "inputs": {
            "population_change_pct": pop_p,
            "rainfall_change_pct": rain_p,
            "temperature_change_c": temp_c,
            "agricultural_demand_change_pct": agri_p,
            "industrial_demand_change_pct": ind_p
        },
        "baseline": {
            "demand_mcm": b_dem,
            "storage_mcm": b_st,
            "storage_percentage": baseline_result["storage_percentage"],
            "risk_score": baseline_result["risk_score"],
            "risk_level": baseline_result["risk_level"]
        },
        "scenario": {
            "demand_mcm": s_dem,
            "storage_mcm": s_st,
            "storage_percentage": scenario_result["storage_percentage"],
            "risk_score": scenario_result["risk_score"],
            "risk_level": scenario_result["risk_level"]
        },
        "demand_delta_pct": dem_delta_pct,
        "storage_delta_pct": st_delta_pct,
        "risk_delta_score": risk_delta,
        "ai_interpretation": interpretation,
        "recommendations": scenario_result["recommendations"]
    }
