import React from 'react';
import { ShieldCheck, AlertTriangle, AlertCircle, Flame } from 'lucide-react';

interface RiskBadgeProps {
  level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' | string;
  score?: number;
  size?: 'sm' | 'md' | 'lg';
}

export const RiskBadge: React.FC<RiskBadgeProps> = ({ level, score, size = 'md' }) => {
  const normalizedLevel = (level || 'LOW').toUpperCase();

  const config = {
    LOW: {
      bg: 'bg-emerald-50 border-emerald-200 text-emerald-700',
      icon: ShieldCheck,
      label: 'Low Risk',
      accent: 'text-emerald-600',
    },
    MEDIUM: {
      bg: 'bg-amber-50 border-amber-200 text-amber-700',
      icon: AlertTriangle,
      label: 'Medium Risk',
      accent: 'text-amber-600',
    },
    HIGH: {
      bg: 'bg-orange-50 border-orange-200 text-orange-700',
      icon: AlertCircle,
      label: 'High Risk',
      accent: 'text-orange-600',
    },
    CRITICAL: {
      bg: 'bg-rose-50 border-rose-200 text-rose-700',
      icon: Flame,
      label: 'Critical Risk',
      accent: 'text-rose-600',
    },
  }[normalizedLevel as 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'] || {
    bg: 'bg-slate-50 border-slate-200 text-slate-700',
    icon: ShieldCheck,
    label: normalizedLevel,
    accent: 'text-slate-600',
  };

  const Icon = config.icon;

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5 gap-1',
    md: 'text-xs px-2.5 py-1 gap-1.5 font-medium',
    lg: 'text-sm px-3.5 py-1.5 gap-2 font-semibold',
  }[size];

  return (
    <span
      className={`inline-flex items-center rounded-md border ${config.bg} ${sizeClasses} tracking-tight select-none`}
    >
      <Icon className={`shrink-0 ${size === 'sm' ? 'w-3 h-3' : size === 'lg' ? 'w-4 h-4' : 'w-3.5 h-3.5'}`} />
      <span>{config.label}</span>
      {typeof score === 'number' && (
        <span className="font-mono tabular-nums opacity-85 ml-0.5">({score.toFixed(0)})</span>
      )}
    </span>
  );
};
