import React, { useState, useMemo } from 'react';
import { useDocument } from '../../context/DocumentContext';
import { 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  Building2, 
  ShieldAlert, 
  Zap, 
  ArrowUpDown, 
  Search, 
  Filter, 
  Calendar,
  Users,
  FileText
} from 'lucide-react';
import { formatDate } from '../../lib/storage';

export const SLAReportView: React.FC = () => {
  const { documents, setSelectedDocument, departments: systemDepts } = useDocument();
  const [selectedDept, setSelectedDept] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  // 1. Tính toán thống kê SLA theo từng phòng ban
  const departmentMetrics = useMemo(() => {
    const now = Date.now();
    const deptMap: Record<string, {
      deptName: string;
      totalActive: number;
      overdueCount: number;
      autoApprovedCount: number;
      completedCount: number;
      totalAssigned: number;
      defaultSlaHours: number;
    }> = {};

    if (systemDepts && systemDepts.length > 0) {
      systemDepts.forEach(d => {
        deptMap[d.name] = {
          deptName: d.name,
          totalActive: 0,
          overdueCount: 0,
          autoApprovedCount: 0,
          completedCount: 0,
          totalAssigned: 0,
          defaultSlaHours: d.defaultSlaHours || 8,
        };
      });
    }

    documents.forEach(doc => {
      doc.steps.forEach((step) => {
        const dName = step.department || 'Khác';
        if (!deptMap[dName]) {
          deptMap[dName] = {
            deptName: dName,
            totalActive: 0,
            overdueCount: 0,
            autoApprovedCount: 0,
            completedCount: 0,
            totalAssigned: 0,
            defaultSlaHours: step.slaHours || 8,
          };
        }

        deptMap[dName].totalAssigned += 1;

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

    return Object.values(deptMap).map(item => {
      const onTimeCount = Math.max(0, item.completedCount - item.autoApprovedCount);
      const totalProcessed = item.completedCount + item.overdueCount;
      const complianceRate = totalProcessed > 0 ? Math.round((onTimeCount / totalProcessed) * 100) : 100;
      return {
        ...item,
        complianceRate,
      };
    }).sort((a, b) => b.overdueCount - a.overdueCount || a.complianceRate - b.complianceRate);
  }, [documents, systemDepts]);

  // 2. Danh sách hồ sơ đang tắc nghẽn / quá hạn SLA
  const overdueDocs = useMemo(() => {
    const now = Date.now();
    return documents.filter(doc => {
      if (doc.status === 'APPROVED' || doc.status === 'REJECTED') return false;
      const currentStep = doc.steps[doc.currentStepIndex];
      if (!currentStep || currentStep.status !== 'CURRENT') return false;

      const isOverdue = doc.isOverdue || currentStep.isOverdue || (currentStep.deadline && now > new Date(currentStep.deadline).getTime());
      if (!isOverdue) return false;

      if (selectedDept !== 'ALL' && currentStep.department !== selectedDept) return false;

      if (searchTerm) {
        const q = searchTerm.toLowerCase();
        return doc.code.toLowerCase().includes(q) || doc.title.toLowerCase().includes(q) || currentStep.department.toLowerCase().includes(q);
      }

      return true;
    });
  }, [documents, selectedDept, searchTerm]);

  // Tổng hợp tổng số
  const totalOverdue = departmentMetrics.reduce((acc, d) => acc + d.overdueCount, 0);
  const totalAutoApproved = departmentMetrics.reduce((acc, d) => acc + d.autoApprovedCount, 0);
  const totalActiveInSla = departmentMetrics.reduce((acc, d) => acc + d.totalActive, 0);

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Clock className="h-5 w-5 text-brand-blue" />
            <span>Báo Cáo Tiến Độ & Giám Sát Vi Phạm SLA</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Theo dõi mức độ tuân thủ thời hạn phê duyệt của các phòng ban và nhân sự trong toàn công ty
          </p>
        </div>
      </div>

      {/* Top Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 bg-white border border-slate-200 rounded-[4px] shadow-sm flex items-center gap-3.5">
          <div className="p-3 bg-red-100 text-brand-red rounded-[4px] shrink-0">
            <ShieldAlert className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-semibold uppercase">Hồ Sơ Đang Quá Hạn SLA</p>
            <p className="text-xl font-black text-brand-red mt-0.5">{totalOverdue}</p>
            <p className="text-[10px] text-red-600 font-medium">Cần Ban Lãnh đạo chỉ đạo xử lý</p>
          </div>
        </div>

        <div className="p-4 bg-white border border-slate-200 rounded-[4px] shadow-sm flex items-center gap-3.5">
          <div className="p-3 bg-purple-100 text-purple-700 rounded-[4px] shrink-0">
            <Zap className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-semibold uppercase">Tự Động Duyệt Bởi Hệ Thống</p>
            <p className="text-xl font-black text-purple-900 mt-0.5">{totalAutoApproved}</p>
            <p className="text-[10px] text-purple-700 font-medium">Ký duyệt vượt cấp khi quá hạn</p>
          </div>
        </div>

        <div className="p-4 bg-white border border-slate-200 rounded-[4px] shadow-sm flex items-center gap-3.5">
          <div className="p-3 bg-brand-blue-light text-brand-blue rounded-[4px] shrink-0">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-semibold uppercase">Hồ Sơ Đang Xử Lý Trong Hạn</p>
            <p className="text-xl font-black text-brand-blue mt-0.5">{Math.max(0, totalActiveInSla - totalOverdue)}</p>
            <p className="text-[10px] text-emerald-700 font-medium">Đảm bảo tiến độ cam kết</p>
          </div>
        </div>
      </div>

      {/* Bảng Xếp Hạng Hiệu Suất SLA Từng Phòng Ban */}
      <div className="bg-white rounded-[4px] border border-slate-200 shadow-card overflow-hidden">
        <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-800">Hiệu Suất & Tỷ Lệ Tuân Thủ SLA Theo Phòng Ban</h3>
            <p className="text-xs text-slate-500">Đánh giá tỷ lệ xử lý đúng hạn và số hồ sơ bị tắc nghẽn</p>
          </div>
          <span className="text-xs font-bold text-slate-600 bg-white px-2 py-1 rounded border border-slate-200">
            {departmentMetrics.length} phòng ban
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100 text-slate-700 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">Phòng Ban</th>
                <th className="px-4 py-3">SLA Chuẩn</th>
                <th className="px-4 py-3">Đang Chờ Xử Lý</th>
                <th className="px-4 py-3">Quá Hạn SLA</th>
                <th className="px-4 py-3">Tự Động Duyệt</th>
                <th className="px-4 py-3">Đã Hoàn Tất</th>
                <th className="px-4 py-3">Tỷ Lệ Đúng Hạn</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {departmentMetrics.map((dept) => {
                const isViolating = dept.overdueCount > 0;
                return (
                  <tr key={dept.deptName} className={`hover:bg-blue-50/30 transition-colors ${isViolating ? 'bg-red-50/20' : ''}`}>
                    <td className="px-4 py-3 font-bold text-slate-900 flex items-center gap-2">
                      <Building2 className={`w-4 h-4 ${isViolating ? 'text-red-500' : 'text-slate-500'}`} />
                      <span>{dept.deptName}</span>
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-600 font-mono">
                      {dept.defaultSlaHours}h
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-800">
                      {dept.totalActive}
                    </td>
                    <td className="px-4 py-3">
                      {dept.overdueCount > 0 ? (
                        <span className="px-2 py-0.5 bg-red-100 text-red-800 font-bold text-[10px] rounded border border-red-300 animate-pulse">
                          ⚠️ {dept.overdueCount} hồ sơ
                        </span>
                      ) : (
                        <span className="text-slate-400 font-mono">0</span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-semibold text-purple-700">
                      {dept.autoApprovedCount > 0 ? `${dept.autoApprovedCount} hồ sơ` : '-'}
                    </td>
                    <td className="px-4 py-3 font-semibold text-emerald-700">
                      {dept.completedCount}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-20 bg-slate-200 h-2 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full ${dept.complianceRate >= 90 ? 'bg-emerald-500' : dept.complianceRate >= 70 ? 'bg-amber-500' : 'bg-red-500'}`}
                            style={{ width: `${dept.complianceRate}%` }}
                          />
                        </div>
                        <span className={`font-bold text-[11px] ${dept.complianceRate >= 90 ? 'text-emerald-700' : dept.complianceRate >= 70 ? 'text-amber-700' : 'text-red-700'}`}>
                          {dept.complianceRate}%
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Danh Sách Chi Tiết Các Hồ Sơ Quá Hạn */}
      <div className="bg-white rounded-[4px] border border-slate-200 shadow-card overflow-hidden">
        <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-slate-800">Danh Sách Chi Tiết Hồ Sơ Đang Trễ Hạn ({overdueDocs.length})</h3>
            <p className="text-xs text-slate-500">Tra cứu các hồ sơ vi phạm cam kết SLA cần xử lý ngay</p>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs font-semibold text-slate-700 focus:outline-none"
            >
              <option value="ALL">🏢 Tất cả phòng ban</option>
              {departmentMetrics.map(d => (
                <option key={d.deptName} value={d.deptName}>{d.deptName}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100 text-slate-600 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">Số Hiệu / Trích Yếu</th>
                <th className="px-4 py-3">Người Lập</th>
                <th className="px-4 py-3">Phòng Ban Làm Chậm</th>
                <th className="px-4 py-3">Bước Tắc Nghẽn</th>
                <th className="px-4 py-3">Thời Hạn SLA</th>
                <th className="px-4 py-3 text-right">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {overdueDocs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-1.5" />
                    <p className="font-semibold text-xs text-slate-600">Không có hồ sơ nào bị quá hạn trong bộ lọc này</p>
                  </td>
                </tr>
              ) : (
                overdueDocs.map((doc) => {
                  const currentStep = doc.steps[doc.currentStepIndex];
                  const deadlineTime = currentStep?.deadline ? new Date(currentStep.deadline).getTime() : 0;
                  const overdueHours = deadlineTime ? Math.max(1, Math.round((Date.now() - deadlineTime) / (1000 * 3600))) : 1;

                  return (
                    <tr key={doc.id} className="hover:bg-red-50/40 transition-colors">
                      <td className="px-4 py-3 min-w-[200px]">
                        <div 
                          onClick={() => setSelectedDocument(doc)}
                          className="font-bold text-brand-blue hover:underline cursor-pointer"
                        >
                          {doc.code}
                        </div>
                        <div className="text-slate-800 font-medium line-clamp-1 text-[11px]" title={doc.title}>
                          {doc.title}
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <p className="font-semibold text-slate-800">{doc.creatorName}</p>
                        <p className="text-[10px] text-slate-500">{doc.department}</p>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="font-bold text-red-900">{currentStep?.department}</span>
                        <p className="text-[10px] text-red-700 font-semibold animate-pulse">
                          Quá hạn ~{overdueHours} giờ
                        </p>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="px-2 py-0.5 bg-red-100 text-red-800 font-bold text-[10px] rounded border border-red-300">
                          Bước {doc.currentStepIndex + 1}: {currentStep?.title}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap font-mono text-[11px] text-slate-600">
                        {currentStep?.deadline ? formatDate(currentStep.deadline) : '-'}
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <button
                          onClick={() => setSelectedDocument(doc)}
                          className="px-3 py-1 bg-brand-blue hover:bg-brand-blue-dark text-white font-bold text-xs rounded transition-colors shadow-2xs cursor-pointer"
                        >
                          Xem & Xử Lý
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
