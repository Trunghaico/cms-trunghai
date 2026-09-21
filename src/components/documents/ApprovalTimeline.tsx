import { ApprovalStep, StepStatus, DocumentStatus } from '../../types';
import { formatDate } from '../../lib/storage';
import { CheckCircle2, Clock, XCircle, AlertCircle, ArrowRight, ShieldCheck, PenTool, RotateCcw } from 'lucide-react';

interface ApprovalTimelineProps {
  steps: ApprovalStep[];
  currentStepIndex: number;
  documentStatus?: DocumentStatus;
}

export const ApprovalTimeline: React.FC<ApprovalTimelineProps> = ({ steps, currentStepIndex, documentStatus }) => {
  const getStepBadge = (status: StepStatus, isCurrent: boolean) => {
    if (isCurrent && documentStatus === 'ADDITIONAL_REQ') {
      return {
        icon: AlertCircle,
        bgColor: 'bg-amber-600 text-white animate-pulse',
        borderColor: 'border-amber-500 ring-2 ring-amber-300',
        textColor: 'text-amber-800 font-bold',
        labelText: 'Yêu cầu bổ sung',
      };
    }

    switch (status) {
      case 'APPROVED':
        return {
          icon: CheckCircle2,
          bgColor: 'bg-emerald-500 text-white',
          borderColor: 'border-emerald-500',
          textColor: 'text-emerald-700',
          labelText: 'Đã phê duyệt',
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

  return (
    <div className="py-2">
      <div className="relative">
        
        {/* Horizontal Connector Line for Desktop */}
        <div className="hidden md:block absolute top-5 left-8 right-8 h-0.5 bg-slate-200 -z-0" />

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 relative z-10">
          {steps.map((step, index) => {
            const isCurrent = index === currentStepIndex;
            const badge = getStepBadge(step.status, isCurrent);
            const Icon = badge.icon;

            return (
              <div
                key={step.id || index}
                className={`p-3.5 rounded-[3px] border transition-all duration-200 hover:-translate-y-0.5 ${
                  isCurrent
                    ? 'bg-amber-50/70 border-amber-400 shadow-md ring-1 ring-amber-300/60'
                    : step.status === 'APPROVED'
                    ? 'bg-emerald-50/40 border-emerald-300 shadow-xs'
                    : step.status === 'REJECTED'
                    ? 'bg-red-50/40 border-red-300 shadow-xs'
                    : 'bg-slate-50 border-slate-200 opacity-80 hover:opacity-100'
                }`}
              >
                {/* Header with Step Number & Status Icon */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className={`h-7 w-7 rounded-[3px] flex items-center justify-center text-xs font-bold shadow-xs transition-transform duration-200 ${badge.bgColor}`}>
                      {index + 1}
                    </div>
                    <span className="text-xs font-bold text-slate-800">
                      Bước {index + 1}
                    </span>
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

                {/* Status Pill & Timestamp */}
                <div className="mt-2.5 pt-2 border-t border-slate-200/60">
                  <div className="flex items-center justify-between">
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-[3px] shadow-2xs ${
                      step.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-800' :
                      step.status === 'REJECTED' ? 'bg-red-100 text-red-800' :
                      step.status === 'CURRENT' ? 'bg-amber-100 text-amber-900 animate-pulse' :
                      'bg-slate-100 text-slate-500'
                    }`}>
                      {badge.labelText}
                    </span>
                    {step.slaHours && (
                      <span className="text-[9px] text-slate-400 font-medium">
                        SLA: {step.slaHours}h
                      </span>
                    )}
                  </div>

                  {step.decisionDate && (
                    <p className="text-[10px] text-slate-500 mt-1 font-mono">
                      {formatDate(step.decisionDate)}
                    </p>
                  )}

                  {/* Approver's Comment */}
                  {step.comment && (
                    <div className="mt-1.5 p-1.5 bg-white rounded-[3px] border border-slate-200 text-[10px] text-slate-600 italic shadow-2xs">
                      "{step.comment}"
                    </div>
                  )}

                  {/* Stamp / Signature Verification Badge */}
                  {step.status === 'APPROVED' && (
                    <div className="mt-2 flex items-center gap-1 text-[9px] font-bold text-emerald-700 bg-emerald-100/90 border border-emerald-200 px-1.5 py-0.5 rounded-[3px] shadow-2xs animate-fade-in">
                      <ShieldCheck className="h-3 w-3 text-emerald-600 shrink-0" />
                      <span>Chữ ký số hợp lệ</span>
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
