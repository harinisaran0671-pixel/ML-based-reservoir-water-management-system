import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  TrendingUp,
  Database,
  AlertOctagon,
  Sliders,
  MapPin,
  TableProperties,
  Cpu,
  FileText,
  Info,
  Droplets,
  ExternalLink
} from 'lucide-react';

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

const NAV_ITEMS = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/forecast', label: 'Water Demand Forecast', icon: TrendingUp },
  { path: '/storage', label: 'Reservoir Storage', icon: Database },
  { path: '/risk', label: 'Risk Analysis', icon: AlertOctagon },
  { path: '/scenarios', label: 'Scenario Simulator', icon: Sliders },
  { path: '/map', label: 'Reservoir Map', icon: MapPin },
  { path: '/history', label: 'Historical Data', icon: TableProperties },
  { path: '/models', label: 'Model Performance', icon: Cpu },
  { path: '/reports', label: 'Reports', icon: FileText },
  { path: '/about', label: 'About', icon: Info },
];

export const Sidebar: React.FC<SidebarProps> = ({ isOpen = true, onClose }) => {
  return (
    <aside
      className={`fixed inset-y-0 left-0 z-30 w-64 bg-slate-900 border-r border-slate-800 flex flex-col transition-transform duration-200 lg:static lg:translate-x-0 ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      }`}
    >
      {/* Brand Header */}
      <div className="h-16 px-5 flex items-center justify-between border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-sky-500 flex items-center justify-center text-white shadow-xs">
            <Droplets className="w-5 h-5" />
          </div>
          <div>
            <span className="text-base font-bold text-white tracking-tight leading-tight block">
              AquaPredict AI
            </span>
          </div>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <div className="px-3 pb-2 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
          Decision Support System
        </div>
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                  isActive
                    ? 'bg-sky-600 text-white font-semibold shadow-xs'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800'
                }`
              }
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span className="truncate">{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* Footer Info Box */}
      <div className="p-3 border-t border-slate-800 bg-slate-950/60">
        <div className="rounded-lg bg-slate-900/90 border border-slate-800 p-2.5 text-[11px] text-slate-300">
          <div className="flex items-center justify-between mb-1">
            <span className="font-semibold text-white">CWC / Ministry Platform</span>
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          </div>
          <p className="text-slate-400 text-[10px] leading-relaxed mb-2">
            14 Active Reservoirs across 6 states monitored via ML ensemble.
          </p>
          <div className="text-[10px] font-mono text-amber-300/90 bg-amber-950/40 border border-amber-800/40 px-2 py-1 rounded">
            DEMO / SYNTHETIC DATA
          </div>
        </div>
      </div>
    </aside>
  );
};
