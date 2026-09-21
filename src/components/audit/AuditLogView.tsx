import React, { useState, useMemo } from 'react';
import { useDocument } from '../../context/DocumentContext';
import { 
  History, 
  Search, 
  Filter, 
  User, 
  Building2, 
  FileText, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  RotateCcw,
  Zap,
  ArrowRight
} from 'lucide-react';
import { formatDate } from '../../lib/storage';

export const AuditLogView: React.FC = () => {
  const { documents, setSelectedDocument } = useDocument();
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState('ALL');

  // Tổng hợp tất cả audit logs từ toàn bộ hồ sơ
  const allAuditLogs = useMemo(() => {
    const logs: {
      logId: string;
      docId: string;
      docCode: string;
      docTitle: string;
      docCategory: string;
      action: string;
      actorId: string;
      actorName: string;
      actorTitle: string;
      timestamp: string;
      comment?: string;
      previousStatus?: string;
      newStatus?: string;
    }[] = [];

    documents.forEach(doc => {
      if (doc.auditLogs && Array.isArray(doc.auditLogs)) {
        doc.auditLogs.forEach(log => {
          logs.push({
            logId: log.id,
            docId: doc.id,
            docCode: doc.code,
            docTitle: doc.title,
            docCategory: doc.category,
            action: log.action,
            actorId: log.actorId,
            actorName: log.actorName,
            actorTitle: log.actorTitle,
            timestamp: log.timestamp,
            comment: log.comment,
            previousStatus: log.previousStatus,
            newStatus: log.newStatus,
          });
        });
      }
    });

    return logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [documents]);

  const filteredLogs = useMemo(() => {
    return allAuditLogs.filter(log => {
      if (actionFilter !== 'ALL' && log.action !== actionFilter) return false;
      if (searchTerm) {
        const q = searchTerm.toLowerCase();
        return (
          log.docCode.toLowerCase().includes(q) ||
          log.docTitle.toLowerCase().includes(q) ||
          log.actorName.toLowerCase().includes(q) ||
          (log.comment && log.comment.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [allAuditLogs, actionFilter, searchTerm]);

  const getActionBadge = (action: string, actorId?: string) => {
    if (actorId === 'SYSTEM_BOT') {
      return (
        <span className="px-2 py-0.5 bg-purple-100 text-purple-800 border border-purple-200 text-[10px] font-bold rounded flex items-center gap-1 w-max">
          <Zap className="w-2.5 h-2.5" />
          Hệ Thống Tự Động
        </span>
      );
    }

    switch (action) {
      case 'CREATE':
        return (
          <span className="px-2 py-0.5 bg-blue-100 text-blue-800 border border-blue-200 text-[10px] font-bold rounded flex items-center gap-1 w-max">
            <FileText className="w-2.5 h-2.5" />
            Khởi Tạo
          </span>
        );
      case 'APPROVE':
        return (
          <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 border border-emerald-200 text-[10px] font-bold rounded flex items-center gap-1 w-max">
            <CheckCircle2 className="w-2.5 h-2.5" />
            Phê Duyệt
          </span>
        );
      case 'REJECT':
        return (
          <span className="px-2 py-0.5 bg-red-100 text-red-800 border border-red-200 text-[10px] font-bold rounded flex items-center gap-1 w-max">
            <XCircle className="w-2.5 h-2.5" />
            Từ Chối
          </span>
        );
      case 'REQUEST_INFO':
        return (
          <span className="px-2 py-0.5 bg-amber-100 text-amber-900 border border-amber-200 text-[10px] font-bold rounded flex items-center gap-1 w-max">
            <AlertCircle className="w-2.5 h-2.5 text-amber-600" />
            Yêu Cầu Bổ Sung
          </span>
        );
      case 'RESUBMIT':
        return (
          <span className="px-2 py-0.5 bg-orange-100 text-orange-800 border border-orange-200 text-[10px] font-bold rounded flex items-center gap-1 w-max">
            <RotateCcw className="w-2.5 h-2.5" />
            Gửi Lại Hồ Sơ
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 bg-slate-100 text-slate-700 text-[10px] font-bold rounded w-max">
            {action}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <History className="h-5 w-5 text-brand-blue" />
            <span>Nhật Ký Hoạt Động & Lịch Sử Hệ Thống (Audit Trail)</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Lịch sử toàn bộ các thao tác tạo, chỉnh sửa, ký duyệt, từ chối hoặc đổi trạng thái hồ sơ
          </p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="p-3.5 bg-white border border-slate-200 rounded-[4px] shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Tìm theo mã hồ sơ, tên văn bản, người thực hiện hoặc nội dung ý kiến..."
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-[3px] focus:bg-white focus:outline-none focus:ring-1 focus:ring-brand-blue font-medium"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="w-full sm:w-auto px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-[3px] font-semibold text-slate-700 focus:outline-none"
          >
            <option value="ALL">Tất cả hành động</option>
            <option value="CREATE">Khởi tạo</option>
            <option value="APPROVE">Phê duyệt & Ký số</option>
            <option value="REQUEST_INFO">Yêu cầu bổ sung / Trả hồ sơ</option>
            <option value="REJECT">Từ chối duyệt</option>
            <option value="RESUBMIT">Bổ sung & Gửi lại</option>
          </select>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="bg-white rounded-[4px] border border-slate-200 shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">Thời Gian</th>
                <th className="px-4 py-3">Người Thao Tác</th>
                <th className="px-4 py-3">Hành Động</th>
                <th className="px-4 py-3">Hồ Sơ Liên Quan</th>
                <th className="px-4 py-3">Ý Kiến / Ghi Chú</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400">
                    Không tìm thấy nhật ký hoạt động nào phù hợp
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.logId} className="hover:bg-blue-50/30 transition-colors">
                    <td className="px-4 py-3 whitespace-nowrap font-mono text-[11px] text-slate-500">
                      {formatDate(log.timestamp)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <p className={`font-bold text-xs ${log.actorId === 'SYSTEM_BOT' ? 'text-purple-700' : 'text-slate-900'}`}>
                        {log.actorName}
                      </p>
                      <p className="text-[10px] text-slate-500">{log.actorTitle}</p>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {getActionBadge(log.action, log.actorId)}
                    </td>
                    <td className="px-4 py-3 min-w-[200px] max-w-sm">
                      <span 
                        onClick={() => {
                          const targetDoc = documents.find(d => d.id === log.docId);
                          if (targetDoc) setSelectedDocument(targetDoc);
                        }}
                        className="font-bold text-brand-blue hover:underline cursor-pointer"
                      >
                        {log.docCode}
                      </span>
                      <p className="text-slate-700 font-medium text-[11px] line-clamp-1" title={log.docTitle}>
                        {log.docTitle}
                      </p>
                    </td>
                    <td className="px-4 py-3 max-w-md text-slate-600 text-xs italic">
                      {log.comment ? `"${log.comment}"` : '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
