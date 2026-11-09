import React from 'react';
import { PriorityLevel } from '../types';

interface Props {
  priority: PriorityLevel | string;
}

export const PriorityBadge: React.FC<Props> = ({ priority }) => {
  const getStyles = () => {
    switch (priority) {
      case 'Critical':
        return 'bg-red-100 text-red-800 border-red-300 font-bold';
      case 'High':
        return 'bg-orange-100 text-orange-800 border-orange-300 font-semibold';
      case 'Medium':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Low':
        return 'bg-slate-100 text-slate-700 border-slate-200';
      case 'No Action':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      default:
        return 'bg-slate-100 text-slate-600 border-slate-200';
    }
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs border ${getStyles()}`}>
      {priority}
    </span>
  );
};

