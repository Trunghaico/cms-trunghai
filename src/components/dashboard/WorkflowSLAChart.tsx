import React from 'react';
import { useDocument } from '../../context/DocumentContext';
import { Clock, CheckCircle2, AlertTriangle, FileText, ArrowUpRight } from 'lucide-react';

export const WorkflowSLAChart: React.FC = () => {
  const { documents, stats } = useDocument();

  // Thống kê theo danh mục hồ sơ
  const categoryCounts = documents.reduce<Record<string, number>>((acc, doc) => {
    acc[doc.category] = (acc[doc.category] || 0) + 1;
    return acc;
  }, {});

  const total = stats.total || 1;
  const approvedPct = Math.round((stats.approved / total) * 100);
  const inProgressPct = Math.round((stats.inProgress / total) * 100);
  const pendingPct = Math.round((stats.pending / total) * 100);
  const rejectedPct = Math.round(((stats.rejected + stats.additionalReq) / total) * 100);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      
      {/* Tiến độ xử lý luồng phê duyệt (BPM Status Distribution) */}
      <div className="bg-white p-5 rounded-[3px] border border-slate-200 shadow-card">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-800">Tỷ lệ Luân chuyển Hồ sơ (BPM)</h3>
            <p className="text-xs text-slate-500">Phân bổ trạng thái phê duyệt toàn công ty</p>
          </div>
          <span className="text-xs font-bold px-2 py-1 bg-brand-blue-light text-brand-blue rounded-[3px]">
            {stats.total} hồ sơ
          </span>
        </div>

        {/* Multi-segmented Progress Bar */}
        <div className="w-full h-3.5 bg-slate-100 rounded-[3px] overflow-hidden flex mb-4">
          <div style={{ width: `${approvedPct}%` }} className="bg-emerald-500 h-full transition-all" title={`Đã duyệt: ${approvedPct}%`} />
          <div style={{ width: `${inProgressPct}%` }} className="bg-brand-blue h-full transition-all" title={`Đang xử lý: ${inProgressPct}%`} />
          <div style={{ width: `${pendingPct}%` }} className="bg-amber-500 h-full transition-all" title={`Chờ duyệt: ${pendingPct}%`} />
          <div style={{ width: `${rejectedPct}%` }} className="bg-brand-red h-full transition-all" title={`Từ chối/Bổ sung: ${rejectedPct}%`} />
        </div>

        {/* Legend */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
          <div className="p-2 bg-emerald-50 border border-emerald-100 rounded-[3px]">
            <div className="flex items-center gap-1.5 text-emerald-700 font-semibold mb-0.5">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              <span>Đã duyệt</span>
            </div>
            <p className="text-base font-bold text-emerald-900">{stats.approved} <span className="text-[11px] font-normal text-emerald-700">({approvedPct}%)</span></p>
          </div>

          <div className="p-2 bg-brand-blue-light border border-brand-blue/20 rounded-[3px]">
            <div className="flex items-center gap-1.5 text-brand-blue font-semibold mb-0.5">
              <span className="h-2 w-2 rounded-full bg-brand-blue" />
              <span>Đang xử lý</span>
            </div>
            <p className="text-base font-bold text-brand-blue">{stats.inProgress} <span className="text-[11px] font-normal text-brand-blue/80">({inProgressPct}%)</span></p>
          </div>

          <div className="p-2 bg-amber-50 border border-amber-100 rounded-[3px]">
            <div className="flex items-center gap-1.5 text-amber-700 font-semibold mb-0.5">
              <span className="h-2 w-2 rounded-full bg-amber-500" />
              <span>Chờ duyệt</span>
            </div>
            <p className="text-base font-bold text-amber-900">{stats.pending} <span className="text-[11px] font-normal text-amber-700">({pendingPct}%)</span></p>
          </div>

          <div className="p-2 bg-brand-red-light border border-brand-red/20 rounded-[3px]">
            <div className="flex items-center gap-1.5 text-brand-red font-semibold mb-0.5">
              <span className="h-2 w-2 rounded-full bg-brand-red" />
              <span>Từ chối/BS</span>
            </div>
            <p className="text-base font-bold text-brand-red">{stats.rejected + stats.additionalReq} <span className="text-[11px] font-normal text-brand-red/80">({rejectedPct}%)</span></p>
          </div>
        </div>
      </div>

      {/* Phân loại Loại Hồ sơ & DMS Scan metrics */}
      <div className="bg-white p-5 rounded-[3px] border border-slate-200 shadow-card">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-800">Cơ Cấu Hồ Sơ & Lưu Trữ DMS</h3>
            <p className="text-xs text-slate-500">Phân loại theo danh mục nghiệp vụ</p>
          </div>
          <span className="text-xs font-semibold text-slate-500">
            {Object.keys(categoryCounts).length} danh mục
          </span>
        </div>

        <div className="space-y-3">
          {Object.entries(categoryCounts).map(([cat, count]) => {
            const pct = Math.round((count / total) * 100);
            return (
              <div key={cat} className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="font-semibold text-slate-700">{cat}</span>
                  <span className="text-slate-500">{count} hồ sơ ({pct}%)</span>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-[3px] overflow-hidden">
                  <div 
                    className="h-full bg-brand-blue rounded-[3px] transition-all"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
};
