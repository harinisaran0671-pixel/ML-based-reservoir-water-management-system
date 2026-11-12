import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Droplets,
  Database,
  TrendingUp,
  AlertTriangle,
  ArrowUpRight,
  Sliders,
  Calendar,
  Layers,
  ChevronRight,
  ShieldCheck,
  Activity,
  Maximize2
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
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  ComposedChart,
  ScatterChart,
  Scatter
} from 'recharts';

import { waterApi, Reservoir } from '../services/api';
import { StatCard } from '../components/StatCard';
import { RiskBadge } from '../components/RiskBadge';
import { ChartCard } from '../components/ChartCard';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ErrorMessage } from '../components/ErrorMessage';
import { RecommendationCard } from '../components/RecommendationCard';

interface DashboardPageProps {
  selectedReservoirName: string;
  onSelectReservoir: (name: string) => void;
  reservoirs: Reservoir[];
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  selectedReservoirName,
  onSelectReservoir,
  reservoirs,
}) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<any>(null);

  const fetchDashboard = async (name: string) => {
    try {
      setLoading(true);
      setError(null);
      const res = await waterApi.getDashboard(name);
      setData(res.data);
    } catch (err: any) {
      console.error('Dashboard load error:', err);
      setError(
        err.response?.data?.detail ||
          'Unable to connect to the prediction service. Please make sure the backend is running.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedReservoirName) {
      fetchDashboard(selectedReservoirName);
    }
  }, [selectedReservoirName]);

  const handleReservoirChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    onSelectReservoir(val);
  };

  if (loading && !data) {
    return <LoadingSpinner message="Querying live reservoir storage and ML demand forecasts..." />;
  }

  if (error && !data) {
    return <ErrorMessage message={error} onRetry={() => fetchDashboard(selectedReservoirName)} />;
  }

  const selectedRes = data?.selected_reservoir || reservoirs[0] || {};
  const storagePct = selectedRes.storage_percentage ?? 60;
  const availWater = Math.max(0, (selectedRes.current_storage_mcm || 0) - (selectedRes.dead_storage_mcm || 0));

  return (
    <div className="space-y-6">
      {/* Top Banner / Reservoir Selector Toolbar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 lg:p-5 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              National Water Decision Support Cockpit
            </span>
            <span aria-hidden="true">·</span>
            <span className="text-xs text-sky-600 font-medium">14 Reservoirs Monitored</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            {selectedRes.name || 'Reservoir Monitoring'} — {selectedRes.state}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            District: {selectedRes.district} · Purpose: {selectedRes.purpose} · Capacity: {selectedRes.capacity_mcm} MCM
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
            <label htmlFor="dashboard-res-select" className="text-xs font-medium text-slate-600">
              Select Reservoir:
            </label>
            <select
              id="dashboard-res-select"
              value={selectedReservoirName}
              onChange={handleReservoirChange}
              className="bg-transparent text-xs font-bold text-slate-900 focus:outline-hidden cursor-pointer"
            >
              {reservoirs.map((r) => (
                <option key={r.id} value={r.name}>
                  {r.name} ({r.state})
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={() => navigate('/forecast')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors whitespace-nowrap"
          >
            <span>Forecast Demand</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* KPI Stat Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Reservoirs"
          value={data?.total_reservoirs || 14}
          unit="Active"
          description="Across 6 peninsular states"
          icon={Layers}
          accentColor="slate"
        />

        <StatCard
          title="Current Storage"
          value={`${storagePct}%`}
          unit={`(${selectedRes.current_storage_mcm} MCM)`}
          description={`Capacity: ${selectedRes.capacity_mcm} MCM`}
          icon={Database}
          accentColor={storagePct < 30 ? 'rose' : storagePct < 50 ? 'amber' : 'emerald'}
        />

        <StatCard
          title="Current Water Demand"
          value={selectedRes.current_demand_mcm || 420}
          unit="MCM / Month"
          description="Base requirement"
          icon={Activity}
          accentColor="blue"
        />

        <StatCard
          title="Predicted Future Demand"
          value={data?.predicted_water_demand_mcm || 450}
          unit="MCM / Month"
          description={`Horizon: ${data?.forecast_horizon || '12 Months'}`}
          icon={TrendingUp}
          accentColor="blue"
        />
      </div>

      {/* Secondary Quick Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 font-medium">Available Live Storage</span>
            <div className="text-lg font-bold font-mono text-slate-900 mt-0.5">
              {availWater.toFixed(1)} <span className="text-xs font-normal text-slate-500">MCM</span>
            </div>
            <span className="text-[11px] text-slate-400">Excludes dead storage ({selectedRes.dead_storage_mcm} MCM)</span>
          </div>
          <Droplets className="w-8 h-8 text-sky-500 p-1.5 bg-sky-50 rounded-lg" />
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 font-medium">Shortage Risk Assessment</span>
            <div className="mt-1">
              <RiskBadge
                level={selectedRes.risk_level || 'MEDIUM'}
                score={selectedRes.risk_score || 45}
                size="md"
              />
            </div>
            <span className="text-[11px] text-slate-400 mt-1 block">7-Factor Ensemble Index</span>
          </div>
          <AlertTriangle className="w-8 h-8 text-amber-500 p-1.5 bg-amber-50 rounded-lg" />
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 font-medium">Quick Scenario Simulation</span>
            <p className="text-xs text-slate-600 mt-1">Simulate severe drought or population shifts</p>
            <button
              onClick={() => navigate('/scenarios')}
              className="mt-2 text-xs font-semibold text-sky-600 hover:text-sky-700 inline-flex items-center gap-1"
            >
              <span>Launch Simulator</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
          <Sliders className="w-8 h-8 text-indigo-500 p-1.5 bg-indigo-50 rounded-lg" />
        </div>
      </div>

      {/* 6 Decision Support Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: Historical vs Predicted Demand */}
        <ChartCard
          title="1. Historical vs Predicted Water Demand"
          subtitle={`Total monthly water requirement for ${selectedRes.name} (MCM)`}
          action={
            <span className="text-[11px] text-slate-500 font-mono">
              Model: Gradient Boosting (R² ≈ 0.99)
            </span>
          }
        >
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data?.historical_trend || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '11px',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line
                  type="monotone"
                  dataKey="actual_demand"
                  name="Historical Actual (MCM)"
                  stroke="#0284c7"
                  strokeWidth={2}
                  dot={{ r: 2 }}
                />
                <Line
                  type="monotone"
                  dataKey="predicted_demand"
                  name="ML Predicted (MCM)"
                  stroke="#10b981"
                  strokeWidth={2}
                  strokeDasharray="4 4"
                  dot={{ r: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        {/* Chart 2: Reservoir Storage Trends Across Systems */}
        <ChartCard
          title="2. Reservoir Storage Level Comparison"
          subtitle="Current storage percentage across all 14 monitored reservoirs"
        >
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data?.storage_trends || []} layout="horizontal">
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 9 }} angle={-25} textAnchor="end" height={45} />
                <YAxis unit="%" domain={[0, 100]} tick={{ fontSize: 11 }} />
                <Tooltip
                  formatter={(val: any) => [`${val}%`, 'Storage Level']}
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '11px',
                  }}
                />
                <Bar dataKey="storage_percentage" name="Storage %" fill="#0284c7" radius={[4, 4, 0, 0]}>
                  {(data?.storage_trends || []).map((entry: any, index: number) => {
                    const color =
                      entry.storage_percentage < 30
                        ? '#dc2626'
                        : entry.storage_percentage < 50
                        ? '#ea580c'
                        : entry.storage_percentage < 70
                        ? '#eab308'
                        : '#16a34a';
                    return <Cell key={`cell-${index}`} fill={color} />;
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        {/* Chart 3: Demand by Sector */}
        <ChartCard
          title="3. Water Demand by Sector"
          subtitle="Apportionment across Agricultural, Domestic, Industrial, and Ecological needs"
        >
          <div className="h-64 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data?.demand_by_sector || []}
                  dataKey="value"
                  nameKey="sector"
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={3}
                  label={({ sector, percent }: any) => `${sector} (${((percent || 0) * 100).toFixed(0)}%)`}
                  labelLine={false}
                >
                  {(data?.demand_by_sector || []).map((entry: any, idx: number) => (
                    <Cell key={`sector-${idx}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(val: any) => [`${val} MCM`, 'Allocation']}
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '11px',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        {/* Chart 4: Rainfall vs Storage Correlation */}
        <ChartCard
          title="4. Catchment Rainfall vs Reservoir Storage"
          subtitle="Seasonal monsoon rainfall input vs resulting storage volume"
        >
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={data?.rainfall_vs_storage || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis yAxisId="left" unit=" mm" tick={{ fontSize: 11 }} />
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
                <Bar yAxisId="left" dataKey="rainfall_mm" name="Rainfall (mm)" fill="#38bdf8" radius={[4, 4, 0, 0]} />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="storage_percentage"
                  name="Storage %"
                  stroke="#059669"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        {/* Chart 5: Population vs Water Demand */}
        <ChartCard
          title="5. Population Growth vs Total Water Demand"
          subtitle="Demographic pressure trajectory correlated with consumptive demand"
        >
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data?.population_vs_demand || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis yAxisId="pop" unit=" M" tick={{ fontSize: 11 }} />
                <YAxis yAxisId="dem" orientation="right" unit=" MCM" tick={{ fontSize: 11 }} />
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
                  yAxisId="pop"
                  type="monotone"
                  dataKey="population_mil"
                  name="Population (Millions)"
                  stroke="#6366f1"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  yAxisId="dem"
                  type="monotone"
                  dataKey="demand_mcm"
                  name="Total Demand (MCM)"
                  stroke="#ea580c"
                  strokeWidth={2}
                  dot={{ r: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        {/* Chart 6: Risk Distribution Across Reservoirs */}
        <ChartCard
          title="6. System-Wide Risk Classification"
          subtitle="Distribution of 14 reservoirs by 7-factor water stress risk tier"
        >
          <div className="h-64 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data?.risk_distribution || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} unit=" res" tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '11px',
                  }}
                />
                <Bar dataKey="count" name="Number of Reservoirs" radius={[4, 4, 0, 0]}>
                  {(data?.risk_distribution || []).map((entry: any, index: number) => (
                    <Cell key={`risk-cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      </div>

      {/* AI Decision Support Recommendations */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900 tracking-tight">
              Actionable AI Decision Directives for {selectedRes.name}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Dynamically derived from real-time storage metrics, forecasted demand deficit, and seasonal rule curves.
            </p>
          </div>
          <RiskBadge level={selectedRes.risk_level || 'MEDIUM'} score={selectedRes.risk_score} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {(data?.recommendations || []).map((rec: string, idx: number) => (
            <RecommendationCard key={idx} index={idx} recommendation={rec} />
          ))}
        </div>
      </div>
    </div>
  );
};
