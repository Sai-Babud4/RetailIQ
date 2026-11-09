import React from 'react';
import { LucideIcon } from 'lucide-react';

interface Props {
  title: string;
  value: string | number;
  subtitle?: string;
  badge?: string;
  badgeType?: 'success' | 'warning' | 'danger' | 'info' | 'purple';
  icon: LucideIcon;
  iconBg?: string;
  iconColor?: string;
  onClick?: () => void;
}

export const KpiCard: React.FC<Props> = ({
  title,
  value,
  subtitle,
  badge,
  badgeType = 'info',
  icon: Icon,
  iconBg = 'bg-blue-50',
  iconColor = 'text-blue-600',
  onClick
}) => {
  const getBadgeStyle = () => {
    switch (badgeType) {
      case 'success': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'warning': return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'danger': return 'bg-rose-50 text-rose-700 border-rose-200 font-semibold';
      case 'purple': return 'bg-purple-50 text-purple-700 border-purple-200';
      default: return 'bg-blue-50 text-blue-700 border-blue-200';
    }
  };

  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:shadow transition-all ${
        onClick ? 'cursor-pointer hover:border-blue-300' : ''
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{title}</p>
          <h3 className="text-2xl font-extrabold text-slate-900 tracking-tight">{value}</h3>
        </div>
        <div className={`p-2.5 rounded-xl ${iconBg} ${iconColor}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>

      {(subtitle || badge) && (
        <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          {subtitle && <span>{subtitle}</span>}
          {badge && (
            <span className={`px-2 py-0.5 rounded-full border text-[11px] font-medium ${getBadgeStyle()}`}>
              {badge}
            </span>
          )}
        </div>
      )}
    </div>
  );
};

