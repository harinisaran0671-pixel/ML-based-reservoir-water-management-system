import axios from 'axios';

// Normalize base URL:
// If VITE_API_URL is '/api' (or unset/empty), it resolves to '/api'
// If VITE_API_URL is an external host like 'http://localhost:8000', it ensures '/api' is appended
const getBaseUrl = (): string => {
  const envUrl = import.meta.env.VITE_API_URL;
  if (!envUrl || envUrl.trim() === '') {
    return '/api';
  }
  const trimmed = envUrl.trim().replace(/\/+$/, '');
  return trimmed.endsWith('/api') ? trimmed : `${trimmed}/api`;
};

const API_BASE_URL = getBaseUrl();

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

export interface Reservoir {
  id: number;
  name: string;
  state: string;
  district: string;
  latitude: number;
  longitude: number;
  capacity_mcm: number;
  current_storage_mcm: number;
  dead_storage_mcm: number;
  purpose: string;
  base_population: number;
  base_agri_area_ha: number;
  current_demand_mcm: number;
  storage_percentage: number;
  risk_level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  risk_score: number;
}

export interface PredictionPayload {
  state: string;
  reservoir: string;
  population: number;
  rainfall_mm: number;
  temperature_c: number;
  agricultural_area_ha: number;
  industrial_demand_mcm: number;
  reservoir_capacity_mcm: number;
  current_storage_mcm: number;
  forecast_months?: number;
  month?: number;
  previous_total_demand?: number;
}

export interface MonthlyForecastItem {
  step: number;
  month_label: string;
  month: number;
  season: string;
  predicted_demand_mcm: number;
  predicted_inflow_mcm: number;
  evaporation_mcm: number;
  predicted_storage_mcm: number;
  storage_percentage: number;
  risk_score: number;
  risk_level: string;
}

export interface ForecastResult {
  reservoir: string;
  state: string;
  capacity_mcm: number;
  horizon_months: number;
  average_predicted_demand_mcm: number;
  end_storage_mcm: number;
  end_storage_percentage: number;
  peak_risk_month: string;
  peak_risk_level: string;
  peak_risk_score: number;
  overall_risk_score: number;
  overall_risk_level: string;
  factors: Array<{ name: string; score: number; weight: string }>;
  main_risk_factors: string[];
  recommendations: string[];
  monthly_forecast: MonthlyForecastItem[];
}

export interface ScenarioPayload {
  reservoir_name: string;
  scenario_preset?: string;
  population_change_pct: number;
  rainfall_change_pct: number;
  temperature_change_c: number;
  agricultural_demand_change_pct: number;
  industrial_demand_change_pct: number;
}

export interface ScenarioResult {
  scenario_name: string;
  reservoir_name: string;
  inputs: {
    population_change_pct: number;
    rainfall_change_pct: number;
    temperature_change_c: number;
    agricultural_demand_change_pct: number;
    industrial_demand_change_pct: number;
  };
  baseline: {
    demand_mcm: number;
    storage_mcm: number;
    storage_percentage: number;
    risk_score: number;
    risk_level: string;
  };
  scenario: {
    demand_mcm: number;
    storage_mcm: number;
    storage_percentage: number;
    risk_score: number;
    risk_level: string;
  };
  demand_delta_pct: number;
  storage_delta_pct: number;
  risk_delta_score: number;
  ai_interpretation: string;
  recommendations: string[];
}

export const waterApi = {
  getHealth: () => api.get('/health'),
  getReservoirs: (state?: string) => api.get<Reservoir[]>('/reservoirs', { params: { state } }),
  getReservoir: (id: number) => api.get<Reservoir>(`/reservoir/${id}`),
  getDashboard: (reservoir_name?: string, state?: string) =>
    api.get('/dashboard', { params: { reservoir_name, state } }),
  predictDemand: (payload: PredictionPayload) => api.post('/predict-demand', payload),
  forecastDemand: (payload: PredictionPayload) => api.post<ForecastResult>('/forecast', payload),
  assessStorage: (payload: any) => api.post('/storage-assessment', payload),
  analyzeRisk: (reservoir_name: string, storage_pct?: number) =>
    api.post('/risk-analysis', null, { params: { reservoir_name, storage_pct } }),
  runScenario: (payload: ScenarioPayload) => api.post<ScenarioResult>('/scenario', payload),
  getHistoricalData: (params: { page: number; limit: number; reservoir?: string; state?: string; search?: string }) =>
    api.get('/historical-data', { params }),
  uploadCSV: (formData: FormData) =>
    api.post('/upload-csv', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  getModelMetrics: () => api.get('/model-metrics'),
  getRecommendations: (reservoir?: string, risk_level?: string) =>
    api.get('/recommendations', { params: { reservoir, risk_level } }),
  generateReport: (payload: { reservoir_name: string; forecast_horizon_months: number; scenario_name?: string; notes?: string }) =>
    api.post('/generate-report', payload),
  getDownloadUrl: (filename: string) => `${API_BASE_URL}/download-report/${filename}`,
};
