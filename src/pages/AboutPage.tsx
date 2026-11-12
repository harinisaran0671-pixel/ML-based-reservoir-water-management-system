import React from 'react';
import {
  Info,
  Droplets,
  Layers,
  Cpu,
  Database,
  ShieldCheck,
  AlertTriangle,
  FileText,
  ExternalLink,
  Sliders,
  CheckCircle2,
  TrendingUp
} from 'lucide-react';

export const AboutPage: React.FC = () => {
  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Hero Header */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-2xs">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-sky-600 bg-sky-50 px-2.5 py-1 rounded">
            Smart India Hackathon · SIH1692
          </span>
          <span aria-hidden="true">·</span>
          <span className="text-xs text-slate-500 font-medium">Ministry of Jal Shakti</span>
        </div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
          AquaPredict AI
        </h1>
        <p className="text-sm font-medium text-slate-600 mt-1">
          AI-Based Water Demand Forecasting and Reservoir Storage Decision Support System
        </p>

        {/* DEMO DATA DISCLAIMER */}
        <div className="mt-4 p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start gap-3">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold uppercase tracking-wider text-amber-950 block">
              DEMO / SYNTHETIC DATA NOTICE
            </span>
            <p className="mt-0.5 leading-relaxed text-amber-900">
              The dataset utilized in this demonstration consists of <strong>3,659 synthetic monthly records</strong> spanning 14 major reservoirs across 6 Indian states.
              It is designed exclusively for evaluating the algorithmic machine learning pipeline, water-balance equations, and decision support interface.
              <strong>It is not official government data from the Central Water Commission (CWC) or state irrigation departments.</strong>
            </p>
          </div>
        </div>
      </div>

      {/* Problem & Solution Architecture */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs">
          <h2 className="text-sm font-bold text-slate-900 mb-2 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-rose-500" />
            <span>The Challenge (SIH1692)</span>
          </h2>
          <p className="text-xs text-slate-600 leading-relaxed space-y-2">
            Indian water resource managers confront growing population pressures, volatile monsoon patterns driven by climate change, and conflicting inter-sectoral demands between agriculture, drinking water, and industries. Traditional static rule curves struggle to anticipate demand shocks before reservoir depletion reaches critical thresholds.
          </p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs">
          <h2 className="text-sm font-bold text-slate-900 mb-2 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>The AquaPredict AI Solution</span>
          </h2>
          <p className="text-xs text-slate-600 leading-relaxed">
            AquaPredict AI provides an end-to-end decision support platform that combines chronologically validated machine learning regressors with rigorous water-balance storage accounting. It models consumptive demand up to 5 years, tracks 7-factor shortage vulnerabilities, simulates policy shocks (what-if scenarios), and generates automated CWC-style reports.
          </p>
        </div>
      </div>

      {/* Core Architectural Modules */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs">
        <h2 className="text-sm font-bold text-slate-900 mb-4">Core Platform Modules</h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg">
            <div className="flex items-center gap-2 text-sky-700 font-bold mb-1">
              <TrendingUp className="w-4 h-4" />
              <span>Demand Forecasting</span>
            </div>
            <p className="text-slate-600 leading-relaxed text-[11px]">
              Gradient Boosting ensemble predicting monthly domestic, industrial, and agricultural water requirements based on climate, command area, and temporal lags.
            </p>
          </div>

          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg">
            <div className="flex items-center gap-2 text-indigo-700 font-bold mb-1">
              <Database className="w-4 h-4" />
              <span>Storage Assessment</span>
            </div>
            <p className="text-slate-600 leading-relaxed text-[11px]">
              Physical water balance: Storage = Current + Inflow - (Demand + Evaporation + Ecological Release), enforcing non-negative dead storage constraints.
            </p>
          </div>

          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg">
            <div className="flex items-center gap-2 text-rose-700 font-bold mb-1">
              <ShieldCheck className="w-4 h-4" />
              <span>7-Factor Risk Engine</span>
            </div>
            <p className="text-slate-600 leading-relaxed text-[11px]">
              Continuous 0–100 vulnerability score evaluating storage depth, demand gap, rainfall deficit, inflow lag, drought index (SPI), temperature, and population pressure.
            </p>
          </div>

          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg">
            <div className="flex items-center gap-2 text-amber-700 font-bold mb-1">
              <Sliders className="w-4 h-4" />
              <span>Scenario Simulator</span>
            </div>
            <p className="text-slate-600 leading-relaxed text-[11px]">
              Re-executes the machine learning inference pipeline with altered inputs (e.g. -50% rainfall, +2.5°C heat) to evaluate climate resilience before crises occur.
            </p>
          </div>

          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg">
            <div className="flex items-center gap-2 text-emerald-700 font-bold mb-1">
              <Layers className="w-4 h-4" />
              <span>Geospatial Basin Map</span>
            </div>
            <p className="text-slate-600 leading-relaxed text-[11px]">
              Leaflet + OpenStreetMap displaying 14 peninsular reservoirs with dynamic status color markers reflecting real-time capacity and stress levels.
            </p>
          </div>

          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg">
            <div className="flex items-center gap-2 text-purple-700 font-bold mb-1">
              <FileText className="w-4 h-4" />
              <span>Automated Reports</span>
            </div>
            <p className="text-slate-600 leading-relaxed text-[11px]">
              Server-side PDF generation using ReportLab, compiling forecasts, rule curves, and actionable water-resource engineering directives for official distribution.
            </p>
          </div>
        </div>
      </div>

      {/* Technology Stack Grid */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs">
        <h2 className="text-sm font-bold text-slate-900 mb-3">Technology Stack Specification</h2>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="p-3 rounded-lg border border-slate-200 bg-slate-50">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Frontend</span>
            <span className="font-semibold text-slate-900 text-sm">React 19 + Vite</span>
            <span className="text-[11px] text-slate-500 block mt-0.5">Tailwind CSS, React Router</span>
          </div>

          <div className="p-3 rounded-lg border border-slate-200 bg-slate-50">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Backend</span>
            <span className="font-semibold text-slate-900 text-sm">Python FastAPI</span>
            <span className="text-[11px] text-slate-500 block mt-0.5">Uvicorn, Pydantic v2, REST</span>
          </div>

          <div className="p-3 rounded-lg border border-slate-200 bg-slate-50">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Machine Learning</span>
            <span className="font-semibold text-slate-900 text-sm">Scikit-Learn</span>
            <span className="text-[11px] text-slate-500 block mt-0.5">Gradient Boosting, RF, LR</span>
          </div>

          <div className="p-3 rounded-lg border border-slate-200 bg-slate-50">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Database</span>
            <span className="font-semibold text-slate-900 text-sm">SQLite + SQLAlchemy</span>
            <span className="text-[11px] text-slate-500 block mt-0.5">ORM, 3,659 Ledger Rows</span>
          </div>

          <div className="p-3 rounded-lg border border-slate-200 bg-slate-50">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Visualizations</span>
            <span className="font-semibold text-slate-900 text-sm">Recharts</span>
            <span className="text-[11px] text-slate-500 block mt-0.5">Composed, Line, Bar, Pie</span>
          </div>

          <div className="p-3 rounded-lg border border-slate-200 bg-slate-50">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Geospatial</span>
            <span className="font-semibold text-slate-900 text-sm">Leaflet + React-Leaflet</span>
            <span className="text-[11px] text-slate-500 block mt-0.5">OpenStreetMap Tiles</span>
          </div>

          <div className="p-3 rounded-lg border border-slate-200 bg-slate-50">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Report Engine</span>
            <span className="font-semibold text-slate-900 text-sm">ReportLab PDF</span>
            <span className="text-[11px] text-slate-500 block mt-0.5">Server-side rendering</span>
          </div>

          <div className="p-3 rounded-lg border border-slate-200 bg-slate-50">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Testing</span>
            <span className="font-semibold text-slate-900 text-sm">Pytest (15 Tests)</span>
            <span className="text-[11px] text-slate-500 block mt-0.5">100% Core Passes</span>
          </div>
        </div>
      </div>
    </div>
  );
};
