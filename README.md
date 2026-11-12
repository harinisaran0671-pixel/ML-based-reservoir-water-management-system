# AquaPredict AI

**AI-Based Water Demand Forecasting and Reservoir Storage Decision Support System**

> **Problem Statement ID:** SIH1692  
> **Title:** Forecasting Future Water Requirements and Assessing Storage Capacities in Reservoirs  
> **Organization:** Ministry of Jal Shakti · Department of Water Resources & Ganga Rejuvenation / Central Water Commission (CWC)  
> **Dataset Label:** `DEMO / SYNTHETIC DATA` (3,659 monthly records across 14 reservoirs in 6 states)

---

## 1. System Architecture

```text
                                User / Water Resource Planner
                                              │
                                              ▼
                             React 19 + Vite Web Application
                                (Tailwind CSS, Leaflet, Recharts)
                                              │
                                      REST APIs (JSON)
                                              ▼
                                 FastAPI Backend (Python)
                                              │
         ┌────────────────────────────────────┼────────────────────────────────────┐
         │                                    │                                    │
         ▼                                    ▼                                    ▼
  Machine Learning Engine             Database Ledger                 Scenario & Decision Engine
  ├── Gradient Boosting (Selected)    └── SQLite / SQLAlchemy         ├── 7 Predefined Presets
  ├── Inflow Regressor                    (3,659 historical rows)     ├── Custom Stress Sliders
  └── Chronological Preprocessor                                      ├── 7-Factor Risk Index (0-100)
         │                                                                 └── Actionable Directives
         ▼                                                                         │
  Water Balance Storage Assessment <───────────────────────────────────────────────┘
  [Future = Storage + Inflow - Demand - Evaporation - Ecological]
  (Enforcing Non-Negative Storage Invariant)
         │
         ▼
  Executive Decision Support & PDF Report Engine (ReportLab)
```

---

## 2. Key Modules & Features

1. **Executive Dashboard Cockpit:**
   - Real-time aggregate telemetry across 14 monitored reservoirs.
   - Dynamic reservoir selector updating capacity, storage, demand, and risk.
   - 6 synchronized charts:
     - Historical vs Predicted Water Demand (MCM)
     - Reservoir Storage Utilization Comparison (%)
     - Sectoral Demand Apportionment (Agriculture, Domestic, Industrial, Ecological)
     - Catchment Rainfall vs Storage Volume (Composed chart)
     - Population Growth vs Consumptive Draft
     - System-Wide Risk Classification Distribution
   - Actionable AI decision directives derived directly from backend predictions.

2. **Dedicated Water Demand Forecasting Engine:**
   - Multi-horizon projections: 1, 3, 6, 12, 24, and 60 months (up to 5 years).
   - Monthly forecast table: Month | Predicted Demand | Inflow | Storage | Storage % | Risk.
   - Dual-axis trajectory chart comparing consumptive demand with reservoir storage depletion.

3. **Reservoir Storage Assessment & Water Balance:**
   - Physical water balance formula:
     $$\text{Future Storage} = \max(\text{Dead Storage}, \min(\text{Capacity}, \text{Current} + \text{Inflow} - \sum \text{Draft} - \text{Evaporation}))$$
   - Non-negative storage guarantee enforcing environmental dead storage thresholds.
   - Interactive sliders for monthly inflow, sectoral demands, and evaporation rates.

4. **Shortage Risk Prediction Engine (7 Contributing Factors):**
   - Continuous 0–100 risk score and 4-tier classification (`LOW`, `MEDIUM`, `HIGH`, `CRITICAL`).
   - Contributing factors:
     1. Storage Level Deficit (25% weight)
     2. Demand-to-Storage Ratio (25% weight)
     3. Inflow Deficit (15% weight)
     4. Rainfall Deficit (15% weight)
     5. Drought Index / SPI (10% weight)
     6. Temperature / Evaporation Stress (5% weight)
     7. Population Pressure (5% weight)
   - Radar and horizontal bar visualizations + ranked stress drivers.

5. **Climate & Demographic Scenario Simulator:**
   - 7 Predefined Scenarios:
     1. *Normal Conditions* (Baseline)
     2. *Population Growth* (+15% demographic surge)
     3. *Low Rainfall* (-30% precipitation deficit)
     4. *Drought* (-50% rainfall, +2.5°C temperature, +20% agriculture)
     5. *Extreme Rainfall* (+60% intense runoff)
     6. *High Agricultural Demand* (+35% irrigation command expansion)
     7. *Combined Climate Stress* (+10% pop, -40% rain, +3.0°C heat, +25% agri)
   - Custom Scenario mode with interactive parametric sliders.
   - Re-executes the machine learning pipeline to return true predicted delta values (no hardcoded frontend multipliers).

6. **Geospatial Reservoir Network Map:**
   - Interactive Leaflet + OpenStreetMap rendering 14 major reservoirs across peninsular India.
   - Dynamic marker color-coding derived from backend risk levels:
     - `LOW` → Green (&gt;60% storage)
     - `MEDIUM` → Yellow (40–60% storage)
     - `HIGH` → Orange (20–40% storage)
     - `CRITICAL` → Red (&lt;20% storage)
   - Interactive popups with capacity, storage percentage, demand, and navigation shortcuts.

7. **Historical Records & CSV Upload Validation:**
   - Tabular view of all 3,659 monthly records with search, state filtering, and pagination.
   - Real-world CSV upload pipeline with server-side column validation, negative value detection, and preview generation.

8. **Model Performance & Chronological Validation:**
   - Comparative evaluation across Linear Regression, Random Forest, and Gradient Boosting.
   - Champion Model: **Gradient Boosting Regressor** (selected via lowest Validation RMSE on chronological holdout).
   - High precision metrics: R² ≈ 0.99, Test MAPE ≈ 4.2%, Test RMSE ≈ 35.3 MCM.
   - Top 10 feature importances chart and documentation of chronological split methodology.

9. **Automated CWC / Ministry PDF Report Generator:**
   - Generates official water-resource assessment PDF reports via ReportLab.
   - Includes basin metadata, forecast tables, scenario comparisons, and actionable mitigation directives.
   - True downloadable PDF endpoint.

---

## 3. Machine Learning Methodology

### Chronological Train / Validation / Test Splitting
Because hydrological and climate datasets are strictly time-dependent, random k-fold cross-validation introduces severe **lookahead leakage** (training on future monsoon cycles to predict the past). AquaPredict AI implements a **chronological out-of-time split**:
- **Training Set (70%):** 2002 to ~2017 (2,562 records)
- **Validation Set (15%):** ~2017 to ~2020 (546 records) — used for model selection
- **Test Set (15%):** ~2020 to late 2023 (551 records) — completely unseen holdout

### Model Benchmark Results

| Model Architecture | Val RMSE (Selection Metric) | Test R² Score | Test MAPE (%) |
| :--- | :---: | :---: | :---: |
| Linear Regression | 62.438 | 0.9773 | 17.71% |
| Random Forest Regressor | 36.261 | 0.9920 | 4.58% |
| **Gradient Boosting Regressor (Champion)** | **32.338** | **0.9923** | **4.19%** |

### Known Model Limitations (Documented Transparently)
1. **Tree-Based Extrapolation:** Tree-based models (Random Forest, Gradient Boosting) partition space using orthogonal decision boundaries and do not extrapolate unbounded linear trends strongly for out-of-distribution demographic shocks (+15% population produces a moderate predicted demand response). Future improvements include hybrid ARIMA-LSTM models and population consumption elasticity multipliers.
2. **Temperature Metric:** Temperature scenario inputs are calibrated in **degrees Celsius change (°C)** rather than percentage.

---

## 4. Dataset Overview

- **Total Records:** 3,659 monthly records
- **Chronological Span:** 2002 to 2023 (~22 years)
- **Coverage:** 14 Major Reservoirs across 6 Peninsular States
  - **Tamil Nadu:** Bhavanisagar, Mettur, Vaigai
  - **Karnataka:** Krishna Raja Sagara (KRS), Tungabhadra, Almatti
  - **Kerala:** Idukki, Malampuzha
  - **Andhra Pradesh:** Srisailam, Nagarjuna Sagar
  - **Telangana:** Singur, Sriram Sagar
  - **Maharashtra:** Koyna, Jayakwadi
- **Label:** `DEMO / SYNTHETIC DATA` (engineered with realistic physical correlations: rainfall-inflow coupling, seasonal irrigation peaks, population domestic demand scaling, and temperature-driven evaporation).

---

## 5. Local Setup & Execution Guide

### Prerequisites
- Python 3.10+
- Node.js 18+ and npm

### 1. Install Backend Dependencies
```bash
# Optional: create virtual environment
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install requirements
pip install -r requirements.txt
```

### 2. Generate Dataset & Train Models
```bash
# Generates data/water_demand_reservoir_dataset.csv
python3 data/generate_dataset.py

# Trains models, outputs evaluation plots and models/model_metrics.json
python3 ml/train_model.py

# Initializes SQLite database and seeds 3,659 records
python3 backend/database/init_db.py
```

### 3. Run Automated Tests
```bash
python3 -m pytest tests/test_aquapredict.py -v
```
*(All 15 core unit and API integration tests pass).*

### 4. Start the Backend API Server
```bash
uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload
```
API Documentation will be accessible at: `http://localhost:8000/docs`.

### 5. Start the Frontend Application
```bash
# Install npm dependencies
npm install

# Start development server
npm run dev
```
The React decision support interface will open at: `http://localhost:3000` (or `http://localhost:5173`).

---

## 6. Monday Demonstration Flow (Step-by-Step)

1. **Dashboard Overview:**
   - Open the dashboard at `http://localhost:3000`.
   - Observe the 14 reservoirs monitored, average peninsular storage (MCM & %), current total demand, and system-wide risk breakdown.
2. **Reservoir Selection:**
   - In the top header or dashboard selector, switch from *Bhavanisagar* to *Mettur* or *Krishna Raja Sagara*.
   - Notice the instant update of storage capacity, 12-month historical demand curve, sector breakdown, and AI mitigation directives.
3. **Generate Multi-Month Forecast:**
   - Navigate to **Water Demand Forecast**.
   - Select 12-month horizon and click **Generate Forecast**.
   - Observe the real ML inference calculating month-by-month demand, seasonal inflow surges during monsoon, and storage trajectory.
4. **Inspect Water Balance & Storage:**
   - Navigate to **Reservoir Storage**.
   - Review the physical equation visualizer: Current + Inflow - Demand - Evaporation = Future Storage.
   - Adjust the interactive inflow/outflow sliders to see live water balance recalculation with non-negative dead storage protection.
5. **Analyze 7-Factor Vulnerability:**
   - Navigate to **Risk Analysis**.
   - Inspect the 0–100 composite risk score, radar diagram, and ranked stress factors (e.g. storage deficit, rainfall lag).
6. **Execute Climate Stress Simulator:**
   - Navigate to **Scenario Simulator**.
   - Select the **Drought** preset (-50% rainfall, +2.5°C heat, +20% agricultural draft).
   - Click **Run Simulation** — the backend re-executes the trained ML model with altered covariates.
   - Compare the side-by-side cards: Baseline (Normal) vs Scenario (Drought), showing the demand surge, storage drop, and risk escalation.
7. **Geospatial Basin Map:**
   - Navigate to **Reservoir Map**.
   - Inspect the 14 interactive map pins color-coded by risk level (green, yellow, orange, red).
   - Click any marker to view capacity, storage percentage, and click *View Details*.
8. **Generate Official PDF Report:**
   - Navigate to **Reports**.
   - Select *Bhavanisagar*, 12-month horizon, and *Drought* scenario.
   - Click **Generate Report** — backend compiles an official CWC-style PDF with vector tables and directives.
   - Click **Download PDF Report** to verify the downloaded document.
9. **Examine ML Benchmarks:**
   - Navigate to **Model Performance**.
   - Review the algorithm comparison table and notice that Gradient Boosting is highlighted as champion based on validation RMSE on chronological holdout.
