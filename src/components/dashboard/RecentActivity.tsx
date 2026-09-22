import React from 'react';
import { useDocument } from '../../context/DocumentContext';
import { formatDate } from '../../lib/storage';
import { CheckCircle2, XCircle, Clock, FilePlus, AlertCircle, ArrowRight, RotateCcw } from 'lucide-react';

export const RecentActivity: React.FC = () => {
  const { documents, setSelectedDocument, setActiveTab, hasPermission, activeUser } = useDocument();
  const canViewAuditLog = hasPermission('system.audit_log') || activeUser?.role === 'ADMIN';

  // Gom các audit logs gần nhất từ tất cả hồ sơ
  const allLogs = documents
    .flatMap(doc => doc.auditLogs.map(log => ({ ...log, docCode: doc.code, docTitle: doc.title, document: doc })))
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 6);

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'APPROVE':
        return <CheckCircle2 className="h-4 w-4 text-emerald-600" />;
      case 'REJECT':
        return <XCircle className="h-4 w-4 text-brand-red" />;
      case 'REQUEST_INFO':
        return <AlertCircle className="h-4 w-4 text-amber-500" />;
      case 'RESUBMIT':
        return <RotateCcw className="h-4 w-4 text-purple-600" />;
      case 'CREATE':
        return <FilePlus className="h-4 w-4 text-brand-blue" />;
      default:
        return <Clock className="h-4 w-4 text-slate-400" />;
    }
  };

  const getActionText = (action: string) => {
    switch (action) {
      case 'APPROVE':
        return 'đã phê duyệt';
      case 'REJECT':
        return 'đã từ chối';
      case 'REQUEST_INFO':
        return 'yêu cầu bổ sung';
      case 'RESUBMIT':
        return 'đã bổ sung & gửi lại';
      case 'CREATE':
        return 'đã khởi tạo trình ký';
      default:
        return 'đã cập nhật';
    }
  };

  return (
    <div className="bg-white/90 backdrop-blur-md p-5 rounded-2xl border border-slate-200/90 shadow-card">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-bold text-slate-800">Nhật Ký Luân Chuyển Trình Ký (Audit Trail)</h3>
          <p className="text-xs text-slate-500">Các hành động duyệt, ký và chuyển bước theo thời gian thực</p>
        </div>
        {canViewAuditLog && (
          <button 
            onClick={() => setActiveTab('audit-logs')}
            className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 hover:underline cursor-pointer"
          >
            <span>Xem tất cả nhật ký</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      <div className="divide-y divide-slate-100">
        {allLogs.length === 0 ? (
          <p className="text-xs text-slate-400 py-4 text-center">Chưa có hoạt động nào</p>
        ) : (
          allLogs.map((log) => (
            <div
              key={log.id}
              onClick={() => setSelectedDocument(log.document)}
              className="py-3 flex items-start gap-3 hover:bg-indigo-50/40 px-2.5 -mx-2 rounded-xl transition-colors cursor-pointer group"
            >
              <div className="mt-0.5 shrink-0 p-1.5 bg-slate-50 border border-slate-200/80 rounded-xl group-hover:border-indigo-300 transition-colors">
                {getActionIcon(log.action)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-slate-800">
                  <span className="font-bold text-slate-900">{log.actorName}</span>{' '}
                  <span className="text-slate-600">({log.actorTitle})</span>{' '}
                  <span className="font-semibold text-indigo-600">{getActionText(log.action)}</span>{' '}
                  hồ sơ <span className="font-bold text-slate-900 underline underline-offset-2">[{log.docCode}]</span>
                </p>
                {log.comment && (
                  <p className="text-[11px] text-slate-600 italic mt-1 bg-slate-50/80 p-2 rounded-xl border border-slate-100">
                    "{log.comment}"
                  </p>
                )}
                <span className="text-[10px] text-slate-400 mt-1 block font-mono">
                  {formatDate(log.timestamp)}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
