import React from 'react';
import { ApprovalStep, StepStatus, DocumentStatus } from '../../types';
import { formatDate } from '../../lib/storage';
import { CheckCircle2, Clock, XCircle, AlertCircle, ShieldCheck, Zap, AlertTriangle, UserCheck } from 'lucide-react';

interface ApprovalTimelineProps {
  steps: ApprovalStep[];
  currentStepIndex: number;
  documentStatus?: DocumentStatus;
}

export const ApprovalTimeline: React.FC<ApprovalTimelineProps> = ({ steps, currentStepIndex, documentStatus }) => {
  const getStepBadge = (step: ApprovalStep, isCurrent: boolean) => {
    const isDept = Boolean(step.requiresInternalCheck || (!step.approverId && step.department));

    if (step.autoApprovedBySystem) {
      return {
        icon: Zap,
        bgColor: 'bg-purple-600 text-white',
        borderColor: 'border-purple-400',
        textColor: 'text-purple-700 font-bold',
        labelText: 'Tự động duyệt (Hệ thống)',
      };
    }

    if (isCurrent && documentStatus === 'ADDITIONAL_REQ') {
      return {
        icon: AlertCircle,
        bgColor: 'bg-amber-600 text-white animate-pulse',
        borderColor: 'border-amber-500 ring-2 ring-amber-300',
        textColor: 'text-amber-800 font-bold',
        labelText: 'Yêu cầu bổ sung',
      };
    }

    if (isCurrent && step.isOverdue) {
      return {
        icon: AlertTriangle,
        bgColor: 'bg-red-600 text-white animate-pulse',
        borderColor: 'border-red-500 ring-2 ring-red-300',
        textColor: 'text-red-700 font-bold',
        labelText: 'Quá hạn SLA',
      };
    }

    switch (step.status) {
      case 'APPROVED':
        return {
          icon: CheckCircle2,
          bgColor: 'bg-emerald-600 text-white',
          borderColor: 'border-emerald-500',
          textColor: 'text-emerald-700',
          labelText: 'Đã hoàn tất duyệt',
        };
      case 'REJECTED':
        return {
          icon: XCircle,
          bgColor: 'bg-brand-red text-white',
          borderColor: 'border-brand-red',
          textColor: 'text-brand-red',
          labelText: 'Từ chối duyệt',
        };
      case 'CURRENT':
        if (isDept && !step.isInternalChecked) {
          return {
            icon: UserCheck,
            bgColor: 'bg-indigo-600 text-white animate-pulse',
            borderColor: 'border-indigo-500 ring-2 ring-indigo-200',
            textColor: 'text-indigo-700 font-bold',
            labelText: 'Đang kiểm tra nội bộ',
          };
        }
        if (isDept && step.isInternalChecked) {
          return {
            icon: Clock,
            bgColor: 'bg-amber-500 text-white animate-pulse',
            borderColor: 'border-amber-500 ring-2 ring-amber-200',
            textColor: 'text-amber-700 font-bold',
            labelText: 'Chờ Quản lý duyệt',
          };
        }
        return {
          icon: Clock,
          bgColor: 'bg-amber-500 text-white animate-pulse',
          borderColor: 'border-amber-500 ring-2 ring-amber-200',
          textColor: 'text-amber-700 font-bold',
          labelText: 'Đang chờ xử lý',
        };
      default:
        return {
          icon: Clock,
          bgColor: 'bg-slate-200 text-slate-500',
          borderColor: 'border-slate-300',
          textColor: 'text-slate-400',
          labelText: 'Chưa tới lượt',
        };
    }
  };

  // Helper tính thời gian SLA còn lại hoặc quá hạn
  const formatSlaRemaining = (step: ApprovalStep) => {
    if (!step.deadline || step.status !== 'CURRENT') return null;
    const now = Date.now();
    const deadline = new Date(step.deadline).getTime();
    const diffMs = deadline - now;

    if (diffMs < 0) {
      const overHours = Math.max(1, Math.round(Math.abs(diffMs) / (1000 * 3600)));
      return { isOverdue: true, text: `Quá hạn ${overHours}h` };
    } else {
      const remainingHours = Math.floor(diffMs / (1000 * 3600));
      const remainingMins = Math.floor((diffMs % (1000 * 3600)) / (1000 * 60));
      if (remainingHours > 0) {
        return { isOverdue: false, text: `Còn ${remainingHours}h ${remainingMins}m` };
      }
      return { isOverdue: false, text: `Còn ${remainingMins}m` };
    }
  };

  return (
    <div className="py-2">
      <div className="relative">
        
        {/* Horizontal Connector Line for Desktop */}
        <div className="hidden md:block absolute top-6 left-8 right-8 h-0.5 bg-slate-200/80 -z-0" />

        <div className={`grid grid-cols-1 ${steps.length <= 3 ? 'md:grid-cols-3' : 'md:grid-cols-4'} gap-4 relative z-10`}>
          {steps.map((step, index) => {
            const isCurrent = index === currentStepIndex;
            const isDept = Boolean(step.requiresInternalCheck || (!step.approverId && step.department));
            const badge = getStepBadge(step, isCurrent);
            const Icon = badge.icon;
            const slaStatus = isCurrent ? formatSlaRemaining(step) : null;

            return (
              <div
                key={step.id || index}
                className={`p-4 rounded-2xl border transition-all duration-300 hover:-translate-y-0.5 shadow-2xs ${
                  step.autoApprovedBySystem
                    ? 'bg-purple-50/70 border-purple-300 shadow-sm ring-1 ring-purple-200'
                    : isCurrent && step.isOverdue
                    ? 'bg-red-50/80 border-red-400 shadow-glow-red ring-2 ring-red-300'
                    : isCurrent
                    ? (isDept && !step.isInternalChecked ? 'bg-indigo-50/80 border-indigo-400 shadow-glow-blue ring-1 ring-indigo-300/60' : 'bg-amber-50/80 border-amber-400 shadow-glow-amber ring-1 ring-amber-300/60')
                    : step.status === 'APPROVED'
                    ? 'bg-emerald-50/50 border-emerald-300'
                    : step.status === 'REJECTED'
                    ? 'bg-red-50/50 border-red-300'
                    : 'bg-white border-slate-200/80 opacity-85 hover:opacity-100'
                }`}
              >
                {/* Header with Step Number & Status Icon */}
                <div className="flex items-center justify-between mb-2.5">
                  <div className="flex items-center gap-2">
                    <div className={`h-8 w-8 rounded-xl flex items-center justify-center text-xs font-bold shadow-xs transition-transform duration-200 ${badge.bgColor}`}>
                      {index + 1}
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-xs font-bold text-slate-900">
                        Bước {index + 1}
                      </span>
                      {isDept && (
                        <span className="text-[9px] font-bold px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-full border border-indigo-200">
                          Ban/Phòng
                        </span>
                      )}
                    </div>
                  </div>
                  <Icon className={`h-4 w-4 ${badge.textColor}`} />
                </div>

                {/* Step Title & Approver Info */}
                <div className="space-y-1 text-xs">
                  <p className="font-bold text-slate-800 line-clamp-1" title={step.title}>
                    {step.title}
                  </p>
                  <p className="font-semibold text-brand-blue text-[11px] truncate">
                    {step.approverName || step.approverTitle}
                  </p>
                  <p className="text-[10px] text-slate-500 truncate">
                    {step.department}
                  </p>
                </div>

                {/* 2-Chặng Nội Bộ trong Ban */}
                {isDept && (
                  <div className="mt-2.5 p-2.5 bg-white/95 rounded-xl border border-slate-200/80 space-y-1.5 text-[10px] shadow-2xs">
                    {/* Stage 1: Kiểm tra nội bộ ban */}
                    <div className="flex items-center justify-between">
                      <span className="text-slate-600 font-medium">1. Kiểm tra nội bộ:</span>
                      {step.isInternalChecked || step.status === 'APPROVED' ? (
                        <span className="text-indigo-700 font-bold flex items-center gap-0.5 truncate max-w-[130px]" title={step.checkedByName}>
                          <CheckCircle2 className="w-3 h-3 text-indigo-600 shrink-0" />
                          <span className="truncate">{step.checkedByName ? step.checkedByName.split(' ').slice(-2).join(' ') : 'Đã kiểm tra'}</span>
                        </span>
                      ) : isCurrent ? (
                        <span className="text-indigo-600 font-bold animate-pulse flex items-center gap-0.5">
                          <UserCheck className="w-3 h-3" />
                          <span>Đang kiểm tra</span>
                        </span>
                      ) : (
                        <span className="text-slate-400">Chờ tới lượt</span>
                      )}
                    </div>

                    {/* Stage 2: Quản lý phê duyệt */}
                    <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                      <span className="text-slate-600 font-medium">2. Quản lý duyệt:</span>
                      {step.status === 'APPROVED' ? (
                        <span className="text-emerald-700 font-bold flex items-center gap-0.5 truncate max-w-[130px]" title={step.approverName}>
                          <ShieldCheck className="w-3 h-3 text-emerald-600 shrink-0" />
                          <span className="truncate">{step.approverName ? step.approverName.split(' ').slice(-2).join(' ') : 'Đã duyệt'}</span>
                        </span>
                      ) : isCurrent && step.isInternalChecked ? (
                        <span className="text-amber-700 font-bold animate-pulse flex items-center gap-0.5">
                          <Clock className="w-3 h-3" />
                          <span>Chờ duyệt</span>
                        </span>
                      ) : isCurrent ? (
                        <span className="text-slate-400">Chờ kiểm tra xong</span>
                      ) : (
                        <span className="text-slate-400">Chưa tới lượt</span>
                      )}
                    </div>
                  </div>
                )}

                {/* Status Pill & Timestamp */}
                <div className="mt-3 pt-2.5 border-t border-slate-200/60 space-y-1.5">
                  <div className="flex items-center justify-between gap-1 flex-wrap">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shadow-2xs ${
                      step.autoApprovedBySystem ? 'bg-purple-100 text-purple-900 border border-purple-200' :
                      step.isOverdue && isCurrent ? 'bg-red-100 text-red-900 border border-red-300 animate-pulse' :
                      step.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-800' :
                      step.status === 'REJECTED' ? 'bg-red-100 text-red-800' :
                      step.status === 'CURRENT' ? (isDept && !step.isInternalChecked ? 'bg-indigo-100 text-indigo-900 animate-pulse' : 'bg-amber-100 text-amber-900 animate-pulse') :
                      'bg-slate-100 text-slate-500'
                    }`}>
                      {badge.labelText}
                    </span>

                    {step.slaHours && (
                      <span className="text-[9px] text-slate-500 font-semibold bg-slate-100 px-1.5 py-0.5 rounded-full">
                        SLA: {step.slaHours}h
                      </span>
                    )}
                  </div>

                  {/* SLA Countdown / Overdue Indicator */}
                  {slaStatus && (
                    <div className={`flex items-center gap-1.5 text-[10px] font-bold px-2 py-1 rounded-xl ${
                      slaStatus.isOverdue 
                        ? 'bg-red-100 text-red-700 border border-red-200' 
                        : (isDept && !step.isInternalChecked ? 'bg-indigo-100/80 text-indigo-800 border border-indigo-200' : 'bg-amber-100/80 text-amber-800 border border-amber-200')
                    }`}>
                      <Clock className="w-3 h-3 shrink-0" />
                      <span>{slaStatus.text}</span>
                      {step.overdueAction === 'AUTO_APPROVE' && (
                        <span className="text-[9px] ml-auto text-purple-700 font-semibold">(Tự động duyệt)</span>
                      )}
                    </div>
                  )}

                  {step.decisionDate && (
                    <p className="text-[10px] text-slate-500 mt-1 font-mono">
                      {formatDate(step.decisionDate)}
                    </p>
                  )}

                  {/* Approver's Comment */}
                  {step.comment && (
                    <div className="mt-1.5 p-2 bg-white rounded-xl border border-slate-200 text-[10px] text-slate-600 italic shadow-2xs">
                      "{step.comment}"
                    </div>
                  )}

                  {/* Stamp / Signature Verification Badge */}
                  {step.status === 'APPROVED' && (
                    <div className={`mt-2 flex items-center gap-1.5 text-[9px] font-bold px-2 py-1 rounded-xl shadow-2xs animate-fade-in ${
                      step.autoApprovedBySystem 
                        ? 'text-purple-800 bg-purple-100 border border-purple-200' 
                        : 'text-emerald-700 bg-emerald-100/90 border border-emerald-200'
                    }`}>
                      {step.autoApprovedBySystem ? (
                        <>
                          <Zap className="h-3 w-3 text-purple-600 shrink-0" />
                          <span>Hệ thống ký điện tử tự động</span>
                        </>
                      ) : (
                        <>
                          <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                          <span>Chữ ký số hợp lệ ({step.approverName})</span>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

      </div>
    </div>
  );
};
