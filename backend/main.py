"""
AquaPredict AI - FastAPI Application Entry Point
AI-Based Water Demand Forecasting & Reservoir Storage Decision Support System
SIH1692: Ministry of Jal Shakti / Central Water Commission
"""

import os
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

from backend.routes.api import router as api_router
from backend.database.init_db import init_db

app = FastAPI(
    title="AquaPredict AI Backend",
    description="Decision Support API for Water Demand Forecasting and Reservoir Storage Assessment (SIH1692)",
    version="1.0.0"
)

# CORS configuration
# Explicitly allowing frontend origins (localhost:5173, localhost:3000, etc.) without insecure wildcard in prod
origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_origin_regex=r"https?://(localhost|127\.0\.0\.1|.*\.run\.app|.*\.googleusercontent\.com)(:\d+)?",
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

@app.on_event("startup")
def on_startup():
    print("AquaPredict AI Server starting...")
    # Initialize DB and seed if necessary
    try:
        init_db()
    except Exception as e:
        print(f"Warning during DB initialization: {e}")

    # Ensure reports directory exists
    reports_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "reports")
    os.makedirs(reports_dir, exist_ok=True)

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=500,
        content={"detail": f"Internal Server Error: {str(exc)}", "path": str(request.url.path)}
    )

app.include_router(api_router)

@app.get("/")
def root():
    return {
        "project": "AquaPredict AI",
        "description": "AI-Based Water Demand Forecasting & Reservoir Storage Decision Support System",
        "problem_statement": "SIH1692",
        "docs_url": "/docs",
        "health_check": "/api/health"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=True)
