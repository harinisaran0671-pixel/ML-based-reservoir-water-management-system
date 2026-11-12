import React, { useState, useEffect } from 'react';
import {
  AlertOctagon,
  ShieldCheck,
  AlertTriangle,
  Flame,
  ArrowRight,
  TrendingDown,
  Info,
  CheckCircle2,
  RefreshCw
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar
} from 'recharts';

import { waterApi, Reservoir } from '../services/api';
import { RiskBadge } from '../components/RiskBadge';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ErrorMessage } from '../components/ErrorMessage';
import { RecommendationCard } from '../components/RecommendationCard';

interface RiskPageProps {
  selectedReservoirName: string;
  onSelectReservoir: (name: string) => void;
  reservoirs: Reservoir[];
}

export const RiskPage: React.FC<RiskPageProps> = ({
  selectedReservoirName,
  onSelectReservoir,
  reservoirs,
}) => {
  const currentRes = reservoirs.find((r) => r.name === selectedReservoirName) || reservoirs[0] || {};

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [riskData, setRiskData] = useState<any>(null);

  const fetchRisk = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await waterApi.analyzeRisk(currentRes.name || 'Bhavanisagar');
      setRiskData(res.data);
    } catch (err: any) {
      console.error('Risk analysis error:', err);
      setError(err.response?.data?.detail || 'Failed to fetch risk assessment from backend.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentRes.name) {
      fetchRisk();
    }
  }, [currentRes]);

  const factors = riskData?.factors || [
    { name: 'Storage Level', score: 65, weight: '25%' },
    { name: 'Demand-to-Storage Ratio', score: 55, weight: '25%' },
    { name: 'Inflow Deficit', score: 40, weight: '15%' },
    { name: 'Rainfall Deficit', score: 50, weight: '15%' },
    { name: 'Drought Index (SPI)', score: 35, weight: '10%' },
    { name: 'Temperature / Evaporation', score: 60, weight: '5%' },
    { name: 'Population Pressure', score: 45, weight: '5%' },
  ];

  const radarData = factors.map((f: any) => ({
    subject: f.name.replace(' (SPI)', ''),
    score: f.score,
    fullMark: 100,
  }));

  const riskScore = riskData?.risk_score ?? 45;
  const riskLevel = riskData?.risk_level ?? 'MEDIUM';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Water Shortage Risk Assessment Engine</h1>
          <p className="text-xs text-slate-500 mt-1">
            Multivariate composite index analyzing 7 hydrological & socio-economic vulnerabilities (0–100 score).
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

      {loading && <LoadingSpinner message="Calculating 7-factor water vulnerability index..." />}
      {error && <ErrorMessage message={error} onRetry={fetchRisk} />}

      {/* Main Scorecard Banner */}
      {!loading && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Gauge & Risk Classification */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-2xs flex flex-col items-center justify-center text-center">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
              Composite Water Shortage Index
            </span>
            <div className="relative my-4 flex items-center justify-center">
              <div className="w-36 h-36 rounded-full border-8 border-slate-100 flex flex-col items-center justify-center shadow-inner">
                <span className="text-4xl font-extrabold font-mono tabular-nums text-slate-900">
                  {riskScore}
                </span>
                <span className="text-xs text-slate-400 font-mono">/ 100</span>
              </div>
            </div>

            <div className="mb-3">
              <RiskBadge level={riskLevel} score={riskScore} size="lg" />
            </div>

            <p className="text-xs text-slate-500 max-w-xs leading-relaxed">
              Target: <span className="font-semibold text-slate-800">{currentRes.name}</span> ({currentRes.state}).
              Capacity: {currentRes.capacity_mcm} MCM, Current Storage: {currentRes.current_storage_mcm} MCM.
            </p>
          </div>

          {/* Radar Visualization */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs flex flex-col">
            <h3 className="text-sm font-bold text-slate-900 mb-1">7 Contributing Risk Drivers Radar</h3>
            <p className="text-xs text-slate-500 mb-2">Normalized vulnerability across all 7 evaluation vectors</p>

            <div className="flex-1 w-full h-64">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData}>
                  <PolarGrid stroke="#e2e8f0" />
                  <PolarAngleAxis dataKey="subject" tick={{ fontSize: 9, fill: '#475569' }} />
                  <PolarRadiusAxis domain={[0, 100]} tick={{ fontSize: 9 }} />
                  <Radar
                    name="Risk Driver Score"
                    dataKey="score"
                    stroke="#0284c7"
                    fill="#38bdf8"
                    fillOpacity={0.4}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderRadius: '8px',
                      color: '#fff',
                      fontSize: '11px',
                    }}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Top Risk Drivers & Risk Tiers Explanation */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs flex flex-col justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 mb-1">Primary Stress Contributors</h3>
              <p className="text-xs text-slate-500 mb-4">Ranked by weighted contribution to total risk score</p>

              <div className="space-y-2.5">
                {(riskData?.main_risk_factors || [
                  'Storage Level Deficit',
                  'High Demand-to-Storage Ratio',
                  'Monsoon Rainfall Lag',
                ]).map((factor: string, idx: number) => (
                  <div
                    key={idx}
                    className="flex items-center gap-2.5 p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs font-medium text-slate-800"
                  >
                    <span className="w-5 h-5 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center font-bold text-[10px] shrink-0 font-mono">
                      {idx + 1}
                    </span>
                    <span className="truncate">{factor}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-slate-100 text-[11px] text-slate-500 space-y-1">
              <div className="flex justify-between">
                <span>0–34: Low Risk</span>
                <span className="font-semibold text-emerald-600">Adequate Reserves</span>
              </div>
              <div className="flex justify-between">
                <span>35–54: Medium Risk</span>
                <span className="font-semibold text-amber-600">Standard Rule Curves</span>
              </div>
              <div className="flex justify-between">
                <span>55–74: High Risk</span>
                <span className="font-semibold text-orange-600">Consumptive Rationing</span>
              </div>
              <div className="flex justify-between">
                <span>75–100: Critical Risk</span>
                <span className="font-semibold text-rose-600">Emergency Curtailment</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Horizontal Bar Breakdown of the 7 Factors */}
      {!loading && (
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs">
          <h3 className="text-sm font-bold text-slate-900 mb-1">
            Granular Breakdown of the 7 Vulnerability Factors
          </h3>
          <p className="text-xs text-slate-500 mb-4">
            Component weightages specified in the CWC Decision Support Methodology
          </p>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={factors} layout="vertical" margin={{ left: 40, right: 30 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                <XAxis type="number" domain={[0, 100]} unit="/100" tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={160} />
                <Tooltip
                  formatter={(val: any, name: any, item: any) => [
                    `${val}/100 (Weight: ${item.payload.weight})`,
                    'Factor Severity',
                  ]}
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '11px',
                  }}
                />
                <Bar dataKey="score" radius={[0, 4, 4, 0]}>
                  {factors.map((f: any, i: number) => {
                    const color =
                      f.score >= 75
                        ? '#dc2626'
                        : f.score >= 55
                        ? '#ea580c'
                        : f.score >= 35
                        ? '#eab308'
                        : '#10b981';
                    return <Cell key={`bar-${i}`} fill={color} />;
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Recommended Actions directly from Backend */}
      {!loading && (
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 tracking-tight">
                Recommended Actions for {currentRes.name}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Official mitigation directives provided directly by the backend risk evaluation model.
              </p>
            </div>
            <button
              onClick={fetchRisk}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Refresh Directives</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {(riskData?.recommended_actions || []).map((action: string, idx: number) => (
              <RecommendationCard key={idx} index={idx} recommendation={action} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
