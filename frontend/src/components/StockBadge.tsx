import React from 'react';
import { StockStatus } from '../types';

interface Props {
  status: StockStatus | string;
  size?: 'sm' | 'md';
}

export const StockBadge: React.FC<Props> = ({ status, size = 'sm' }) => {
  const getStyles = () => {
    switch (status) {
      case 'Healthy':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'Low Stock':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'Critical':
        return 'bg-rose-50 text-rose-700 border-rose-200 font-semibold';
      case 'Out of Stock':
        return 'bg-slate-100 text-slate-700 border-slate-300 font-bold';
      case 'Overstocked':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      default:
        return 'bg-slate-50 text-slate-600 border-slate-200';
    }
  };

  const dotColor = () => {
    switch (status) {
      case 'Healthy': return 'bg-emerald-500';
      case 'Low Stock': return 'bg-amber-500';
      case 'Critical': return 'bg-rose-500 animate-pulse';
      case 'Out of Stock': return 'bg-slate-500';
      case 'Overstocked': return 'bg-purple-500';
      default: return 'bg-slate-400';
    }
  };

  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm';

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border ${getStyles()} ${sizeClasses}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${dotColor()}`}></span>
      {status}
    </span>
  );
};

