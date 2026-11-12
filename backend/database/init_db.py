"""
AquaPredict AI - Database Initialization & Seed Script
Populates reservoirs and historical records from CSV.
"""

import os
import pandas as pd
from backend.database.database import engine, SessionLocal
from backend.database.models import Base, Reservoir, HistoricalRecord
from data.generate_dataset import RESERVOIRS, generate_records

def init_db(csv_path: str = "data/water_demand_reservoir_dataset.csv"):
    print("Creating database schema...")
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        # Check if reservoirs already seeded
        res_count = db.query(Reservoir).count()
        if res_count == 0:
            print("Seeding 14 reservoirs...")
            # Approximate current storage & demand defaults
            defaults = {
                "Bhavanisagar": (650.0, 410.0, "LOW", 24.0),
                "Mettur": (1890.0, 680.0, "LOW", 28.0),
                "Vaigai": (95.0, 110.0, "HIGH", 64.0),
                "Krishna Raja Sagara": (880.0, 520.0, "MEDIUM", 42.0),
                "Tungabhadra": (1750.0, 780.0, "MEDIUM", 48.0),
                "Almatti": (2100.0, 890.0, "LOW", 32.0),
                "Idukki": (1420.0, 290.0, "LOW", 18.0),
                "Malampuzha": (115.0, 85.0, "MEDIUM", 40.0),
                "Srisailam": (3800.0, 1150.0, "MEDIUM", 46.0),
                "Nagarjuna Sagar": (6200.0, 1920.0, "MEDIUM", 44.0),
                "Singur": (310.0, 240.0, "HIGH", 68.0),
                "Sriram Sagar": (1650.0, 820.0, "MEDIUM", 50.0),
                "Koyna": (2150.0, 610.0, "LOW", 22.0),
                "Jayakwadi": (1240.0, 910.0, "HIGH", 62.0),
            }

            for r in RESERVOIRS:
                cur_st, cur_dem, r_lvl, r_score = defaults.get(r["name"], (r["capacity_mcm"] * 0.6, 400.0, "MEDIUM", 45.0))
                reservoir_obj = Reservoir(
                    name=r["name"],
                    state=r["state"],
                    district=r["district"],
                    latitude=r["lat"],
                    longitude=r["lon"],
                    capacity_mcm=r["capacity_mcm"],
                    current_storage_mcm=cur_st,
                    dead_storage_mcm=round(r["capacity_mcm"] * 0.05, 2),
                    purpose="Irrigation & Drinking Water",
                    base_population=r["base_pop"],
                    base_agri_area_ha=r["base_agri_ha"],
                    current_demand_mcm=cur_dem,
                    risk_level=r_lvl,
                    risk_score=r_score
                )
                db.add(reservoir_obj)
            db.commit()
            print("14 reservoirs successfully seeded.")

        # Seed historical records from CSV
        hist_count = db.query(HistoricalRecord).count()
        if hist_count == 0:
            if not os.path.exists(csv_path):
                print(f"CSV not found at {csv_path}. Generating dataset first...")
                os.makedirs(os.path.dirname(csv_path), exist_ok=True)
                df_gen = generate_records(3659)
                df_gen.to_csv(csv_path, index=False)

            print(f"Seeding historical records from {csv_path}...")
            df = pd.read_csv(csv_path)

            records = []
            for _, row in df.iterrows():
                rec = HistoricalRecord(
                    date=str(row["date"]),
                    state=str(row["state"]),
                    district=str(row["district"]),
                    reservoir_name=str(row["reservoir_name"]),
                    population=float(row["population"]),
                    rainfall_mm=float(row["rainfall_mm"]),
                    temperature_c=float(row["temperature_c"]),
                    agricultural_area_ha=float(row["agricultural_area_ha"]),
                    domestic_demand_mcm=float(row["domestic_demand_mcm"]),
                    industrial_demand_mcm=float(row["industrial_demand_mcm"]),
                    agricultural_demand_mcm=float(row["agricultural_demand_mcm"]),
                    ecological_demand_mcm=float(row["ecological_demand_mcm"]),
                    total_water_demand_mcm=float(row["total_water_demand_mcm"]),
                    reservoir_capacity_mcm=float(row["reservoir_capacity_mcm"]),
                    current_storage_mcm=float(row["current_storage_mcm"]),
                    inflow_mcm=float(row["inflow_mcm"]),
                    outflow_mcm=float(row["outflow_mcm"]),
                    evaporation_mcm=float(row["evaporation_mcm"]),
                    storage_percentage=float(row["storage_percentage"]),
                    drought_index=float(row["drought_index"]),
                    season=str(row["season"]),
                    extreme_weather_event=str(row["extreme_weather_event"]),
                    data_type=str(row["data_type"])
                )
                records.append(rec)
                if len(records) >= 1000:
                    db.bulk_save_objects(records)
                    db.commit()
                    records = []

            if records:
                db.bulk_save_objects(records)
                db.commit()

            total_seeded = db.query(HistoricalRecord).count()
            print(f"Successfully seeded {total_seeded} historical records.")

    finally:
        db.close()

if __name__ == "__main__":
    init_db()
