import React from 'react';
import { Loader2 } from 'lucide-react';

interface LoadingSpinnerProps {
  message?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  message = 'Loading data from ML service...',
  size = 'md',
}) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-7 h-7',
    lg: 'w-10 h-10',
  }[size];

  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 gap-3 text-center">
      <Loader2 className={`${sizeClasses} animate-spin text-sky-600`} />
      <span className="text-xs font-medium text-slate-600 animate-pulse">{message}</span>
    </div>
  );
};
