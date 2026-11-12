import React, { useState, useEffect } from 'react';
import { Menu, Droplet, RefreshCw, Calendar, CheckCircle2, AlertCircle } from 'lucide-react';
import { Reservoir, waterApi } from '../services/api';

interface HeaderProps {
  onToggleSidebar?: () => void;
  selectedReservoir?: string;
  onSelectReservoir?: (name: string) => void;
  reservoirs?: Reservoir[];
}

export const Header: React.FC<HeaderProps> = ({
  onToggleSidebar,
  selectedReservoir,
  onSelectReservoir,
  reservoirs = [],
}) => {
  const [currentDate, setCurrentDate] = useState('');
  const [backendOnline, setBackendOnline] = useState<boolean | null>(null);

  useEffect(() => {
    const updateDateTime = () => {
      const now = new Date();
      setCurrentDate(
        now.toLocaleDateString('en-IN', {
          weekday: 'short',
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        })
      );
    };
    updateDateTime();
    const timer = setInterval(updateDateTime, 60000);

    // Check health
    waterApi
      .getHealth()
      .then(() => setBackendOnline(true))
      .catch(() => setBackendOnline(false));

    return () => clearInterval(timer);
  }, []);

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-4 lg:px-6 flex items-center justify-between gap-4 sticky top-0 z-20">
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="lg:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100"
          aria-label="Toggle navigation"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-slate-900 tracking-tight hidden sm:inline">
            AquaPredict AI
          </span>
          <span className="text-slate-300 hidden sm:inline">/</span>
          <span className="text-xs font-medium text-slate-500">
            Water Resource Management System
          </span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Reservoir Selector dropdown */}
        {reservoirs.length > 0 && onSelectReservoir && (
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5">
            <Droplet className="w-3.5 h-3.5 text-sky-600 shrink-0" />
            <span className="text-xs font-medium text-slate-600 hidden md:inline">Reservoir:</span>
            <select
              value={selectedReservoir}
              onChange={(e) => onSelectReservoir(e.target.value)}
              className="bg-transparent text-xs font-semibold text-slate-800 focus:outline-hidden cursor-pointer"
            >
              {reservoirs.map((r) => (
                <option key={r.id} value={r.name}>
                  {r.name} ({r.state})
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Date Display */}
        <div className="hidden md:flex items-center gap-1.5 text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5">
          <Calendar className="w-3.5 h-3.5 text-slate-400" />
          <span className="font-mono tabular-nums">{currentDate}</span>
        </div>

        {/* Backend Connectivity Status */}
        <div
          className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border font-medium ${
            backendOnline === true
              ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
              : backendOnline === false
              ? 'bg-rose-50 border-rose-200 text-rose-700'
              : 'bg-slate-50 border-slate-200 text-slate-500'
          }`}
          title={backendOnline ? 'Connected to FastAPI & ML Engine' : 'Backend offline or connecting'}
        >
          {backendOnline === true ? (
            <>
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span className="hidden sm:inline">Backend Live</span>
            </>
          ) : backendOnline === false ? (
            <>
              <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
              <span className="hidden sm:inline">Offline</span>
            </>
          ) : (
            <>
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-slate-400" />
              <span className="hidden sm:inline">Connecting</span>
            </>
          )}
        </div>
      </div>
    </header>
  );
};
