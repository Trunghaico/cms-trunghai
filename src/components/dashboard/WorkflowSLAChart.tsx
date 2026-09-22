import React, { useMemo } from 'react';
import { useDocument } from '../../context/DocumentContext';
import { Clock, CheckCircle2, AlertTriangle, FileText, Building2, Zap, ArrowRight, ShieldAlert, ArrowUpRight } from 'lucide-react';
import { formatDate } from '../../lib/storage';

export const WorkflowSLAChart: React.FC = () => {
  const { documents, stats, setSelectedDocument, departments: systemDepts } = useDocument();

  // 1. Thống kê tỷ lệ BPM toàn hệ thống
  const total = stats.total || 1;
  const approvedPct = Math.round((stats.approved / total) * 100);
  const inProgressPct = Math.round((stats.inProgress / total) * 100);
  const pendingPct = Math.round((stats.pending / total) * 100);
  const rejectedPct = Math.round(((stats.rejected + stats.additionalReq) / total) * 100);

  // 2. Thống kê theo phòng ban vi phạm SLA và tiến độ xử lý
  const departmentSlaMetrics = useMemo(() => {
    const now = Date.now();
    const deptMap: Record<string, {
      deptName: string;
      totalActive: number;
      overdueCount: number;
      autoApprovedCount: number;
      completedCount: number;
      defaultSlaHours: number;
    }> = {};

    // Khởi tạo các phòng ban từ hệ thống
    if (systemDepts && systemDepts.length > 0) {
      systemDepts.forEach(d => {
        deptMap[d.name] = {
          deptName: d.name,
          totalActive: 0,
          overdueCount: 0,
          autoApprovedCount: 0,
          completedCount: 0,
          defaultSlaHours: d.defaultSlaHours || 8,
        };
      });
    }

    // Quét toàn bộ hồ sơ và các bước duyệt
    documents.forEach(doc => {
      doc.steps.forEach((step, idx) => {
        const dName = step.department || 'Phòng ban khác';
        if (!deptMap[dName]) {
          deptMap[dName] = {
            deptName: dName,
            totalActive: 0,
            overdueCount: 0,
            autoApprovedCount: 0,
            completedCount: 0,
            defaultSlaHours: step.slaHours || 8,
          };
        }

        if (step.status === 'CURRENT') {
          deptMap[dName].totalActive += 1;
          const isOverdue = step.isOverdue || (step.deadline && now > new Date(step.deadline).getTime());
          if (isOverdue) {
            deptMap[dName].overdueCount += 1;
          }
        }

        if (step.status === 'APPROVED') {
          deptMap[dName].completedCount += 1;
          if (step.autoApprovedBySystem) {
            deptMap[dName].autoApprovedCount += 1;
          }
        }
      });
    });

    return Object.values(deptMap).sort((a, b) => b.overdueCount - a.overdueCount || b.totalActive - a.totalActive);
  }, [documents, systemDepts]);

  // 3. Danh sách các hồ sơ đang bị quá hạn SLA cần Ban Lãnh Đạo chỉ đạo
  const overdueDocuments = useMemo(() => {
    const now = Date.now();
    return documents.filter(doc => {
      if (doc.status === 'APPROVED' || doc.status === 'REJECTED' || doc.status === 'ADDITIONAL_REQ') return false;
      const currentStep = doc.steps[doc.currentStepIndex];
      if (!currentStep || currentStep.status !== 'CURRENT') return false;
      return doc.isOverdue || currentStep.isOverdue || (currentStep.deadline && now > new Date(currentStep.deadline).getTime());
    });
  }, [documents]);

  return (
    <div className="space-y-5">
      
      {/* KHỐI 1: BÁO CÁO CẢNH BÁO VI PHẠM SLA DÀNH CHO BAN LÃNH ĐẠO */}
      {overdueDocuments.length > 0 && (
        <div className="bg-white/95 backdrop-blur-md rounded-2xl border border-red-300 shadow-card hover:shadow-elevated transition-all overflow-hidden">
          <div className="px-5 py-4 bg-gradient-to-r from-red-600 to-rose-700 text-white flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-xl">
                <ShieldAlert className="w-5 h-5 text-amber-300 animate-pulse" />
              </div>
              <div>
                <h3 className="text-sm font-bold tracking-tight">
                  Báo Cáo Vi Phạm SLA: {overdueDocuments.length} Hồ Sơ Đang Trễ Hạn Phê Duyệt
                </h3>
                <p className="text-[11px] text-red-100">
                  Cảnh báo gửi Ban Lãnh Đạo về các phòng ban chưa xử lý hồ sơ đúng cam kết
                </p>
              </div>
            </div>
            <span className="text-xs font-bold px-3 py-1 bg-white text-red-700 rounded-full shadow-xs">
              {overdueDocuments.length} vi phạm
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-red-50/70 text-red-950 font-bold border-b border-red-200 uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="px-4 py-3.5">Số Hiệu / Trích Yếu</th>
                  <th className="px-4 py-3.5">Phòng Ban Chậm Trễ</th>
                  <th className="px-4 py-3.5">Bước Tắc Nghẽn</th>
                  <th className="px-4 py-3.5">SLA Cam Kết</th>
                  <th className="px-4 py-3.5">Chính Sách</th>
                  <th className="px-4 py-3.5 text-right">Thao Tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-red-100">
                {overdueDocuments.map((doc) => {
                  const currentStep = doc.steps[doc.currentStepIndex];
                  const deadlineTime = currentStep?.deadline ? new Date(currentStep.deadline).getTime() : 0;
                  const overdueHours = deadlineTime ? Math.max(1, Math.round((Date.now() - deadlineTime) / (1000 * 3600))) : (doc.overdueHours || 1);
                  const action = currentStep?.overdueAction || doc.overdueAction || 'WARN_AND_RETURN';

                  return (
                    <tr key={doc.id} className="hover:bg-red-50/40 transition-colors">
                      <td className="px-4 py-3.5 min-w-[200px]">
                        <div 
                          onClick={() => setSelectedDocument(doc)}
                          className="font-bold text-indigo-700 hover:underline cursor-pointer"
                        >
                          {doc.code}
                        </div>
                        <div className="text-slate-800 font-medium line-clamp-1 text-[11px]" title={doc.title}>
                          {doc.title}
                        </div>
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Building2 className="w-3.5 h-3.5 text-red-600 shrink-0" />
                          <span className="font-bold text-red-900">{currentStep?.department || doc.department}</span>
                        </div>
                        <span className="text-[10px] text-red-700 font-semibold">
                          Quá hạn: ~{overdueHours} giờ
                        </span>
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <span className="px-2.5 py-0.5 bg-red-100 text-red-800 font-bold text-[10px] rounded-full border border-red-300">
                          Bước {doc.currentStepIndex + 1}: {currentStep?.title}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap text-slate-700 font-medium">
                        {currentStep?.slaHours || 8} giờ
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        {action === 'AUTO_APPROVE' ? (
                          <span className="px-2.5 py-0.5 bg-purple-100 text-purple-800 font-bold text-[10px] rounded-full border border-purple-200 flex items-center gap-1 w-max">
                            <Zap className="w-3 h-3" />
                            Tự động duyệt
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 bg-amber-100 text-amber-900 font-bold text-[10px] rounded-full border border-amber-300 flex items-center gap-1 w-max">
                            <AlertTriangle className="w-3 h-3 text-amber-600" />
                            Cảnh báo & Trả hồ sơ
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-right whitespace-nowrap">
                        <button
                          onClick={() => setSelectedDocument(doc)}
                          className="px-3.5 py-1.5 bg-gradient-to-r from-brand-red to-red-600 hover:from-red-600 hover:to-brand-red text-white font-bold text-xs rounded-xl transition-all shadow-xs cursor-pointer"
                        >
                          Xử Lý Ngay
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* KHỐI 2: THỐNG KÊ TỔNG QUAN BPM & HIỆU SUẤT SLA CÁC PHÒNG BAN */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        
        {/* Tiến độ xử lý luồng phê duyệt (BPM Status Distribution) */}
        <div className="bg-white/90 backdrop-blur-md p-5.5 rounded-2xl border border-slate-200/90 shadow-card">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-800">Tỷ lệ Luân chuyển Hồ sơ (BPM)</h3>
              <p className="text-xs text-slate-500">Phân bổ trạng thái phê duyệt toàn công ty</p>
            </div>
            <span className="text-xs font-bold px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full">
              {stats.total} hồ sơ
            </span>
          </div>

          {/* Multi-segmented Progress Bar */}
          <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden flex mb-4.5 p-0.5">
            <div style={{ width: `${approvedPct}%` }} className="bg-emerald-500 h-full rounded-full transition-all" title={`Đã duyệt: ${approvedPct}%`} />
            <div style={{ width: `${inProgressPct}%` }} className="bg-indigo-600 h-full transition-all" title={`Đang xử lý: ${inProgressPct}%`} />
            <div style={{ width: `${pendingPct}%` }} className="bg-amber-500 h-full transition-all" title={`Chờ duyệt: ${pendingPct}%`} />
            <div style={{ width: `${rejectedPct}%` }} className="bg-brand-red h-full rounded-full transition-all" title={`Từ chối/Bổ sung: ${rejectedPct}%`} />
          </div>

          {/* Legend */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
            <div className="p-2.5 bg-emerald-50/80 border border-emerald-100 rounded-xl">
              <div className="flex items-center gap-1.5 text-emerald-700 font-semibold mb-0.5">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                <span>Đã duyệt</span>
              </div>
              <p className="text-base font-bold text-emerald-900">{stats.approved} <span className="text-[11px] font-normal text-emerald-700">({approvedPct}%)</span></p>
            </div>

            <div className="p-2.5 bg-indigo-50/80 border border-indigo-100 rounded-xl">
              <div className="flex items-center gap-1.5 text-indigo-700 font-semibold mb-0.5">
                <span className="h-2 w-2 rounded-full bg-indigo-600" />
                <span>Đang xử lý</span>
              </div>
              <p className="text-base font-bold text-indigo-900">{stats.inProgress} <span className="text-[11px] font-normal text-indigo-700">({inProgressPct}%)</span></p>
            </div>

            <div className="p-2.5 bg-amber-50/80 border border-amber-100 rounded-xl">
              <div className="flex items-center gap-1.5 text-amber-700 font-semibold mb-0.5">
                <span className="h-2 w-2 rounded-full bg-amber-500" />
                <span>Chờ duyệt</span>
              </div>
              <p className="text-base font-bold text-amber-900">{stats.pending} <span className="text-[11px] font-normal text-amber-700">({pendingPct}%)</span></p>
            </div>

            <div className="p-2.5 bg-red-50/80 border border-red-100 rounded-xl">
              <div className="flex items-center gap-1.5 text-red-700 font-semibold mb-0.5">
                <span className="h-2 w-2 rounded-full bg-brand-red" />
                <span>Từ chối/BS</span>
              </div>
              <p className="text-base font-bold text-red-900">{stats.rejected + stats.additionalReq} <span className="text-[11px] font-normal text-red-700">({rejectedPct}%)</span></p>
            </div>
          </div>
        </div>

        {/* Bảng Giám Sát SLA Theo Từng Phòng Ban */}
        <div className="bg-white/90 backdrop-blur-md p-5.5 rounded-2xl border border-slate-200/90 shadow-card">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-800">Giám Sát SLA Theo Phòng Ban</h3>
              <p className="text-xs text-slate-500">Mức độ tuân thủ thời gian xử lý hồ sơ</p>
            </div>
            <span className="text-xs font-semibold text-slate-500">
              {departmentSlaMetrics.length} phòng ban
            </span>
          </div>

          <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
            {departmentSlaMetrics.map((item) => {
              const hasOverdue = item.overdueCount > 0;
              return (
                <div key={item.deptName} className="p-3 bg-slate-50/80 hover:bg-slate-100/80 border border-slate-200/80 rounded-xl flex items-center justify-between text-xs transition-colors">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <Building2 className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                      <span className="font-bold text-slate-900 truncate">{item.deptName}</span>
                      <span className="text-[10px] text-slate-400 font-medium">(SLA: {item.defaultSlaHours}h)</span>
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-[11px] text-slate-600">
                      <span>Đang chờ: <strong>{item.totalActive}</strong></span>
                      <span>Đã xong: <strong className="text-emerald-700">{item.completedCount}</strong></span>
                      {item.autoApprovedCount > 0 && (
                        <span className="text-purple-700 font-semibold">Tự động: {item.autoApprovedCount}</span>
                      )}
                    </div>
                  </div>

                  <div className="shrink-0 text-right">
                    {hasOverdue ? (
                      <span className="px-2.5 py-0.5 bg-red-100 text-red-800 font-bold text-[10px] rounded-full border border-red-300 animate-pulse">
                        ⚠️ Trễ {item.overdueCount} hồ sơ
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 font-bold text-[10px] rounded-full border border-emerald-200">
                        ✓ Đúng hạn 100%
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>

    </div>
  );
};
