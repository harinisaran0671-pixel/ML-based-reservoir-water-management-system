"""
AquaPredict AI - Pydantic Request & Response Schemas
"""

from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field

class ReservoirItem(BaseModel):
    id: int
    name: str
    state: str
    district: str
    latitude: float
    longitude: float
    capacity_mcm: float
    current_storage_mcm: float
    dead_storage_mcm: float
    purpose: str
    base_population: float
    base_agri_area_ha: float
    current_demand_mcm: float
    storage_percentage: float
    risk_level: str
    risk_score: float

class PredictionRequest(BaseModel):
    state: str = Field(..., json_schema_extra={"example": "Tamil Nadu"})
    reservoir: str = Field(..., json_schema_extra={"example": "Bhavanisagar"})
    population: float = Field(2500000.0, ge=1000)
    rainfall_mm: float = Field(120.0, ge=0)
    temperature_c: float = Field(28.0)
    agricultural_area_ha: float = Field(120000.0, ge=0)
    industrial_demand_mcm: float = Field(60.0, ge=0)
    reservoir_capacity_mcm: float = Field(928.0, gt=0)
    current_storage_mcm: float = Field(650.0, ge=0)
    forecast_months: Optional[int] = Field(12, ge=1, le=60)
    month: Optional[int] = Field(7, ge=1, le=12)
    previous_total_demand: Optional[float] = Field(420.0, ge=0)

class PredictionResponse(BaseModel):
    state: str
    reservoir: str
    month: int
    season: str
    predicted_demand_mcm: float
    predicted_inflow_mcm: float
    evaporation_mcm: float
    future_storage_mcm: float
    storage_percentage: float
    dead_storage_mcm: float
    capacity_mcm: float
    risk_score: float
    risk_level: str
    factors: List[Dict[str, Any]]
    main_risk_factors: List[str]
    recommendations: List[str]

class MonthlyForecastItem(BaseModel):
    step: int
    month_label: str
    month: int
    season: str
    predicted_demand_mcm: float
    predicted_inflow_mcm: float
    evaporation_mcm: float
    predicted_storage_mcm: float
    storage_percentage: float
    risk_score: float
    risk_level: str

class ForecastResponse(BaseModel):
    reservoir: str
    state: str
    capacity_mcm: float
    horizon_months: int
    average_predicted_demand_mcm: float
    end_storage_mcm: float
    end_storage_percentage: float
    peak_risk_month: str
    peak_risk_level: str
    peak_risk_score: float
    overall_risk_score: float
    overall_risk_level: str
    factors: List[Dict[str, Any]]
    main_risk_factors: List[str]
    recommendations: List[str]
    monthly_forecast: List[MonthlyForecastItem]

class StorageAssessmentRequest(BaseModel):
    reservoir_name: str
    current_storage_mcm: float
    reservoir_capacity_mcm: float
    inflow_mcm: float
    domestic_demand_mcm: float
    agricultural_demand_mcm: float
    industrial_demand_mcm: float
    ecological_requirement_mcm: float
    evaporation_mcm: float

class StorageAssessmentResponse(BaseModel):
    reservoir_name: str
    current_storage_mcm: float
    capacity_mcm: float
    current_storage_percentage: float
    total_inflow_mcm: float
    total_outflow_mcm: float
    net_storage_change_mcm: float
    future_storage_mcm: float
    future_storage_percentage: float
    storage_gap_mcm: float
    risk_level: str
    water_balance_breakdown: Dict[str, float]

class RiskFactor(BaseModel):
    name: str
    score: float
    weight: str

class RiskAnalysisResponse(BaseModel):
    reservoir_name: str
    risk_score: float
    risk_level: str
    storage_percentage: float
    factors: List[RiskFactor]
    main_risk_factors: List[str]
    recommended_actions: List[str]

class ScenarioRequest(BaseModel):
    reservoir_name: str
    scenario_preset: Optional[str] = "Custom"
    population_change_pct: float = Field(0.0)
    rainfall_change_pct: float = Field(0.0)
    temperature_change_c: float = Field(0.0)
    agricultural_demand_change_pct: float = Field(0.0)
    industrial_demand_change_pct: float = Field(0.0)

class ScenarioMetric(BaseModel):
    demand_mcm: float
    storage_mcm: float
    storage_percentage: float
    risk_score: float
    risk_level: str

class ScenarioResponse(BaseModel):
    scenario_name: str
    reservoir_name: str
    inputs: Dict[str, float]
    baseline: ScenarioMetric
    scenario: ScenarioMetric
    demand_delta_pct: float
    storage_delta_pct: float
    risk_delta_score: float
    ai_interpretation: str
    recommendations: List[str]

class DashboardData(BaseModel):
    total_reservoirs: int
    current_average_storage_pct: float
    total_storage_mcm: float
    total_capacity_mcm: float
    current_water_demand_mcm: float
    predicted_water_demand_mcm: float
    overall_risk_level: str
    forecast_horizon: str
    selected_reservoir: Optional[ReservoirItem]
    reservoirs: List[ReservoirItem]
    historical_trend: List[Dict[str, Any]]
    demand_by_sector: List[Dict[str, Any]]
    storage_trends: List[Dict[str, Any]]
    risk_distribution: List[Dict[str, Any]]
    rainfall_vs_storage: List[Dict[str, Any]]
    population_vs_demand: List[Dict[str, Any]]
    recommendations: List[str]

class CSVValidationResponse(BaseModel):
    success: bool
    filename: str
    total_records: int
    valid_records: int
    error_count: int
    errors: List[str]
    sample_preview: List[Dict[str, Any]]

class ReportRequest(BaseModel):
    reservoir_name: str
    forecast_horizon_months: int = 12
    scenario_name: Optional[str] = "Normal Conditions"
    notes: Optional[str] = ""

class ReportResponse(BaseModel):
    report_id: str
    reservoir_name: str
    generated_at: str
    pdf_filename: str
    download_url: str
    status: str
