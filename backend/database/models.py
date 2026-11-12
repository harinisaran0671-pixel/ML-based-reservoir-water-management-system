"""
AquaPredict AI - SQLAlchemy Database Models
Database: database/water_management.db
"""

from datetime import datetime
from sqlalchemy import Column, Integer, Float, String, DateTime, Text, Boolean
from sqlalchemy.orm import declarative_base

Base = declarative_base()

class Reservoir(Base):
    __tablename__ = "reservoirs"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, index=True, nullable=False)
    state = Column(String(50), index=True, nullable=False)
    district = Column(String(50), nullable=False)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    capacity_mcm = Column(Float, nullable=False)
    current_storage_mcm = Column(Float, nullable=False)
    dead_storage_mcm = Column(Float, nullable=False, default=0.0)
    purpose = Column(String(100), default="Irrigation & Drinking Water")
    base_population = Column(Float, default=2500000.0)
    base_agri_area_ha = Column(Float, default=120000.0)
    current_demand_mcm = Column(Float, default=450.0)
    risk_level = Column(String(20), default="MEDIUM")
    risk_score = Column(Float, default=45.0)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class HistoricalRecord(Base):
    __tablename__ = "historical_water_demand"

    id = Column(Integer, primary_key=True, index=True)
    date = Column(String(20), index=True, nullable=False)
    state = Column(String(50), index=True, nullable=False)
    district = Column(String(50), nullable=False)
    reservoir_name = Column(String(100), index=True, nullable=False)
    population = Column(Float, nullable=False)
    rainfall_mm = Column(Float, nullable=False)
    temperature_c = Column(Float, nullable=False)
    agricultural_area_ha = Column(Float, nullable=False)
    domestic_demand_mcm = Column(Float, nullable=False)
    industrial_demand_mcm = Column(Float, nullable=False)
    agricultural_demand_mcm = Column(Float, nullable=False)
    ecological_demand_mcm = Column(Float, nullable=False)
    total_water_demand_mcm = Column(Float, nullable=False)
    reservoir_capacity_mcm = Column(Float, nullable=False)
    current_storage_mcm = Column(Float, nullable=False)
    inflow_mcm = Column(Float, nullable=False)
    outflow_mcm = Column(Float, nullable=False)
    evaporation_mcm = Column(Float, nullable=False)
    storage_percentage = Column(Float, nullable=False)
    drought_index = Column(Float, nullable=False)
    season = Column(String(30), nullable=False)
    extreme_weather_event = Column(String(50), default="Normal")
    data_type = Column(String(30), default="DEMO/SYNTHETIC")

class PredictionLog(Base):
    __tablename__ = "predictions"

    id = Column(Integer, primary_key=True, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    state = Column(String(50), nullable=False)
    reservoir = Column(String(100), nullable=False)
    forecast_months = Column(Integer, default=12)
    predicted_demand_mcm = Column(Float, nullable=False)
    future_storage_mcm = Column(Float, nullable=False)
    storage_percentage = Column(Float, nullable=False)
    risk_score = Column(Float, nullable=False)
    risk_level = Column(String(20), nullable=False)
    recommendations_json = Column(Text, nullable=True)

class ScenarioLog(Base):
    __tablename__ = "scenarios"

    id = Column(Integer, primary_key=True, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    scenario_name = Column(String(100), nullable=False)
    reservoir = Column(String(100), nullable=False)
    population_change_pct = Column(Float, default=0.0)
    rainfall_change_pct = Column(Float, default=0.0)
    temperature_change_c = Column(Float, default=0.0)
    agricultural_change_pct = Column(Float, default=0.0)
    industrial_change_pct = Column(Float, default=0.0)
    baseline_demand = Column(Float, nullable=False)
    scenario_demand = Column(Float, nullable=False)
    baseline_storage = Column(Float, nullable=False)
    scenario_storage = Column(Float, nullable=False)
    risk_level = Column(String(20), nullable=False)
    risk_score = Column(Float, nullable=False)

class ModelMetricRecord(Base):
    __tablename__ = "model_metrics"

    id = Column(Integer, primary_key=True, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    model_name = Column(String(50), nullable=False)
    validation_rmse = Column(Float, nullable=False)
    test_r2 = Column(Float, nullable=False)
    test_mape = Column(Float, nullable=False)
    metrics_json = Column(Text, nullable=False)
