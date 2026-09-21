import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: number | string;
  subtitle?: string;
  icon: LucideIcon;
  iconColor: string;
  bgColor: string;
  borderColor?: string;
  onClick?: () => void;
  urgentBadge?: boolean;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  iconColor,
  bgColor,
  borderColor = 'border-slate-200',
  onClick,
  urgentBadge = false,
}) => {
  return (
    <div
      onClick={onClick}
      className={`bg-white p-4 rounded-[3px] border ${borderColor} shadow-card hover:shadow-elevated transition-all duration-200 group ${
        onClick ? 'cursor-pointer hover:-translate-y-1' : ''
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{title}</p>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-800 transition-transform duration-200 group-hover:scale-105">
              {value}
            </span>
            {urgentBadge && (
              <span className="text-[10px] font-bold text-white bg-brand-red px-1.5 py-0.5 rounded-[3px] animate-pulse shadow-sm">
                Khẩn
              </span>
            )}
          </div>
          {subtitle && <p className="text-[11px] text-slate-500">{subtitle}</p>}
        </div>
        <div className={`p-2.5 rounded-[3px] ${bgColor} ${iconColor} transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3 shadow-sm`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
};
