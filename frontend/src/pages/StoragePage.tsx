import React, { useState, useEffect } from 'react';
import {
  Database,
  ArrowRight,
  TrendingDown,
  TrendingUp,
  AlertOctagon,
  Droplets,
  Plus,
  Minus,
  Equal,
  ShieldCheck,
  CheckCircle2
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
  Cell,
  LineChart,
  Line
} from 'recharts';

import { waterApi, Reservoir } from '../services/api';
import { StatCard } from '../components/StatCard';
import { RiskBadge } from '../components/RiskBadge';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ErrorMessage } from '../components/ErrorMessage';

interface StoragePageProps {
  selectedReservoirName: string;
  onSelectReservoir: (name: string) => void;
  reservoirs: Reservoir[];
}

export const StoragePage: React.FC<StoragePageProps> = ({
  selectedReservoirName,
  onSelectReservoir,
  reservoirs,
}) => {
  const currentRes = reservoirs.find((r) => r.name === selectedReservoirName) || reservoirs[0] || {};

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [assessment, setAssessment] = useState<any>(null);

  // Water balance interactive inputs
  const [inflow, setInflow] = useState(140);
  const [domestic, setDomestic] = useState(45);
  const [agri, setAgri] = useState(120);
  const [industrial, setIndustrial] = useState(25);
  const [ecological, setEcological] = useState(15);
  const [evaporation, setEvaporation] = useState(18);

  const fetchStorageAssessment = async () => {
    try {
      setLoading(true);
      setError(null);
      const payload = {
        reservoir_name: currentRes.name || 'Bhavanisagar',
        current_storage_mcm: currentRes.current_storage_mcm || 650,
        reservoir_capacity_mcm: currentRes.capacity_mcm || 928,
        inflow_mcm: Number(inflow),
        domestic_demand_mcm: Number(domestic),
        agricultural_demand_mcm: Number(agri),
        industrial_demand_mcm: Number(industrial),
        ecological_requirement_mcm: Number(ecological),
        evaporation_mcm: Number(evaporation),
      };

      const res = await waterApi.assessStorage(payload);
      setAssessment(res.data);
    } catch (err: any) {
      console.error('Storage assessment error:', err);
      setError(err.response?.data?.detail || 'Failed to calculate water balance from backend.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentRes.name) {
      fetchStorageAssessment();
    }
  }, [currentRes, inflow, domestic, agri, industrial, ecological, evaporation]);

  const cap = currentRes.capacity_mcm || 1000;
  const currSt = currentRes.current_storage_mcm || 600;
  const currPct = Math.round((currSt / cap) * 100);

  // Water balance formula components
  const balanceComponents = [
    { label: 'Current Storage', value: currSt, sign: 'base', color: 'text-sky-700 bg-sky-50' },
    { label: 'Inflow', value: inflow, sign: '+', color: 'text-emerald-700 bg-emerald-50' },
    { label: 'Domestic Demand', value: domestic, sign: '-', color: 'text-rose-700 bg-rose-50' },
    { label: 'Agricultural Demand', value: agri, sign: '-', color: 'text-amber-700 bg-amber-50' },
    { label: 'Industrial Demand', value: industrial, sign: '-', color: 'text-indigo-700 bg-indigo-50' },
    { label: 'Ecological Requirement', value: ecological, sign: '-', color: 'text-purple-700 bg-purple-50' },
    { label: 'Evaporation', value: evaporation, sign: '-', color: 'text-slate-700 bg-slate-100' },
    {
      label: 'Future Storage',
      value: assessment?.future_storage_mcm ?? Math.max(0, currSt + inflow - (domestic + agri + industrial + ecological + evaporation)),
      sign: '=',
      color: 'text-blue-900 bg-blue-100 font-bold',
    },
  ];

  const breakdownBarData = [
    { name: 'Inflow Addition', volume: inflow, type: 'Addition' },
    { name: 'Domestic', volume: domestic, type: 'Outflow' },
    { name: 'Agricultural', volume: agri, type: 'Outflow' },
    { name: 'Industrial', volume: industrial, type: 'Outflow' },
    { name: 'Ecological', volume: ecological, type: 'Outflow' },
    { name: 'Evaporation', volume: evaporation, type: 'Outflow' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Reservoir Storage Assessment & Water Balance</h1>
          <p className="text-xs text-slate-500 mt-1">
            Hydrological equation model computing future capacity, net drawdown rate, and dead-storage threshold protection.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
          <label className="text-xs font-medium text-slate-600">Select Reservoir:</label>
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

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Capacity"
          value={cap}
          unit="MCM"
          description={`Dead Storage: ${currentRes.dead_storage_mcm || 50} MCM`}
          icon={Database}
          accentColor="slate"
        />

        <StatCard
          title="Current Storage"
          value={currSt}
          unit={`MCM (${currPct}%)`}
          description="Live basin measurement"
          icon={Droplets}
          accentColor={currPct < 30 ? 'rose' : currPct < 50 ? 'amber' : 'emerald'}
        />

        <StatCard
          title="Projected Future Storage"
          value={assessment?.future_storage_mcm ?? currSt}
          unit={`MCM (${assessment?.future_storage_percentage ?? currPct}%)`}
          description={
            assessment?.net_storage_change_mcm >= 0
              ? `+${assessment?.net_storage_change_mcm} MCM net gain`
              : `${assessment?.net_storage_change_mcm} MCM drawdown`
          }
          icon={assessment?.net_storage_change_mcm >= 0 ? TrendingUp : TrendingDown}
          accentColor={assessment?.future_storage_percentage < 30 ? 'rose' : 'blue'}
        />

        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Reservoir Risk Status
          </span>
          <div className="my-2">
            <RiskBadge level={assessment?.risk_level || currentRes.risk_level || 'MEDIUM'} size="lg" />
          </div>
          <span className="text-[11px] text-slate-500">
            Storage Gap: {assessment?.storage_gap_mcm || 0} MCM
          </span>
        </div>
      </div>

      {/* Water Balance Equation Visualizer */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900 tracking-tight">
              Hydrological Water Balance Equation
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Future Storage = Current Storage + Inflow - (Domestic + Agri + Industrial + Ecological + Evaporation)
            </p>
          </div>
          <span className="text-xs font-mono font-semibold text-sky-700 bg-sky-50 px-2 py-1 rounded">
            Non-Negative Guard Active
          </span>
        </div>

        {/* Visual Formula Flow */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2 p-3 bg-slate-50 rounded-xl border border-slate-200 mb-6">
          {balanceComponents.map((c, i) => (
            <div key={i} className="flex flex-col items-center justify-center p-2.5 rounded-lg bg-white border border-slate-200 text-center">
              <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-tight truncate w-full">
                {c.label}
              </span>
              <span className="text-base font-bold font-mono tabular-nums text-slate-900 mt-1">
                {typeof c.value === 'number' ? c.value.toFixed(1) : c.value}
              </span>
              <span className="text-[10px] text-slate-400">MCM</span>
              {c.sign !== 'base' && (
                <span
                  className={`mt-1 text-xs font-bold px-1.5 py-0.2 rounded font-mono ${
                    c.sign === '+'
                      ? 'text-emerald-700 bg-emerald-100'
                      : c.sign === '-'
                      ? 'text-rose-700 bg-rose-100'
                      : 'text-blue-700 bg-blue-100'
                  }`}
                >
                  {c.sign}
                </span>
              )}
            </div>
          ))}
        </div>

        {/* Interactive Inflow/Outflow Sliders */}
        <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">
          Adjust Monthly Water Balance Parameters (MCM)
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <div>
            <label className="text-xs font-medium text-emerald-700 flex justify-between">
              <span>Inflow</span>
              <span className="font-mono font-bold">{inflow} MCM</span>
            </label>
            <input
              type="range"
              min={0}
              max={600}
              value={inflow}
              onChange={(e) => setInflow(Number(e.target.value))}
              className="w-full accent-emerald-600 mt-1"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-rose-700 flex justify-between">
              <span>Domestic Demand</span>
              <span className="font-mono font-bold">{domestic} MCM</span>
            </label>
            <input
              type="range"
              min={0}
              max={200}
              value={domestic}
              onChange={(e) => setDomestic(Number(e.target.value))}
              className="w-full accent-rose-600 mt-1"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-amber-700 flex justify-between">
              <span>Agricultural Demand</span>
              <span className="font-mono font-bold">{agri} MCM</span>
            </label>
            <input
              type="range"
              min={0}
              max={400}
              value={agri}
              onChange={(e) => setAgri(Number(e.target.value))}
              className="w-full accent-amber-600 mt-1"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-indigo-700 flex justify-between">
              <span>Industrial Demand</span>
              <span className="font-mono font-bold">{industrial} MCM</span>
            </label>
            <input
              type="range"
              min={0}
              max={150}
              value={industrial}
              onChange={(e) => setIndustrial(Number(e.target.value))}
              className="w-full accent-indigo-600 mt-1"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-purple-700 flex justify-between">
              <span>Ecological Flow</span>
              <span className="font-mono font-bold">{ecological} MCM</span>
            </label>
            <input
              type="range"
              min={0}
              max={60}
              value={ecological}
              onChange={(e) => setEcological(Number(e.target.value))}
              className="w-full accent-purple-600 mt-1"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-slate-700 flex justify-between">
              <span>Evaporation Loss</span>
              <span className="font-mono font-bold">{evaporation} MCM</span>
            </label>
            <input
              type="range"
              min={0}
              max={70}
              value={evaporation}
              onChange={(e) => setEvaporation(Number(e.target.value))}
              className="w-full accent-slate-600 mt-1"
            />
          </div>
        </div>
      </div>

      {/* Breakdown Bar Chart */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs">
        <h3 className="text-sm font-bold text-slate-900 tracking-tight mb-1">
          Water Inflow Additions vs Consumptive Draft Breakdown
        </h3>
        <p className="text-xs text-slate-500 mb-4">
          Comparing the replenishment volume with competing sector requirements
        </p>

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={breakdownBarData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis unit=" MCM" tick={{ fontSize: 11 }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0f172a',
                  borderRadius: '8px',
                  color: '#fff',
                  fontSize: '11px',
                }}
              />
              <Bar dataKey="volume" name="Volume (MCM)" radius={[4, 4, 0, 0]}>
                {breakdownBarData.map((entry, index) => (
                  <Cell
                    key={`bar-${index}`}
                    fill={entry.type === 'Addition' ? '#10b981' : '#f43f5e'}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
