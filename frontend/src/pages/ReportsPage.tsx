import React, { useState } from 'react';
import {
  FileText,
  Download,
  Sparkles,
  CheckCircle2,
  Calendar,
  Layers,
  Database,
  Printer,
  ExternalLink,
  AlertTriangle,
  FileCheck
} from 'lucide-react';

import { waterApi, Reservoir } from '../services/api';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ErrorMessage } from '../components/ErrorMessage';

interface ReportsPageProps {
  selectedReservoirName: string;
  onSelectReservoir: (name: string) => void;
  reservoirs: Reservoir[];
}

export const ReportsPage: React.FC<ReportsPageProps> = ({
  selectedReservoirName,
  onSelectReservoir,
  reservoirs,
}) => {
  const currentRes = reservoirs.find((r) => r.name === selectedReservoirName) || reservoirs[0] || {};

  const [reservoir, setReservoir] = useState(currentRes.name || 'Bhavanisagar');
  const [horizon, setHorizon] = useState(12);
  const [scenario, setScenario] = useState('Normal Conditions');
  const [notes, setNotes] = useState('Quarterly water resource allocation review for state irrigation authority.');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reportResult, setReportResult] = useState<any>(null);

  const handleGenerateReport = async () => {
    try {
      setLoading(true);
      setError(null);
      setReportResult(null);

      const payload = {
        reservoir_name: reservoir,
        forecast_horizon_months: Number(horizon),
        scenario_name: scenario,
        notes: notes,
      };

      const res = await waterApi.generateReport(payload);
      setReportResult(res.data);
    } catch (err: any) {
      console.error('Report error:', err);
      setError(err.response?.data?.detail || 'Failed to generate PDF assessment report on backend.');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (!reportResult?.download_url) return;
    const downloadUrl = waterApi.getDownloadUrl(reportResult.pdf_filename);
    window.location.href = downloadUrl;
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Official Water Resource Assessment Reports
          </span>
          <span aria-hidden="true">·</span>
          <span className="text-xs text-sky-600 font-medium">CWC / Ministry Format</span>
        </div>
        <h1 className="text-xl font-bold text-slate-900 tracking-tight">
          Decision Support PDF Report Generator
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Generate publication-ready PDF assessments compiling reservoir storage metrics, ML forecast trajectories, stress scenarios, and engineering directives.
        </p>
      </div>

      {/* Generation Form */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-2xs">
        <h2 className="text-sm font-bold text-slate-900 mb-4">Report Parameters Configuration</h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          {/* Reservoir */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Target Reservoir</label>
            <select
              value={reservoir}
              onChange={(e) => {
                setReservoir(e.target.value);
                onSelectReservoir(e.target.value);
              }}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-medium text-slate-800 focus:outline-sky-500"
            >
              {reservoirs.map((r) => (
                <option key={r.id} value={r.name}>
                  {r.name} ({r.state})
                </option>
              ))}
            </select>
          </div>

          {/* Forecast Horizon */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Forecast Horizon</label>
            <select
              value={horizon}
              onChange={(e) => setHorizon(Number(e.target.value))}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-medium text-slate-800 focus:outline-sky-500"
            >
              <option value={1}>1 Month (Immediate)</option>
              <option value={3}>3 Months (Seasonal)</option>
              <option value={6}>6 Months (Half-Year)</option>
              <option value={12}>12 Months (Annual Assessment)</option>
              <option value={24}>24 Months (Biennial)</option>
            </select>
          </div>

          {/* Scenario */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Simulation Scenario</label>
            <select
              value={scenario}
              onChange={(e) => setScenario(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-medium text-slate-800 focus:outline-sky-500"
            >
              <option value="Normal Conditions">Normal Conditions (Baseline)</option>
              <option value="Population Growth">Population Growth (+15%)</option>
              <option value="Low Rainfall">Low Rainfall (-30% Rain)</option>
              <option value="Drought">Drought (-50% Rain, +2.5°C Heat)</option>
              <option value="Extreme Rainfall">Extreme Rainfall (+60% Rain)</option>
              <option value="High Agricultural Demand">High Agricultural Demand (+35%)</option>
              <option value="Combined Climate Stress">Combined Climate Stress</option>
            </select>
          </div>
        </div>

        {/* Notes */}
        <div className="mb-4">
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Planners Notes / Administrative Context
          </label>
          <textarea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-sky-500"
            placeholder="Enter administrative notes, local allocation constraints, or meeting references..."
          />
        </div>

        <button
          onClick={handleGenerateReport}
          disabled={loading}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors disabled:opacity-50"
        >
          <Sparkles className="w-4 h-4" />
          <span>{loading ? 'Compiling Official PDF Report...' : 'Generate Report'}</span>
        </button>
      </div>

      {loading && <LoadingSpinner message="Rendering vector tables, water-balance matrices & directives in ReportLab..." />}
      {error && <ErrorMessage message={error} onRetry={handleGenerateReport} />}

      {/* Report Generated Card */}
      {reportResult && !loading && (
        <div className="bg-emerald-50 border-2 border-emerald-200 rounded-xl p-6 shadow-xs animate-in fade-in">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="w-12 h-12 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                <FileCheck className="w-6 h-6" />
              </div>
              <div>
                <span className="text-xs font-bold text-emerald-800 uppercase tracking-wide">
                  Report generated successfully
                </span>
                <h3 className="text-base font-bold text-emerald-950 mt-0.5">
                  {reportResult.pdf_filename}
                </h3>
                <p className="text-xs text-emerald-800/80 mt-1">
                  Ready for official dissemination. Includes water demand forecast, storage rule curves, and AI recommendations.
                </p>
              </div>
            </div>

            <button
              onClick={handleDownload}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors whitespace-nowrap"
            >
              <Download className="w-4 h-4" />
              <span>Download PDF Report</span>
            </button>
          </div>
        </div>
      )}

      {/* Information Checklist */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs">
        <h3 className="text-sm font-bold text-slate-900 mb-3">Report Document Standard Inclusions</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 text-xs text-slate-600">
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
            <span className="font-semibold text-slate-900 block mb-1">1. Basin Identification</span>
            <span>Reservoir name, latitude/longitude, command district, storage capacity, and live elevation.</span>
          </div>

          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
            <span className="font-semibold text-slate-900 block mb-1">2. ML Forecast Ledger</span>
            <span>Monthly predicted water demand and water-balance storage projections up to the specified horizon.</span>
          </div>

          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
            <span className="font-semibold text-slate-900 block mb-1">3. Stress Shock Profile</span>
            <span>Comparative analysis under baseline vs selected meteorological or demographic drought scenario.</span>
          </div>

          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
            <span className="font-semibold text-slate-900 block mb-1">4. Action Directives</span>
            <span>Actionable municipal curtailment, irrigation rationing, and managed aquifer recharge instructions.</span>
          </div>
        </div>
      </div>
    </div>
  );
};
