import React, { useState, useEffect } from 'react';
import {
  Sliders,
  Sparkles,
  ArrowRight,
  TrendingUp,
  Database,
  AlertTriangle,
  RotateCcw,
  Info,
  CheckCircle2,
  HelpCircle,
  Thermometer,
  CloudRain,
  Users,
  Wheat,
  Factory
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  Cell
} from 'recharts';

import { waterApi, Reservoir, ScenarioResult } from '../services/api';
import { StatCard } from '../components/StatCard';
import { RiskBadge } from '../components/RiskBadge';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ErrorMessage } from '../components/ErrorMessage';
import { RecommendationCard } from '../components/RecommendationCard';

interface ScenarioPageProps {
  selectedReservoirName: string;
  onSelectReservoir: (name: string) => void;
  reservoirs: Reservoir[];
}

const PRESETS = [
  { id: 'Normal Conditions', label: '1. Normal Conditions', desc: 'Baseline climatic and socio-economic averages.' },
  { id: 'Population Growth', label: '2. Population Growth', desc: '+15% Population expansion.' },
  { id: 'Low Rainfall', label: '3. Low Rainfall', desc: '-30% Monsoon precipitation.' },
  { id: 'Drought', label: '4. Drought', desc: '-50% Rainfall, +2.5°C Heat, +20% Agri demand.' },
  { id: 'Extreme Rainfall', label: '5. Extreme Rainfall', desc: '+60% Precipitation, high runoff surge.' },
  { id: 'High Agricultural Demand', label: '6. High Agricultural Demand', desc: '+35% Rabi crop command irrigation.' },
  { id: 'Combined Climate Stress', label: '7. Combined Climate Stress', desc: '+10% Pop, -40% Rain, +3.0°C Heat, +25% Agri.' },
  { id: 'Custom', label: 'Custom Scenario', desc: 'Custom parametric stress test sliders.' },
];

export const ScenarioPage: React.FC<ScenarioPageProps> = ({
  selectedReservoirName,
  onSelectReservoir,
  reservoirs,
}) => {
  const currentRes = reservoirs.find((r) => r.name === selectedReservoirName) || reservoirs[0] || {};

  const [activePreset, setActivePreset] = useState<string>('Drought');

  // Custom inputs
  const [popChange, setPopChange] = useState<number>(2.0);
  const [rainChange, setRainChange] = useState<number>(-50.0);
  const [tempChangeC, setTempChangeC] = useState<number>(2.5); // Temperature Change in °C (NOT %)
  const [agriChange, setAgriChange] = useState<number>(20.0);
  const [indChange, setIndChange] = useState<number>(-5.0);

  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [scenarioResult, setScenarioResult] = useState<ScenarioResult | null>(null);

  // Set sliders when preset is selected
  const handleSelectPreset = (presetId: string) => {
    setActivePreset(presetId);

    if (presetId === 'Normal Conditions') {
      setPopChange(0);
      setRainChange(0);
      setTempChangeC(0);
      setAgriChange(0);
      setIndChange(0);
    } else if (presetId === 'Population Growth') {
      setPopChange(15);
      setRainChange(0);
      setTempChangeC(0.5);
      setAgriChange(2);
      setIndChange(8);
    } else if (presetId === 'Low Rainfall') {
      setPopChange(0);
      setRainChange(-30);
      setTempChangeC(1.0);
      setAgriChange(10);
      setIndChange(0);
    } else if (presetId === 'Drought') {
      setPopChange(2);
      setRainChange(-50);
      setTempChangeC(2.5);
      setAgriChange(20);
      setIndChange(-5);
    } else if (presetId === 'Extreme Rainfall') {
      setPopChange(0);
      setRainChange(60);
      setTempChangeC(-1.0);
      setAgriChange(-10);
      setIndChange(0);
    } else if (presetId === 'High Agricultural Demand') {
      setPopChange(0);
      setRainChange(-10);
      setTempChangeC(0.8);
      setAgriChange(35);
      setIndChange(5);
    } else if (presetId === 'Combined Climate Stress') {
      setPopChange(10);
      setRainChange(-40);
      setTempChangeC(3.0);
      setAgriChange(25);
      setIndChange(12);
    }
  };

  const runSimulation = async () => {
    try {
      setLoading(true);
      setError(null);

      const payload = {
        reservoir_name: currentRes.name || 'Bhavanisagar',
        scenario_preset: activePreset,
        population_change_pct: Number(popChange),
        rainfall_change_pct: Number(rainChange),
        temperature_change_c: Number(tempChangeC), // In °C
        agricultural_demand_change_pct: Number(agriChange),
        industrial_demand_change_pct: Number(indChange),
      };

      const res = await waterApi.runScenario(payload);
      setScenarioResult(res.data);
    } catch (err: any) {
      console.error('Scenario simulation error:', err);
      setError(err.response?.data?.detail || 'Failed to execute scenario simulation on backend ML engine.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    runSimulation();
  }, [currentRes, activePreset]);

  // Comparison chart data
  const comparisonData = scenarioResult
    ? [
        {
          metric: 'Water Demand (MCM)',
          Baseline: scenarioResult.baseline.demand_mcm,
          Scenario: scenarioResult.scenario.demand_mcm,
        },
        {
          metric: 'Future Storage (MCM)',
          Baseline: scenarioResult.baseline.storage_mcm,
          Scenario: scenarioResult.scenario.storage_mcm,
        },
      ]
    : [];

  const percentageData = scenarioResult
    ? [
        {
          metric: 'Storage Utilization (%)',
          Baseline: scenarioResult.baseline.storage_percentage,
          Scenario: scenarioResult.scenario.storage_percentage,
        },
        {
          metric: 'Risk Severity Score (/100)',
          Baseline: scenarioResult.baseline.risk_score,
          Scenario: scenarioResult.scenario.risk_score,
        },
      ]
    : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Interactive What-If Simulation Engine
            </span>
            <span aria-hidden="true">·</span>
            <span className="text-xs text-sky-600 font-medium">Re-executes Trained ML Pipeline</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Climate & Demographic Scenario Simulator
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Test policy shocks, severe meteorological droughts, and agricultural surges against baseline storage rule curves.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
          <label className="text-xs font-medium text-slate-600">Target Reservoir:</label>
          <select
            value={selectedReservoirName}
            onChange={(e) => onSelectReservoir(e.target.value)}
            className="bg-transparent text-xs font-bold text-slate-900 focus:outline-hidden cursor-pointer"
          >
            {reservoirs.map((r) => (
              <option key={r.id} value={r.name}>
                {r.name} ({r.state})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Preset Scenario Selector Buttons */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs">
        <h2 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">
          Select Simulation Scenario Preset
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
          {PRESETS.map((p) => {
            const isActive = activePreset === p.id;
            return (
              <button
                key={p.id}
                onClick={() => handleSelectPreset(p.id)}
                className={`p-2.5 rounded-lg border text-left text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-sky-600 border-sky-600 text-white shadow-xs font-semibold'
                    : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100 hover:border-slate-300'
                }`}
              >
                <div className="truncate">{p.label}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Parametric Inputs Sliders */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900 tracking-tight">
              Scenario Stress Parameters ({activePreset})
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Adjust parameters below and click Run Scenario to execute the ML model inference with modified covariates.
            </p>
          </div>

          <button
            onClick={runSimulation}
            disabled={loading}
            className="inline-flex items-center gap-2 px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors disabled:opacity-50"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{loading ? 'Running ML Model...' : 'Run Simulation'}</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 pt-2">
          {/* Population Growth % */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-slate-500" />
                Population Change
              </span>
              <span className="font-mono font-bold text-sky-700">
                {popChange >= 0 ? `+${popChange}%` : `${popChange}%`}
              </span>
            </div>
            <input
              type="range"
              min={-20}
              max={50}
              step={1}
              value={popChange}
              onChange={(e) => {
                setActivePreset('Custom');
                setPopChange(Number(e.target.value));
              }}
              className="w-full accent-sky-600"
            />
            <span className="text-[10px] text-slate-400 mt-1 block">Baseline pop: {(currentRes.base_population || 2500000).toLocaleString()}</span>
          </div>

          {/* Rainfall Change % */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                <CloudRain className="w-3.5 h-3.5 text-slate-500" />
                Rainfall Change
              </span>
              <span className={`font-mono font-bold ${rainChange < 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                {rainChange >= 0 ? `+${rainChange}%` : `${rainChange}%`}
              </span>
            </div>
            <input
              type="range"
              min={-80}
              max={80}
              step={5}
              value={rainChange}
              onChange={(e) => {
                setActivePreset('Custom');
                setRainChange(Number(e.target.value));
              }}
              className="w-full accent-sky-600"
            />
            <span className="text-[10px] text-slate-400 mt-1 block">Meteorological deficit / surplus</span>
          </div>

          {/* Temperature Change in °C (NOT %) */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                <Thermometer className="w-3.5 h-3.5 text-slate-500" />
                Temperature Change (°C)
              </span>
              <span className={`font-mono font-bold ${tempChangeC > 0 ? 'text-rose-600' : 'text-sky-600'}`}>
                {tempChangeC >= 0 ? `+${tempChangeC}°C` : `${tempChangeC}°C`}
              </span>
            </div>
            <input
              type="range"
              min={-4.0}
              max={6.0}
              step={0.5}
              value={tempChangeC}
              onChange={(e) => {
                setActivePreset('Custom');
                setTempChangeC(Number(e.target.value));
              }}
              className="w-full accent-sky-600"
            />
            <span className="text-[10px] text-slate-400 mt-1 block">Specified in degrees Celsius (°C)</span>
          </div>

          {/* Agricultural Demand Change % */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                <Wheat className="w-3.5 h-3.5 text-slate-500" />
                Agri Area Demand
              </span>
              <span className="font-mono font-bold text-amber-700">
                {agriChange >= 0 ? `+${agriChange}%` : `${agriChange}%`}
              </span>
            </div>
            <input
              type="range"
              min={-40}
              max={60}
              step={5}
              value={agriChange}
              onChange={(e) => {
                setActivePreset('Custom');
                setAgriChange(Number(e.target.value));
              }}
              className="w-full accent-sky-600"
            />
            <span className="text-[10px] text-slate-400 mt-1 block">Irrigation command expansion</span>
          </div>

          {/* Industrial Demand Change % */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                <Factory className="w-3.5 h-3.5 text-slate-500" />
                Industrial Allocation
              </span>
              <span className="font-mono font-bold text-indigo-700">
                {indChange >= 0 ? `+${indChange}%` : `${indChange}%`}
              </span>
            </div>
            <input
              type="range"
              min={-30}
              max={50}
              step={5}
              value={indChange}
              onChange={(e) => {
                setActivePreset('Custom');
                setIndChange(Number(e.target.value));
              }}
              className="w-full accent-sky-600"
            />
            <span className="text-[10px] text-slate-400 mt-1 block">Manufacturing & power draft</span>
          </div>
        </div>
      </div>

      {loading && <LoadingSpinner message="Re-running Gradient Boosting inference with scenario covariates..." />}
      {error && <ErrorMessage message={error} onRetry={runSimulation} />}

      {/* Side-by-Side Comparison: BASELINE vs SCENARIO */}
      {scenarioResult && !loading && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Baseline Card */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Control State</span>
                  <h3 className="text-base font-bold text-slate-900">BASELINE (NORMAL)</h3>
                </div>
                <RiskBadge
                  level={scenarioResult.baseline.risk_level}
                  score={scenarioResult.baseline.risk_score}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-xs text-slate-500">Predicted Demand</span>
                  <div className="text-xl font-bold font-mono text-slate-900 mt-0.5">
                    {scenarioResult.baseline.demand_mcm} <span className="text-xs font-normal text-slate-500">MCM</span>
                  </div>
                </div>

                <div>
                  <span className="text-xs text-slate-500">Projected Storage</span>
                  <div className="text-xl font-bold font-mono text-slate-900 mt-0.5">
                    {scenarioResult.baseline.storage_mcm} <span className="text-xs font-normal text-slate-500">MCM</span>
                  </div>
                </div>

                <div>
                  <span className="text-xs text-slate-500">Storage Utilization</span>
                  <div className="text-xl font-bold font-mono text-slate-900 mt-0.5">
                    {scenarioResult.baseline.storage_percentage}%
                  </div>
                </div>

                <div>
                  <span className="text-xs text-slate-500">Risk Score</span>
                  <div className="text-xl font-bold font-mono text-slate-900 mt-0.5">
                    {scenarioResult.baseline.risk_score}/100
                  </div>
                </div>
              </div>
            </div>

            {/* Scenario Card */}
            <div className="bg-white rounded-xl border-2 border-sky-500 p-5 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 bg-sky-500 text-white text-[10px] font-bold px-3 py-0.5 rounded-bl">
                SIMULATION OUTPUT
              </div>

              <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-sky-600">Simulated Shock</span>
                  <h3 className="text-base font-bold text-slate-900 uppercase">
                    {scenarioResult.scenario_name}
                  </h3>
                </div>
                <RiskBadge
                  level={scenarioResult.scenario.risk_level}
                  score={scenarioResult.scenario.risk_score}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-xs text-slate-500">Predicted Demand</span>
                  <div className="text-xl font-bold font-mono text-slate-900 mt-0.5 flex items-baseline gap-1.5">
                    <span>{scenarioResult.scenario.demand_mcm}</span>
                    <span className="text-xs font-normal text-slate-500">MCM</span>
                    <span
                      className={`text-xs font-semibold ${
                        scenarioResult.demand_delta_pct > 0 ? 'text-rose-600' : 'text-emerald-600'
                      }`}
                    >
                      ({scenarioResult.demand_delta_pct >= 0 ? `+${scenarioResult.demand_delta_pct}%` : `${scenarioResult.demand_delta_pct}%`})
                    </span>
                  </div>
                </div>

                <div>
                  <span className="text-xs text-slate-500">Projected Storage</span>
                  <div className="text-xl font-bold font-mono text-slate-900 mt-0.5 flex items-baseline gap-1.5">
                    <span>{scenarioResult.scenario.storage_mcm}</span>
                    <span className="text-xs font-normal text-slate-500">MCM</span>
                    <span
                      className={`text-xs font-semibold ${
                        scenarioResult.storage_delta_pct < 0 ? 'text-rose-600' : 'text-emerald-600'
                      }`}
                    >
                      ({scenarioResult.storage_delta_pct >= 0 ? `+${scenarioResult.storage_delta_pct}%` : `${scenarioResult.storage_delta_pct}%`})
                    </span>
                  </div>
                </div>

                <div>
                  <span className="text-xs text-slate-500">Storage Utilization</span>
                  <div className="text-xl font-bold font-mono text-slate-900 mt-0.5">
                    {scenarioResult.scenario.storage_percentage}%
                  </div>
                </div>

                <div>
                  <span className="text-xs text-slate-500">Risk Delta</span>
                  <div className="text-xl font-bold font-mono text-slate-900 mt-0.5 flex items-baseline gap-1.5">
                    <span>{scenarioResult.scenario.risk_score}/100</span>
                    <span
                      className={`text-xs font-semibold ${
                        scenarioResult.risk_delta_score > 0 ? 'text-rose-600' : 'text-emerald-600'
                      }`}
                    >
                      ({scenarioResult.risk_delta_score >= 0 ? `+${scenarioResult.risk_delta_score}` : scenarioResult.risk_delta_score})
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* AI Decision Interpretation Commentary */}
          <div className="bg-sky-50/70 border border-sky-200 rounded-xl p-4 text-sky-950">
            <h4 className="text-xs font-bold uppercase tracking-wider text-sky-900 mb-1 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-sky-600" />
              <span>AI Decision Interpretation & Shock Assessment</span>
            </h4>
            <p className="text-xs leading-relaxed text-sky-900 font-medium">
              {scenarioResult.ai_interpretation}
            </p>
          </div>

          {/* Visual Comparison Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs">
              <h3 className="text-sm font-bold text-slate-900 mb-1">Volumetric Impact Comparison (MCM)</h3>
              <p className="text-xs text-slate-500 mb-4">Baseline vs Scenario Demand & Storage</p>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={comparisonData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="metric" tick={{ fontSize: 11 }} />
                    <YAxis unit=" MCM" tick={{ fontSize: 11 }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#0f172a',
                        borderRadius: '8px',
                        color: '#fff',
                        fontSize: '11px',
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="Baseline" fill="#94a3b8" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Scenario" fill="#0284c7" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs">
              <h3 className="text-sm font-bold text-slate-900 mb-1">Relative Severity & Utilization</h3>
              <p className="text-xs text-slate-500 mb-4">Storage percentage and 0–100 risk index shift</p>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={percentageData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="metric" tick={{ fontSize: 11 }} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#0f172a',
                        borderRadius: '8px',
                        color: '#fff',
                        fontSize: '11px',
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="Baseline" fill="#94a3b8" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Scenario" fill="#ea580c" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Actionable Scenario Directives */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs">
            <h3 className="text-sm font-bold text-slate-900 mb-3">
              Contingency Directives for {scenarioResult.scenario_name}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {scenarioResult.recommendations.map((rec, i) => (
                <RecommendationCard key={i} index={i} recommendation={rec} />
              ))}
            </div>
          </div>

          {/* Documented Limitation Note (Section 22) */}
          <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-4 text-amber-900 text-xs">
            <div className="flex items-start gap-2.5">
              <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-amber-950 uppercase tracking-wide">
                  Model Limitation & Machine Learning Architecture Notice
                </span>
                <p className="mt-1 leading-relaxed text-amber-900">
                  Tree-based regressors (Random Forest and Gradient Boosting) partition feature space using orthogonal splits
                  and do not extrapolate unbounded linear trends strongly for out-of-distribution demographic extremes (e.g., +15% population may yield a smaller incremental demand shift than a linear model).
                  Future platform iterations will integrate hybrid autoregressive neural networks (LSTM/Transformer) and population-specific demographic elasticity functions.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
