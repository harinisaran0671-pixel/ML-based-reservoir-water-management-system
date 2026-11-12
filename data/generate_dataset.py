"""
AquaPredict AI - Synthetic Dataset Generator
SIH1692: Forecasting Future Water Requirements and Assessing Storage Capacities in Reservoirs

Generates 3,659 synthetic monthly records across 14 reservoirs in 6 Indian states.
All data is explicitly labeled as DEMO/SYNTHETIC.
"""

import os
import random
import numpy as np
import pandas as pd
from datetime import datetime

# 14 Reservoirs across 6 Indian states
RESERVOIRS = [
    {"name": "Bhavanisagar", "state": "Tamil Nadu", "district": "Erode", "capacity_mcm": 928.0, "lat": 11.47, "lon": 77.14, "base_pop": 2250000, "base_agri_ha": 105000},
    {"name": "Mettur", "state": "Tamil Nadu", "district": "Salem", "capacity_mcm": 2700.0, "lat": 11.80, "lon": 77.80, "base_pop": 3480000, "base_agri_ha": 175000},
    {"name": "Vaigai", "state": "Tamil Nadu", "district": "Theni", "capacity_mcm": 194.0, "lat": 10.05, "lon": 77.58, "base_pop": 1240000, "base_agri_ha": 45000},
    {"name": "Krishna Raja Sagara", "state": "Karnataka", "district": "Mandya", "capacity_mcm": 1400.0, "lat": 12.53, "lon": 76.57, "base_pop": 1920000, "base_agri_ha": 120000},
    {"name": "Tungabhadra", "state": "Karnataka", "district": "Ballari", "capacity_mcm": 3200.0, "lat": 15.26, "lon": 76.34, "base_pop": 2550000, "base_agri_ha": 210000},
    {"name": "Almatti", "state": "Karnataka", "district": "Vijayapura", "capacity_mcm": 3450.0, "lat": 16.33, "lon": 75.88, "base_pop": 2180000, "base_agri_ha": 240000},
    {"name": "Idukki", "state": "Kerala", "district": "Idukki", "capacity_mcm": 1996.0, "lat": 9.85, "lon": 76.97, "base_pop": 1110000, "base_agri_ha": 48000},
    {"name": "Malampuzha", "state": "Kerala", "district": "Palakkad", "capacity_mcm": 226.0, "lat": 10.83, "lon": 76.68, "base_pop": 850000, "base_agri_ha": 35000},
    {"name": "Srisailam", "state": "Andhra Pradesh", "district": "Kurnool", "capacity_mcm": 6100.0, "lat": 16.08, "lon": 78.89, "base_pop": 4100000, "base_agri_ha": 310000},
    {"name": "Nagarjuna Sagar", "state": "Andhra Pradesh", "district": "Guntur", "capacity_mcm": 11470.0, "lat": 16.57, "lon": 79.31, "base_pop": 5300000, "base_agri_ha": 420000},
    {"name": "Singur", "state": "Telangana", "district": "Sangareddy", "capacity_mcm": 840.0, "lat": 17.75, "lon": 77.92, "base_pop": 1650000, "base_agri_ha": 82000},
    {"name": "Sriram Sagar", "state": "Telangana", "district": "Nizamabad", "capacity_mcm": 3170.0, "lat": 18.96, "lon": 78.33, "base_pop": 2720000, "base_agri_ha": 220000},
    {"name": "Koyna", "state": "Maharashtra", "district": "Satara", "capacity_mcm": 2980.0, "lat": 17.40, "lon": 73.74, "base_pop": 3100000, "base_agri_ha": 160000},
    {"name": "Jayakwadi", "state": "Maharashtra", "district": "Chhatrapati Sambhajinagar", "capacity_mcm": 2909.0, "lat": 19.48, "lon": 75.39, "base_pop": 3800000, "base_agri_ha": 280000},
]

def get_season(month: int) -> str:
    if month in [6, 7, 8, 9]:
        return "Monsoon"
    elif month in [10, 11]:
        return "Post-Monsoon"
    elif month in [12, 1, 2]:
        return "Winter"
    else:
        return "Summer"

def generate_records(target_count: int = 3659) -> pd.DataFrame:
    np.random.seed(42)
    random.seed(42)

    # Date range: 2002-01 to 2023-09 gives 261 months for 14 reservoirs = 3654
    # To reach exactly 3659, 5 reservoirs get one extra month (2023-10)
    dates_261 = pd.date_range(start="2002-01-01", periods=261, freq="MS")
    extra_date = pd.Timestamp("2023-10-01")

    records = []

    for r_idx, res in enumerate(RESERVOIRS):
        # Determine number of dates for this reservoir to sum exactly to 3659
        num_months = 262 if r_idx < 5 else 261
        res_dates = list(dates_261) + ([extra_date] if num_months == 262 else [])

        cap = res["capacity_mcm"]
        curr_storage = cap * random.uniform(0.65, 0.85)

        for d in res_dates:
            year = d.year
            month = d.month
            season = get_season(month)

            # Population growth (~1.2% per year from 2002)
            years_elapsed = year - 2002 + (month - 1) / 12.0
            pop = int(res["base_pop"] * (1.0 + 0.0125 * years_elapsed) * np.random.normal(1.0, 0.005))

            # Seasonal Climate
            # Monsoon vs Summer rainfall
            if season == "Monsoon":
                mean_rain = 220 if res["state"] in ["Kerala", "Maharashtra"] else 150
                temp_c = round(np.random.normal(26.5, 1.8), 1)
            elif season == "Post-Monsoon":
                mean_rain = 130 if res["state"] == "Tamil Nadu" else 60
                temp_c = round(np.random.normal(27.0, 1.5), 1)
            elif season == "Winter":
                mean_rain = 15
                temp_c = round(np.random.normal(22.0, 2.0), 1)
            else:  # Summer
                mean_rain = 35
                temp_c = round(np.random.normal(35.0, 2.2), 1)

            rainfall_mm = max(0.0, round(float(np.random.gamma(shape=2.5, scale=mean_rain / 2.5)), 1))

            # Agricultural area
            agri_area = int(res["base_agri_ha"] * (1.0 + 0.003 * years_elapsed) * np.random.normal(1.0, 0.02))

            # Demand components (MCM)
            # Domestic: ~135-150 LPCD -> pop * 140 * 30 days / 1e9 * 1e6
            lpcd = 145 + (1.2 if season == "Summer" else -0.5)
            domestic_mcm = round((pop * lpcd * 30.4) / 1e9, 2)

            # Agricultural demand: high in winter/summer (rabi/zaid crops) when rainfall is low
            if season in ["Winter", "Summer"]:
                agri_factor = 0.0028 * (1.0 + (35 - min(35, rainfall_mm)) / 100.0)
            elif season == "Monsoon":
                agri_factor = 0.0011 * (1.0 - min(0.6, rainfall_mm / 300.0))
            else:
                agri_factor = 0.0018
            agri_mcm = round(agri_area * agri_factor * np.random.normal(1.0, 0.04), 2)

            # Industrial demand
            ind_base = (res["base_pop"] / 2500000.0) * 45.0
            ind_mcm = round(ind_base * (1.0 + 0.015 * years_elapsed) * np.random.normal(1.0, 0.03), 2)

            # Ecological demand
            eco_mcm = round(cap * 0.015 * np.random.normal(1.0, 0.02), 2)

            total_demand = round(domestic_mcm + agri_mcm + ind_mcm + eco_mcm, 2)

            # Inflow (dependent on rainfall and season)
            inflow_factor = 1.8 if res["state"] in ["Kerala", "Maharashtra"] else 1.2
            inflow_mcm = round(max(5.0, (rainfall_mm * inflow_factor * (cap / 1500.0)) * np.random.normal(1.0, 0.15)), 2)

            # Evaporation
            evap_rate = 0.045 if season == "Summer" else (0.02 if season == "Winter" else 0.03)
            evap_mcm = round((curr_storage * evap_rate) * (temp_c / 28.0), 2)

            # Outflow
            outflow_mcm = round(min(curr_storage + inflow_mcm - evap_mcm, total_demand * 0.95), 2)
            if outflow_mcm < 0:
                outflow_mcm = 0.0

            # Water balance update
            future_storage = max(cap * 0.05, min(cap, curr_storage + inflow_mcm - total_demand - evap_mcm))
            curr_storage = future_storage
            storage_pct = round((curr_storage / cap) * 100.0, 1)

            # Drought index (SPI like, from -2.5 to +2.5)
            drought_idx = round(np.clip((rainfall_mm - mean_rain) / (mean_rain * 0.6 + 1.0), -2.5, 2.5), 2)

            # Extreme weather
            if rainfall_mm > mean_rain * 2.8 and season == "Monsoon":
                extreme_event = "Flood Watch"
            elif drought_idx < -1.6:
                extreme_event = "Severe Drought"
            elif temp_c > 39.5:
                extreme_event = "Heatwave"
            else:
                extreme_event = "Normal"

            records.append({
                "date": d.strftime("%Y-%m-%d"),
                "state": res["state"],
                "district": res["district"],
                "reservoir_name": res["name"],
                "population": pop,
                "rainfall_mm": rainfall_mm,
                "temperature_c": temp_c,
                "agricultural_area_ha": agri_area,
                "domestic_demand_mcm": domestic_mcm,
                "industrial_demand_mcm": ind_mcm,
                "agricultural_demand_mcm": agri_mcm,
                "ecological_demand_mcm": eco_mcm,
                "total_water_demand_mcm": total_demand,
                "reservoir_capacity_mcm": cap,
                "current_storage_mcm": round(curr_storage, 2),
                "inflow_mcm": inflow_mcm,
                "outflow_mcm": outflow_mcm,
                "evaporation_mcm": evap_mcm,
                "storage_percentage": storage_pct,
                "drought_index": drought_idx,
                "season": season,
                "extreme_weather_event": extreme_event,
                "data_type": "DEMO/SYNTHETIC"
            })

    df = pd.DataFrame(records)
    df = df.sort_values(by=["date", "reservoir_name"]).reset_index(drop=True)
    return df[:target_count]

if __name__ == "__main__":
    out_dir = os.path.join(os.path.dirname(__file__), "..", "data")
    os.makedirs(out_dir, exist_ok=True)
    out_path = os.path.join(out_dir, "water_demand_reservoir_dataset.csv")

    df = generate_records(3659)
    df.to_csv(out_path, index=False)
    print(f"Generated {len(df)} records saved to {out_path}")
    print(f"Unique reservoirs: {df['reservoir_name'].nunique()}")
    print(f"Unique states: {df['state'].nunique()}")
    print(f"Date range: {df['date'].min()} to {df['date'].max()}")
