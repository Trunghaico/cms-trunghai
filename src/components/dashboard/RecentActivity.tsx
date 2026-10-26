import React, { useState, useEffect } from 'react';
import { useDocument } from '../../context/DocumentContext';
import { formatDate } from '../../lib/storage';
import { 
  CheckCircle2, 
  XCircle, 
  Clock, 
  FilePlus, 
  AlertCircle, 
  ArrowRight, 
  RotateCcw, 
  ShieldCheck, 
  MessageSquare, 
  Trash2, 
  Zap 
} from 'lucide-react';

export const RecentActivity: React.FC = () => {
  const { documents, allDocuments, setSelectedDocument, setActiveTab, hasPermission, activeUser } = useDocument();
  const [, setTick] = useState(0);

  const canViewAuditLog = hasPermission('system.audit_log') || activeUser?.role === 'ADMIN' || activeUser?.role === 'DIRECTOR';
  const effectiveDocs = (canViewAuditLog && allDocuments && allDocuments.length > 0) ? allDocuments : documents;

  // Lắng nghe sự kiện cập nhật tức thì để render lại ngay lập tức
  useEffect(() => {
    const handleUpdate = () => setTick(t => t + 1);
    window.addEventListener('trunghai_activity_updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);
    return () => {
      window.removeEventListener('trunghai_activity_updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, []);

  // Gom các audit logs gần nhất từ tất cả hồ sơ
  const allLogs = effectiveDocs
    .flatMap(doc => (doc.auditLogs || []).map(log => ({ ...log, docCode: doc.code, docTitle: doc.title, document: doc })))
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 6);

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'APPROVE':
        return <CheckCircle2 className="h-4 w-4 text-emerald-600" />;
      case 'INTERNAL_CHECK':
        return <ShieldCheck className="h-4 w-4 text-indigo-600" />;
      case 'REJECT':
        return <XCircle className="h-4 w-4 text-brand-red" />;
      case 'REQUEST_INFO':
        return <AlertCircle className="h-4 w-4 text-amber-500" />;
      case 'RETURN_OVERDUE':
        return <Clock className="h-4 w-4 text-rose-600" />;
      case 'RESUBMIT':
        return <RotateCcw className="h-4 w-4 text-purple-600" />;
      case 'COMMENT':
        return <MessageSquare className="h-4 w-4 text-sky-600" />;
      case 'DELETE':
        return <Trash2 className="h-4 w-4 text-red-600" />;
      case 'CREATE':
        return <FilePlus className="h-4 w-4 text-brand-blue" />;
      default:
        return <Clock className="h-4 w-4 text-slate-400" />;
    }
  };

  const getActionText = (action: string) => {
    switch (action) {
      case 'APPROVE':
        return 'đã phê duyệt & ký số';
      case 'INTERNAL_CHECK':
        return 'đã thẩm định nội bộ';
      case 'REJECT':
        return 'đã từ chối duyệt';
      case 'REQUEST_INFO':
        return 'đã yêu cầu bổ sung';
      case 'RETURN_OVERDUE':
        return 'đã trả hồ sơ quá hạn SLA';
      case 'RESUBMIT':
        return 'đã bổ sung & gửi lại';
      case 'COMMENT':
        return 'đã để lại ý kiến thảo luận trên';
      case 'DELETE':
        return 'đã xóa';
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
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-slate-800">Nhật Ký Luân Chuyển Trình Ký (Audit Trail)</h3>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
              </span>
              Trực tiếp
            </span>
          </div>
          <p className="text-xs text-slate-500">Các hành động duyệt, ký và chuyển bước cập nhật tức thì theo thời gian thực</p>
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
          allLogs.map((log) => {
            const logTime = new Date(log.timestamp).getTime();
            const isRecent = !isNaN(logTime) && (Date.now() - logTime) < 180000;

            return (
              <div
                key={log.id}
                onClick={() => setSelectedDocument(log.document)}
                className={`py-3 flex items-start gap-3 px-2.5 -mx-2 rounded-xl transition-colors cursor-pointer group ${
                  isRecent ? 'bg-emerald-50/40 hover:bg-emerald-50/70 border-l-2 border-emerald-500' : 'hover:bg-indigo-50/40'
                }`}
              >
                <div className="mt-0.5 shrink-0 p-1.5 bg-slate-50 border border-slate-200/80 rounded-xl group-hover:border-indigo-300 transition-colors">
                  {getActionIcon(log.action)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <p className="text-xs text-slate-800">
                      <span className="font-bold text-slate-900">{log.actorName}</span>{' '}
                      <span className="text-slate-600">({log.actorTitle})</span>{' '}
                      <span className="font-semibold text-indigo-600">{getActionText(log.action)}</span>{' '}
                      hồ sơ <span className="font-bold text-slate-900 underline underline-offset-2">[{log.docCode}]</span>
                    </p>
                    {isRecent && (
                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 animate-pulse">
                        <Zap className="w-2 h-2 text-emerald-600 fill-emerald-600" />
                        VỪA XONG
                      </span>
                    )}
                  </div>
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
            );
          })
        )}
      </div>
    </div>
  );
};
