import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  RotateCcw,
  Sparkles,
  Calendar,
  AlertTriangle,
  Database,
  ArrowRight,
  Droplets,
  Layers,
  Thermometer,
  CloudRain,
  Users
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  AreaChart,
  Area
} from 'recharts';

import { waterApi, Reservoir, ForecastResult, MonthlyForecastItem } from '../services/api';
import { StatCard } from '../components/StatCard';
import { RiskBadge } from '../components/RiskBadge';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ErrorMessage } from '../components/ErrorMessage';
import { RecommendationCard } from '../components/RecommendationCard';

interface ForecastPageProps {
  selectedReservoirName: string;
  onSelectReservoir: (name: string) => void;
  reservoirs: Reservoir[];
}

export const ForecastPage: React.FC<ForecastPageProps> = ({
  selectedReservoirName,
  onSelectReservoir,
  reservoirs,
}) => {
  const currentRes = reservoirs.find((r) => r.name === selectedReservoirName) || reservoirs[0] || {};

  const [state, setState] = useState(currentRes.state || 'Tamil Nadu');
  const [reservoirName, setReservoirName] = useState(currentRes.name || 'Bhavanisagar');
  const [horizon, setHorizon] = useState(12);

  // Optional manual overrides
  const [population, setPopulation] = useState(currentRes.base_population || 2250000);
  const [rainfall, setRainfall] = useState(120);
  const [temperature, setTemperature] = useState(28.5);
  const [agriArea, setAgriArea] = useState(currentRes.base_agri_area_ha || 105000);
  const [indDemand, setIndDemand] = useState(60);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [forecastResult, setForecastResult] = useState<ForecastResult | null>(null);

  // Sync inputs when selected reservoir changes
  useEffect(() => {
    if (currentRes.name) {
      setState(currentRes.state);
      setReservoirName(currentRes.name);
      setPopulation(currentRes.base_population || 2500000);
      setAgriArea(currentRes.base_agri_area_ha || 120000);
    }
  }, [currentRes]);

  const handleGenerateForecast = async () => {
    // 1. Validate inputs
    if (population <= 0) {
      setError('Population must be greater than zero.');
      return;
    }
    if (rainfall < 0) {
      setError('Rainfall cannot be negative.');
      return;
    }
    if (agriArea < 0) {
      setError('Agricultural area cannot be negative.');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const payload = {
        state,
        reservoir: reservoirName,
        population: Number(population),
        rainfall_mm: Number(rainfall),
        temperature_c: Number(temperature),
        agricultural_area_ha: Number(agriArea),
        industrial_demand_mcm: Number(indDemand),
        reservoir_capacity_mcm: currentRes.capacity_mcm || 2000,
        current_storage_mcm: currentRes.current_storage_mcm || 1200,
        forecast_months: Number(horizon),
        month: 7,
      };

      const res = await waterApi.forecastDemand(payload);
      setForecastResult(res.data);
    } catch (err: any) {
      console.error('Forecast error:', err);
      setError(err.response?.data?.detail || 'Failed to generate forecast from the ML backend service.');
    } finally {
      setLoading(false);
    }
  };

  // Run on mount
  useEffect(() => {
    handleGenerateForecast();
  }, [reservoirName, horizon]);

  const handleReset = () => {
    setPopulation(currentRes.base_population || 2500000);
    setRainfall(120);
    setTemperature(28.5);
    setAgriArea(currentRes.base_agri_area_ha || 120000);
    setIndDemand(60);
    setHorizon(12);
  };

  const chartData = (forecastResult?.monthly_forecast || []).map((item) => ({
    month: item.month_label,
    demand: item.predicted_demand_mcm,
    storage: item.predicted_storage_mcm,
    inflow: item.predicted_inflow_mcm,
    pct: item.storage_percentage,
  }));

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs">
        <h1 className="text-xl font-bold text-slate-900 tracking-tight">Water Demand Forecasting Engine</h1>
        <p className="text-xs text-slate-500 mt-1">
          Chronologically trained Gradient Boosting Regressor forecasting month-by-month demand trajectories and
          water-balance storage depletion up to 60 months.
        </p>
      </div>

      {/* Input Controls Card */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs">
        <h2 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
          <span>Forecast Configuration & Hydrological Parameters</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-4">
          {/* State */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">State</label>
            <select
              value={state}
              onChange={(e) => {
                const newState = e.target.value;
                setState(newState);
                const firstRes = reservoirs.find((r) => r.state === newState);
                if (firstRes) {
                  setReservoirName(firstRes.name);
                  onSelectReservoir(firstRes.name);
                }
              }}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-medium text-slate-800 focus:outline-sky-500"
            >
              {Array.from(new Set(reservoirs.map((r) => r.state))).map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          {/* Reservoir */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Reservoir</label>
            <select
              value={reservoirName}
              onChange={(e) => {
                setReservoirName(e.target.value);
                onSelectReservoir(e.target.value);
              }}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-medium text-slate-800 focus:outline-sky-500"
            >
              {reservoirs
                .filter((r) => r.state === state)
                .map((r) => (
                  <option key={r.id} value={r.name}>
                    {r.name}
                  </option>
                ))}
            </select>
          </div>

          {/* Horizon */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Forecast Horizon</label>
            <select
              value={horizon}
              onChange={(e) => setHorizon(Number(e.target.value))}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-medium text-slate-800 focus:outline-sky-500"
            >
              <option value={1}>1 Month (Immediate)</option>
              <option value={3}>3 Months (Seasonal)</option>
              <option value={6}>6 Months (Half Year)</option>
              <option value={12}>12 Months (1 Full Year)</option>
              <option value={24}>24 Months (2 Years)</option>
              <option value={60}>60 Months (5-Year Planning)</option>
            </select>
          </div>

          {/* Population */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Population (Beneficiary Basin)</label>
            <input
              type="number"
              value={population}
              onChange={(e) => setPopulation(Number(e.target.value))}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-mono tabular-nums text-slate-800 focus:outline-sky-500"
              step={50000}
            />
          </div>

          {/* Rainfall */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Catchment Rainfall (mm)</label>
            <input
              type="number"
              value={rainfall}
              onChange={(e) => setRainfall(Number(e.target.value))}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-mono tabular-nums text-slate-800 focus:outline-sky-500"
              step={5}
            />
          </div>

          {/* Temperature */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Mean Temperature (°C)</label>
            <input
              type="number"
              value={temperature}
              onChange={(e) => setTemperature(Number(e.target.value))}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-mono tabular-nums text-slate-800 focus:outline-sky-500"
              step={0.5}
            />
          </div>

          {/* Agricultural Area */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Agricultural Command (ha)</label>
            <input
              type="number"
              value={agriArea}
              onChange={(e) => setAgriArea(Number(e.target.value))}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-mono tabular-nums text-slate-800 focus:outline-sky-500"
              step={5000}
            />
          </div>

          {/* Industrial Demand */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Industrial Allocation (MCM)</label>
            <input
              type="number"
              value={indDemand}
              onChange={(e) => setIndDemand(Number(e.target.value))}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-mono tabular-nums text-slate-800 focus:outline-sky-500"
              step={5}
            />
          </div>
        </div>

        {/* Buttons */}
        <div className="flex items-center gap-3 pt-2 border-t border-slate-100">
          <button
            onClick={handleGenerateForecast}
            disabled={loading}
            className="inline-flex items-center gap-2 px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors disabled:opacity-50"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{loading ? 'Forecasting...' : 'Generate Forecast'}</span>
          </button>

          <button
            onClick={handleReset}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded-lg transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>
        </div>
      </div>

      {error && <ErrorMessage message={error} onRetry={handleGenerateForecast} />}

      {loading && <LoadingSpinner message="Calculating multi-month ML trajectory & reservoir water-balance..." />}

      {/* Forecast Results Output */}
      {forecastResult && !loading && (
        <div className="space-y-6">
          {/* Summary Metric Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Average Forecasted Demand"
              value={forecastResult.average_predicted_demand_mcm}
              unit="MCM / mo"
              description={`Across ${forecastResult.horizon_months} months horizon`}
              icon={TrendingUp}
              accentColor="blue"
            />

            <StatCard
              title="End-Horizon Storage"
              value={forecastResult.end_storage_mcm}
              unit="MCM"
              description={`Capacity: ${forecastResult.capacity_mcm} MCM`}
              icon={Database}
              accentColor={forecastResult.end_storage_percentage < 30 ? 'rose' : 'emerald'}
            />

            <StatCard
              title="Storage Percentage"
              value={`${forecastResult.end_storage_percentage}%`}
              unit="At Horizon"
              description={`Peak risk month: ${forecastResult.peak_risk_month}`}
              icon={Droplets}
              accentColor={forecastResult.end_storage_percentage < 35 ? 'rose' : 'amber'}
            />

            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Overall Shortage Risk
              </span>
              <div className="my-2">
                <RiskBadge
                  level={forecastResult.overall_risk_level}
                  score={forecastResult.overall_risk_score}
                  size="lg"
                />
              </div>
              <span className="text-[11px] text-slate-500">
                Peak Risk: {forecastResult.peak_risk_level} ({forecastResult.peak_risk_score}/100)
              </span>
            </div>
          </div>

          {/* Line Chart: Historical vs Forecasted Demand & Storage Trajectory */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900 tracking-tight">
                  Forecast Trajectory: Water Demand vs Reservoir Storage
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Monthly simulated balance: Storage = Current + Inflow - Demand - Evaporation (non-negative storage guarantee)
                </p>
              </div>
              <div className="text-xs font-mono text-slate-500">Horizon: {forecastResult.horizon_months} Months</div>
            </div>

            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis yAxisId="left" unit=" MCM" tick={{ fontSize: 11 }} />
                  <YAxis yAxisId="right" orientation="right" unit="%" domain={[0, 100]} tick={{ fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderRadius: '8px',
                      color: '#fff',
                      fontSize: '11px',
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="demand"
                    name="Predicted Demand (MCM)"
                    stroke="#0284c7"
                    strokeWidth={2.5}
                    dot={{ r: 3 }}
                  />
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="inflow"
                    name="Estimated Inflow (MCM)"
                    stroke="#10b981"
                    strokeWidth={2}
                    strokeDasharray="3 3"
                    dot={{ r: 2 }}
                  />
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="storage"
                    name="Projected Storage (MCM)"
                    stroke="#6366f1"
                    strokeWidth={2}
                    dot={{ r: 2 }}
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="pct"
                    name="Storage %"
                    stroke="#f59e0b"
                    strokeWidth={1.5}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Monthly Forecast Table */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 tracking-tight">Monthly Forecast Breakdown</h3>
                <p className="text-xs text-slate-500">Detailed month-by-month values generated by the model</p>
              </div>
              <span className="text-xs font-mono text-sky-600 bg-sky-50 px-2 py-1 rounded">
                {forecastResult.monthly_forecast.length} Months
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-semibold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="py-3 px-4">Step</th>
                    <th className="py-3 px-4">Month</th>
                    <th className="py-3 px-4">Season</th>
                    <th className="py-3 px-4 text-right">Predicted Demand</th>
                    <th className="py-3 px-4 text-right">Inflow</th>
                    <th className="py-3 px-4 text-right">Evaporation</th>
                    <th className="py-3 px-4 text-right">Predicted Storage</th>
                    <th className="py-3 px-4 text-right">Storage %</th>
                    <th className="py-3 px-4 text-center">Risk Level</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {forecastResult.monthly_forecast.map((row) => (
                    <tr key={row.step} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-2.5 px-4 font-mono text-slate-400">+{row.step}</td>
                      <td className="py-2.5 px-4 font-medium text-slate-900">{row.month_label}</td>
                      <td className="py-2.5 px-4 text-slate-600">{row.season}</td>
                      <td className="py-2.5 px-4 text-right font-mono tabular-nums text-slate-800 font-semibold">
                        {row.predicted_demand_mcm} MCM
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono tabular-nums text-emerald-600">
                        {row.predicted_inflow_mcm} MCM
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono tabular-nums text-slate-500">
                        {row.evaporation_mcm} MCM
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono tabular-nums text-indigo-700 font-semibold">
                        {row.predicted_storage_mcm} MCM
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono tabular-nums">
                        <span
                          className={`font-semibold ${
                            row.storage_percentage < 30
                              ? 'text-rose-600'
                              : row.storage_percentage < 50
                              ? 'text-amber-600'
                              : 'text-emerald-600'
                          }`}
                        >
                          {row.storage_percentage}%
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-center">
                        <RiskBadge level={row.risk_level} score={row.risk_score} size="sm" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Actionable Recommendations */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs">
            <h3 className="text-sm font-bold text-slate-900 mb-3">AI Decision Recommendations for Horizon</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {forecastResult.recommendations.map((rec, i) => (
                <RecommendationCard key={i} index={i} recommendation={rec} />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
