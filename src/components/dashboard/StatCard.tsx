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
  borderColor = 'border-slate-200/90',
  onClick,
  urgentBadge = false,
}) => {
  return (
    <div
      onClick={onClick}
      className={`bg-white/90 backdrop-blur-md p-4.5 rounded-2xl border ${borderColor} shadow-card hover:shadow-ai-card transition-all duration-300 group relative overflow-hidden ${
        onClick ? 'cursor-pointer hover:-translate-y-1 hover:border-indigo-400/50' : ''
      }`}
    >
      <div className="flex items-start justify-between relative z-10">
        <div className="space-y-1.5 min-w-0">
          <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">{title}</p>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl lg:text-3xl font-black text-slate-800 tracking-tight transition-transform duration-200 group-hover:scale-105">
              {value}
            </span>
            {urgentBadge && (
              <span className="text-[10px] font-bold text-white bg-brand-red px-2 py-0.5 rounded-full animate-pulse shadow-[0_0_10px_rgba(237,50,55,0.4)]">
                Khẩn
              </span>
            )}
          </div>
          {subtitle && <p className="text-[11px] text-slate-500 truncate">{subtitle}</p>}
        </div>
        <div className={`p-3 rounded-xl ${bgColor} ${iconColor} transition-all duration-300 group-hover:scale-110 group-hover:rotate-6 shadow-xs`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>

      {/* Subtle bottom gradient glow line on hover */}
      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-indigo-500/0 to-transparent group-hover:via-indigo-500/60 transition-all duration-500" />
    </div>
  );
};
