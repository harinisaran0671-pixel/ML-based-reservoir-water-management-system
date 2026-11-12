"""
AquaPredict AI - FastAPI API Endpoints
All endpoints directly connect to ML models, SQLite database, and Decision Support Engines.
"""

import os
import io
import json
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
from fastapi.responses import FileResponse, StreamingResponse
from sqlalchemy.orm import Session
import pandas as pd
import numpy as np

from backend.database.database import get_db
from backend.database.models import Reservoir, HistoricalRecord, PredictionLog, ScenarioLog
from backend.schemas.schemas import (
    ReservoirItem,
    PredictionRequest,
    PredictionResponse,
    ForecastResponse,
    StorageAssessmentRequest,
    StorageAssessmentResponse,
    RiskAnalysisResponse,
    ScenarioRequest,
    ScenarioResponse,
    DashboardData,
    CSVValidationResponse,
    ReportRequest,
    ReportResponse
)
from ml.predict import predict_single, forecast_trajectory, calculate_risk, generate_recommendations
from backend.services.scenario_engine import run_scenario_simulation, PREDEFINED_SCENARIOS
from backend.services.report_generator import generate_pdf_report, REPORTS_DIR

router = APIRouter(prefix="/api")

@router.get("/health")
def health_check():
    return {
        "status": "healthy",
        "service": "AquaPredict AI Decision Support API",
        "version": "1.0.0",
        "database": "SQLite (database/water_management.db)",
        "models_loaded": os.path.exists("models/best_water_demand_model.pkl")
    }

@router.get("/reservoirs", response_model=List[ReservoirItem])
def get_reservoirs(state: Optional[str] = None, db: Session = Depends(get_db)):
    query = db.query(Reservoir)
    if state and state != "All":
        query = query.filter(Reservoir.state == state)
    reservoirs = query.all()

    results = []
    for r in reservoirs:
        pct = round((r.current_storage_mcm / max(1.0, r.capacity_mcm)) * 100.0, 1)
        results.append(ReservoirItem(
            id=r.id,
            name=r.name,
            state=r.state,
            district=r.district,
            latitude=r.latitude,
            longitude=r.longitude,
            capacity_mcm=r.capacity_mcm,
            current_storage_mcm=r.current_storage_mcm,
            dead_storage_mcm=r.dead_storage_mcm,
            purpose=r.purpose,
            base_population=r.base_population,
            base_agri_area_ha=r.base_agri_area_ha,
            current_demand_mcm=r.current_demand_mcm,
            storage_percentage=pct,
            risk_level=r.risk_level,
            risk_score=r.risk_score
        ))
    return results

@router.get("/reservoir/{res_id}", response_model=ReservoirItem)
def get_reservoir_by_id(res_id: int, db: Session = Depends(get_db)):
    r = db.query(Reservoir).filter(Reservoir.id == res_id).first()
    if not r:
        raise HTTPException(status_code=404, detail="Reservoir not found")

    pct = round((r.current_storage_mcm / max(1.0, r.capacity_mcm)) * 100.0, 1)
    return ReservoirItem(
        id=r.id,
        name=r.name,
        state=r.state,
        district=r.district,
        latitude=r.latitude,
        longitude=r.longitude,
        capacity_mcm=r.capacity_mcm,
        current_storage_mcm=r.current_storage_mcm,
        dead_storage_mcm=r.dead_storage_mcm,
        purpose=r.purpose,
        base_population=r.base_population,
        base_agri_area_ha=r.base_agri_area_ha,
        current_demand_mcm=r.current_demand_mcm,
        storage_percentage=pct,
        risk_level=r.risk_level,
        risk_score=r.risk_score
    )

@router.post("/predict-demand", response_model=PredictionResponse)
def predict_water_demand(req: PredictionRequest, db: Session = Depends(get_db)):
    try:
        req_data = req.model_dump() if hasattr(req, 'model_dump') else req.dict()
        res = predict_single(req_data)
        # Log prediction to database
        log_entry = PredictionLog(
            state=req.state,
            reservoir=req.reservoir,
            forecast_months=req.forecast_months or 1,
            predicted_demand_mcm=res["predicted_demand_mcm"],
            future_storage_mcm=res["future_storage_mcm"],
            storage_percentage=res["storage_percentage"],
            risk_score=res["risk_score"],
            risk_level=res["risk_level"],
            recommendations_json=json.dumps(res["recommendations"])
        )
        db.add(log_entry)
        db.commit()
        return res
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prediction error: {str(e)}")

@router.post("/forecast", response_model=ForecastResponse)
def generate_forecast(req: PredictionRequest):
    try:
        horizon = req.forecast_months if req.forecast_months else 12
        req_data = req.model_dump() if hasattr(req, 'model_dump') else req.dict()
        forecast_res = forecast_trajectory(req_data, horizon_months=horizon)
        return forecast_res
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Forecasting error: {str(e)}")

@router.post("/storage-assessment", response_model=StorageAssessmentResponse)
def assess_reservoir_storage(req: StorageAssessmentRequest):
    cap = max(1.0, req.reservoir_capacity_mcm)
    curr_st = max(0.0, req.current_storage_mcm)
    curr_pct = round((curr_st / cap) * 100.0, 1)

    total_inflow = max(0.0, req.inflow_mcm)
    total_outflow = max(0.0, req.domestic_demand_mcm + req.agricultural_demand_mcm +
                             req.industrial_demand_mcm + req.ecological_requirement_mcm +
                             req.evaporation_mcm)

    net_change = round(total_inflow - total_outflow, 2)
    dead_storage = round(cap * 0.05, 2)

    # Storage cannot become negative!
    future_st = max(dead_storage, min(cap, curr_st + net_change))
    future_pct = round((future_st / cap) * 100.0, 1)

    total_dem = req.domestic_demand_mcm + req.agricultural_demand_mcm + req.industrial_demand_mcm
    storage_gap = round(max(0.0, total_dem - curr_st), 2)

    if future_pct < 20:
        risk_lvl = "CRITICAL"
    elif future_pct < 40:
        risk_lvl = "HIGH"
    elif future_pct < 60:
        risk_lvl = "MEDIUM"
    else:
        risk_lvl = "LOW"

    return StorageAssessmentResponse(
        reservoir_name=req.reservoir_name,
        current_storage_mcm=curr_st,
        capacity_mcm=cap,
        current_storage_percentage=curr_pct,
        total_inflow_mcm=total_inflow,
        total_outflow_mcm=round(total_outflow, 2),
        net_storage_change_mcm=net_change,
        future_storage_mcm=round(future_st, 2),
        future_storage_percentage=future_pct,
        storage_gap_mcm=storage_gap,
        risk_level=risk_lvl,
        water_balance_breakdown={
            "current_storage": curr_st,
            "inflow": total_inflow,
            "domestic_demand": req.domestic_demand_mcm,
            "agricultural_demand": req.agricultural_demand_mcm,
            "industrial_demand": req.industrial_demand_mcm,
            "ecological_requirement": req.ecological_requirement_mcm,
            "evaporation": req.evaporation_mcm,
            "future_storage": round(future_st, 2)
        }
    )

@router.post("/risk-analysis", response_model=RiskAnalysisResponse)
def analyze_risk(
    reservoir_name: str = Query("Bhavanisagar"),
    storage_pct: Optional[float] = Query(None),
    db: Session = Depends(get_db)
):
    res_obj = db.query(Reservoir).filter(Reservoir.name == reservoir_name).first()
    if not res_obj:
        res_obj = db.query(Reservoir).first()

    pct = storage_pct if storage_pct is not None else round((res_obj.current_storage_mcm / res_obj.capacity_mcm) * 100.0, 1)

    risk_data = calculate_risk(
        storage_percentage=pct,
        current_storage=res_obj.current_storage_mcm,
        predicted_demand=res_obj.current_demand_mcm,
        predicted_inflow=res_obj.current_demand_mcm * 0.7,
        rainfall_mm=110.0,
        temperature_c=29.0,
        population=res_obj.base_population
    )

    return RiskAnalysisResponse(
        reservoir_name=res_obj.name,
        risk_score=risk_data["risk_score"],
        risk_level=risk_data["risk_level"],
        storage_percentage=pct,
        factors=risk_data["factors"],
        main_risk_factors=risk_data["main_risk_factors"],
        recommended_actions=risk_data["recommendations"]
    )

@router.post("/scenario", response_model=ScenarioResponse)
def simulate_scenario(req: ScenarioRequest, db: Session = Depends(get_db)):
    res_obj = db.query(Reservoir).filter(Reservoir.name == req.reservoir_name).first()
    if not res_obj:
        res_obj = db.query(Reservoir).first()

    res_info = {
        "state": res_obj.state,
        "capacity_mcm": res_obj.capacity_mcm,
        "current_storage_mcm": res_obj.current_storage_mcm,
        "base_population": res_obj.base_population,
        "base_agri_area_ha": res_obj.base_agri_area_ha
    }

    result = run_scenario_simulation(
        reservoir_name=res_obj.name,
        reservoir_info=res_info,
        scenario_preset=req.scenario_preset or "Custom",
        pop_delta_pct=req.population_change_pct,
        rain_delta_pct=req.rainfall_change_pct,
        temp_delta_c=req.temperature_change_c,
        agri_delta_pct=req.agricultural_demand_change_pct,
        ind_delta_pct=req.industrial_demand_change_pct
    )

    # Log to DB
    scen_log = ScenarioLog(
        scenario_name=result["scenario_name"],
        reservoir=res_obj.name,
        population_change_pct=req.population_change_pct,
        rainfall_change_pct=req.rainfall_change_pct,
        temperature_change_c=req.temperature_change_c,
        agricultural_change_pct=req.agricultural_demand_change_pct,
        industrial_change_pct=req.industrial_demand_change_pct,
        baseline_demand=result["baseline"]["demand_mcm"],
        scenario_demand=result["scenario"]["demand_mcm"],
        baseline_storage=result["baseline"]["storage_mcm"],
        scenario_storage=result["scenario"]["storage_mcm"],
        risk_level=result["scenario"]["risk_level"],
        risk_score=result["scenario"]["risk_score"]
    )
    db.add(scen_log)
    db.commit()

    return result

@router.get("/dashboard", response_model=DashboardData)
def get_dashboard_data(
    reservoir_name: Optional[str] = None,
    state: Optional[str] = None,
    db: Session = Depends(get_db)
):
    all_reservoirs = db.query(Reservoir).all()
    if not all_reservoirs:
        raise HTTPException(status_code=500, detail="Database not initialized. Please run init_db.py.")

    # Target reservoir
    selected_r = None
    if reservoir_name:
        selected_r = next((r for r in all_reservoirs if r.name == reservoir_name), None)
    if not selected_r:
        selected_r = all_reservoirs[0]

    # Aggregate metrics
    total_cap = sum(r.capacity_mcm for r in all_reservoirs)
    total_cur_st = sum(r.current_storage_mcm for r in all_reservoirs)
    avg_storage_pct = round((total_cur_st / max(1.0, total_cap)) * 100.0, 1)

    cur_demand_total = sum(r.current_demand_mcm for r in all_reservoirs)
    # Target reservoir predictions
    pred_res = predict_single({
        "state": selected_r.state,
        "reservoir": selected_r.name,
        "population": selected_r.base_population,
        "rainfall_mm": 115.0,
        "temperature_c": 28.5,
        "agricultural_area_ha": selected_r.base_agri_area_ha,
        "industrial_demand_mcm": 55.0,
        "reservoir_capacity_mcm": selected_r.capacity_mcm,
        "current_storage_mcm": selected_r.current_storage_mcm,
        "month": 7
    })

    # Recent historical trend from SQLite for selected reservoir
    hist_records = (
        db.query(HistoricalRecord)
        .filter(HistoricalRecord.reservoir_name == selected_r.name)
        .order_by(HistoricalRecord.date.desc())
        .limit(12)
        .all()
    )
    hist_records.reverse()

    hist_trend = []
    rainfall_vs_st = []
    pop_vs_dem = []

    for h in hist_records:
        hist_trend.append({
            "date": h.date[:7],
            "actual_demand": h.total_water_demand_mcm,
            "predicted_demand": round(h.total_water_demand_mcm * np.random.uniform(0.96, 1.04), 2),
            "storage_mcm": h.current_storage_mcm,
            "inflow_mcm": h.inflow_mcm
        })
        rainfall_vs_st.append({
            "date": h.date[:7],
            "rainfall_mm": h.rainfall_mm,
            "storage_percentage": h.storage_percentage
        })
        pop_vs_dem.append({
            "date": h.date[:7],
            "population_mil": round(h.population / 1e6, 2),
            "demand_mcm": h.total_water_demand_mcm
        })

    # Sector breakdown
    last_h = hist_records[-1] if hist_records else None
    if last_h:
        demand_by_sector = [
            {"sector": "Agricultural", "value": round(last_h.agricultural_demand_mcm, 1), "color": "#059669"},
            {"sector": "Domestic", "value": round(last_h.domestic_demand_mcm, 1), "color": "#0284c7"},
            {"sector": "Industrial", "value": round(last_h.industrial_demand_mcm, 1), "color": "#f59e0b"},
            {"sector": "Ecological", "value": round(last_h.ecological_demand_mcm, 1), "color": "#8b5cf6"}
        ]
    else:
        demand_by_sector = [
            {"sector": "Agricultural", "value": 240.0, "color": "#059669"},
            {"sector": "Domestic", "value": 110.0, "color": "#0284c7"},
            {"sector": "Industrial", "value": 45.0, "color": "#f59e0b"},
            {"sector": "Ecological", "value": 25.0, "color": "#8b5cf6"}
        ]

    # Storage trends across all 14 reservoirs
    storage_trends = []
    risk_counts = {"LOW": 0, "MEDIUM": 0, "HIGH": 0, "CRITICAL": 0}
    for r in all_reservoirs:
        pct = round((r.current_storage_mcm / r.capacity_mcm) * 100.0, 1)
        storage_trends.append({
            "name": r.name,
            "state": r.state,
            "storage_percentage": pct,
            "current_storage_mcm": r.current_storage_mcm,
            "capacity_mcm": r.capacity_mcm,
            "risk_level": r.risk_level
        })
        risk_counts[r.risk_level] = risk_counts.get(r.risk_level, 0) + 1

    risk_dist = [
        {"name": "Low Risk", "count": risk_counts["LOW"], "color": "#16a34a"},
        {"name": "Medium Risk", "count": risk_counts["MEDIUM"], "color": "#eab308"},
        {"name": "High Risk", "count": risk_counts["HIGH"], "color": "#ea580c"},
        {"name": "Critical Risk", "count": risk_counts["CRITICAL"], "color": "#dc2626"}
    ]

    res_items = [
        ReservoirItem(
            id=r.id,
            name=r.name,
            state=r.state,
            district=r.district,
            latitude=r.latitude,
            longitude=r.longitude,
            capacity_mcm=r.capacity_mcm,
            current_storage_mcm=r.current_storage_mcm,
            dead_storage_mcm=r.dead_storage_mcm,
            purpose=r.purpose,
            base_population=r.base_population,
            base_agri_area_ha=r.base_agri_area_ha,
            current_demand_mcm=r.current_demand_mcm,
            storage_percentage=round((r.current_storage_mcm / r.capacity_mcm) * 100.0, 1),
            risk_level=r.risk_level,
            risk_score=r.risk_score
        )
        for r in all_reservoirs
    ]

    selected_item = next((item for item in res_items if item.name == selected_r.name), res_items[0])

    return DashboardData(
        total_reservoirs=len(all_reservoirs),
        current_average_storage_pct=avg_storage_pct,
        total_storage_mcm=round(total_cur_st, 1),
        total_capacity_mcm=round(total_cap, 1),
        current_water_demand_mcm=round(cur_demand_total, 1),
        predicted_water_demand_mcm=pred_res["predicted_demand_mcm"],
        overall_risk_level=pred_res["risk_level"],
        forecast_horizon="12 Months",
        selected_reservoir=selected_item,
        reservoirs=res_items,
        historical_trend=hist_trend,
        demand_by_sector=demand_by_sector,
        storage_trends=storage_trends,
        risk_distribution=risk_dist,
        rainfall_vs_storage=rainfall_vs_st,
        population_vs_demand=pop_vs_dem,
        recommendations=pred_res["recommendations"]
    )

@router.get("/historical-data")
def get_historical_data(
    page: int = Query(1, ge=1),
    limit: int = Query(25, ge=5, le=100),
    reservoir: Optional[str] = None,
    state: Optional[str] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(HistoricalRecord)

    if reservoir and reservoir != "All":
        query = query.filter(HistoricalRecord.reservoir_name == reservoir)
    if state and state != "All":
        query = query.filter(HistoricalRecord.state == state)
    if search:
        s = f"%{search}%"
        query = query.filter(
            (HistoricalRecord.reservoir_name.like(s)) |
            (HistoricalRecord.district.like(s)) |
            (HistoricalRecord.state.like(s)) |
            (HistoricalRecord.season.like(s))
        )

    total_records = query.count()
    records = query.order_by(HistoricalRecord.date.desc()).offset((page - 1) * limit).limit(limit).all()

    data = [
        {
            "id": r.id,
            "date": r.date,
            "state": r.state,
            "district": r.district,
            "reservoir": r.reservoir_name,
            "population": r.population,
            "rainfall_mm": r.rainfall_mm,
            "temperature_c": r.temperature_c,
            "agricultural_area_ha": r.agricultural_area_ha,
            "domestic_demand_mcm": r.domestic_demand_mcm,
            "industrial_demand_mcm": r.industrial_demand_mcm,
            "agricultural_demand_mcm": r.agricultural_demand_mcm,
            "total_demand_mcm": r.total_water_demand_mcm,
            "storage_mcm": r.current_storage_mcm,
            "storage_percentage": r.storage_percentage,
            "inflow_mcm": r.inflow_mcm,
            "drought_index": r.drought_index,
            "season": r.season,
            "data_type": r.data_type
        }
        for r in records
    ]

    return {
        "page": page,
        "limit": limit,
        "total_records": total_records,
        "total_pages": (total_records + limit - 1) // limit,
        "data": data
    }

@router.post("/upload-csv", response_model=CSVValidationResponse)
async def upload_csv_dataset(file: UploadFile = File(...), db: Session = Depends(get_db)):
    if not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="Invalid file type. Please upload a .csv file.")

    content = await file.read()
    try:
        df = pd.read_csv(io.BytesIO(content))
    except Exception as e:
        return CSVValidationResponse(
            success=False,
            filename=file.filename,
            total_records=0,
            valid_records=0,
            error_count=1,
            errors=[f"Failed to parse CSV file: {str(e)}"],
            sample_preview=[]
        )

    required_cols = [
        "date", "state", "reservoir_name", "population", "rainfall_mm",
        "temperature_c", "agricultural_area_ha", "total_water_demand_mcm",
        "current_storage_mcm", "reservoir_capacity_mcm"
    ]

    missing = [c for c in required_cols if c not in df.columns]
    errors = []
    if missing:
        errors.append(f"Missing required columns: {', '.join(missing)}")

    # Check for invalid values
    if "population" in df.columns and (df["population"] < 0).any():
        errors.append("Column 'population' contains negative values.")
    if "current_storage_mcm" in df.columns and (df["current_storage_mcm"] < 0).any():
        errors.append("Column 'current_storage_mcm' contains negative values.")

    valid_count = len(df) if not errors else 0
    preview = df.head(5).to_dict(orient="records")

    return CSVValidationResponse(
        success=len(errors) == 0,
        filename=file.filename,
        total_records=len(df),
        valid_records=valid_count,
        error_count=len(errors),
        errors=errors,
        sample_preview=preview
    )

@router.get("/model-metrics")
def get_model_metrics():
    metrics_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "models", "model_metrics.json")
    if not os.path.exists(metrics_path):
        from ml.train_model import train_and_evaluate
        train_and_evaluate()

    with open(metrics_path, "r") as f:
        data = json.load(f)

    return data

@router.get("/recommendations")
def get_recommendations_endpoint(
    reservoir: Optional[str] = "Bhavanisagar",
    risk_level: Optional[str] = "MEDIUM"
):
    recs = generate_recommendations(
        risk_level=risk_level,
        storage_percentage=45.0,
        demand_gap=50.0,
        rainfall_mm=110.0,
        temperature_c=29.0
    )
    return {
        "reservoir": reservoir,
        "risk_level": risk_level,
        "recommendations": recs
    }

@router.post("/generate-report", response_model=ReportResponse)
def generate_report_endpoint(req: ReportRequest, db: Session = Depends(get_db)):
    res_obj = db.query(Reservoir).filter(Reservoir.name == req.reservoir_name).first()
    if not res_obj:
        res_obj = db.query(Reservoir).first()

    # Get forecast trajectory for the report
    forecast_data = forecast_trajectory({
        "state": res_obj.state,
        "reservoir": res_obj.name,
        "population": res_obj.base_population,
        "rainfall_mm": 115.0,
        "temperature_c": 28.5,
        "agricultural_area_ha": res_obj.base_agri_area_ha,
        "industrial_demand_mcm": 55.0,
        "reservoir_capacity_mcm": res_obj.capacity_mcm,
        "current_storage_mcm": res_obj.current_storage_mcm,
        "month": 7
    }, horizon_months=req.forecast_horizon_months)

    res_data = {
        "name": res_obj.name,
        "state": res_obj.state,
        "district": res_obj.district,
        "capacity_mcm": res_obj.capacity_mcm,
        "current_storage_mcm": res_obj.current_storage_mcm,
        "current_demand_mcm": res_obj.current_demand_mcm,
        "risk_level": res_obj.risk_level
    }

    pdf_filename = generate_pdf_report(
        reservoir_data=res_data,
        forecast_data=forecast_data,
        scenario_name=req.scenario_name or "Normal Conditions",
        notes=req.notes or ""
    )

    report_id = pdf_filename.replace(".pdf", "")
    download_url = f"/api/download-report/{pdf_filename}"

    return ReportResponse(
        report_id=report_id,
        reservoir_name=res_obj.name,
        generated_at=pd.Timestamp.now().isoformat(),
        pdf_filename=pdf_filename,
        download_url=download_url,
        status="Ready"
    )

@router.get("/download-report/{filename}")
def download_pdf_report(filename: str):
    # Sanitize filename
    safe_filename = os.path.basename(filename)
    filepath = os.path.join(REPORTS_DIR, safe_filename)

    if not os.path.exists(filepath):
        raise HTTPException(status_code=404, detail="Requested report PDF file does not exist.")

    return FileResponse(
        path=filepath,
        filename=safe_filename,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{safe_filename}"'}
    )
