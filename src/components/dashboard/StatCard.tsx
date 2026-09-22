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
  borderColor = 'border-slate-200/80',
  onClick,
  urgentBadge = false,
}) => {
  return (
    <div
      onClick={onClick}
      className={`bg-white/95 backdrop-blur-md p-5 rounded-2xl border ${borderColor} shadow-ai-card hover:shadow-glow-blue transition-all duration-300 group relative overflow-hidden ${
        onClick ? 'cursor-pointer hover:-translate-y-1 hover:border-indigo-400/50' : ''
      }`}
    >
      <div className="flex items-start justify-between gap-3 relative z-10">
        <div className="space-y-1.5 min-w-0 flex-1">
          <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider truncate">{title}</p>
          <div className="flex items-baseline gap-2 flex-wrap">
            <span className="text-2xl lg:text-3xl font-black text-slate-800 tracking-tight transition-transform duration-200 group-hover:scale-105">
              {value}
            </span>
            {urgentBadge && (
              <span className="text-[10px] font-bold text-white bg-brand-red px-2.5 py-0.5 rounded-full animate-pulse shadow-glow-red">
                Khẩn
              </span>
            )}
          </div>
          {subtitle && <p className="text-[11px] text-slate-500 truncate">{subtitle}</p>}
        </div>
        <div className={`p-3 rounded-xl ${bgColor} ${iconColor} transition-all duration-300 group-hover:scale-110 group-hover:rotate-6 shadow-xs shrink-0`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>

      {/* Subtle bottom gradient glow line on hover */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-brand-blue/0 to-transparent group-hover:via-brand-blue/60 transition-all duration-500" />
    </div>
  );
};
