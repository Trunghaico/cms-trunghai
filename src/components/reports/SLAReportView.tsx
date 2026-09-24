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
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <div className="p-4 bg-white border border-slate-200/90 rounded-2xl shadow-xs flex items-center gap-3.5">
          <div className="p-3 bg-red-100 text-brand-red rounded-xl shrink-0">
            <ShieldAlert className="w-6 h-6 animate-pulse" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] text-slate-500 font-bold uppercase tracking-wider truncate">Hồ Sơ Đang Quá Hạn SLA</p>
            <p className="text-2xl font-black text-brand-red mt-0.5">{totalOverdue}</p>
            <p className="text-[10.5px] text-red-600 font-semibold truncate">Cần Ban Lãnh đạo chỉ đạo xử lý</p>
          </div>
        </div>

        <div className="p-4 bg-white border border-slate-200/90 rounded-2xl shadow-xs flex items-center gap-3.5">
          <div className="p-3 bg-purple-100 text-purple-700 rounded-xl shrink-0">
            <Zap className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] text-slate-500 font-bold uppercase tracking-wider truncate">Tự Động Duyệt Hệ Thống</p>
            <p className="text-2xl font-black text-purple-900 mt-0.5">{totalAutoApproved}</p>
            <p className="text-[10.5px] text-purple-700 font-semibold truncate">Ký duyệt vượt cấp khi quá hạn</p>
          </div>
        </div>

        <div className="p-4 bg-white border border-slate-200/90 rounded-2xl shadow-xs flex items-center gap-3.5">
          <div className="p-3 bg-blue-100 text-brand-blue rounded-xl shrink-0">
            <Building2 className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] text-slate-500 font-bold uppercase tracking-wider truncate">Đang Xử Lý Trong Hạn</p>
            <p className="text-2xl font-black text-brand-blue mt-0.5">{Math.max(0, totalActiveInSla - totalOverdue)}</p>
            <p className="text-[10.5px] text-emerald-700 font-semibold truncate">Đảm bảo tiến độ cam kết</p>
          </div>
        </div>
      </div>

      {/* 1. HIỆU SUẤT & TỶ LỆ TUÂN THỦ SLA THEO PHÒNG BAN */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
        <div className="px-4 sm:px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h3 className="text-xs sm:text-sm font-bold text-slate-900">Hiệu Suất SLA Theo Phòng Ban</h3>
            <p className="text-[11px] text-slate-500 hidden sm:block">Đánh giá tỷ lệ xử lý đúng hạn và số hồ sơ bị tắc nghẽn</p>
          </div>
          <span className="text-[11px] font-bold text-slate-700 bg-white px-2.5 py-1 rounded-full border border-slate-200 shadow-2xs">
            {departmentMetrics.length} phòng ban
          </span>
        </div>

        {/* MOBILE CARD VIEW (< md) */}
        <div className="block md:hidden divide-y divide-slate-100 p-3 space-y-3">
          {departmentMetrics.map((dept) => {
            const isViolating = dept.overdueCount > 0;
            return (
              <div 
                key={dept.deptName} 
                className={`p-3.5 rounded-2xl border transition-all ${
                  isViolating 
                    ? 'bg-red-50/40 border-red-200/80 shadow-xs' 
                    : 'bg-white border-slate-200/80 hover:bg-slate-50/60'
                }`}
              >
                {/* Header: Dept name + SLA standard badge */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className={`p-1.5 rounded-lg shrink-0 ${isViolating ? 'bg-red-100 text-red-600' : 'bg-slate-100 text-slate-600'}`}>
                      <Building2 className="w-4 h-4" />
                    </div>
                    <h4 className="font-bold text-xs text-slate-900 truncate">{dept.deptName}</h4>
                  </div>
                  <span className="shrink-0 px-2 py-0.5 bg-slate-100 text-slate-700 font-mono text-[10px] font-bold rounded-full border border-slate-200">
                    SLA: {dept.defaultSlaHours}h
                  </span>
                </div>

                {/* Overdue alert banner if any */}
                {dept.overdueCount > 0 && (
                  <div className="mt-2.5 px-3 py-1.5 bg-red-100/90 border border-red-300 text-red-800 rounded-xl flex items-center justify-between text-xs font-bold animate-pulse">
                    <span>⚠️ {dept.overdueCount} hồ sơ quá hạn SLA</span>
                    <span className="text-[10px] uppercase font-black bg-red-600 text-white px-1.5 py-0.2 rounded-full">Trễ hạn</span>
                  </div>
                )}

                {/* Metrics Grid */}
                <div className="mt-2.5 grid grid-cols-3 gap-2 text-center text-[11px] bg-slate-50/80 p-2 rounded-xl border border-slate-100">
                  <div>
                    <span className="text-slate-400 block text-[9.5px]">Đang chờ</span>
                    <span className="font-bold text-slate-800">{dept.totalActive}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[9.5px]">Tự động duyệt</span>
                    <span className="font-bold text-purple-700">{dept.autoApprovedCount > 0 ? dept.autoApprovedCount : '-'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[9.5px]">Đã duyệt</span>
                    <span className="font-bold text-emerald-700">{dept.completedCount}</span>
                  </div>
                </div>

                {/* Compliance Progress Bar */}
                <div className="mt-3 flex items-center justify-between gap-3">
                  <div className="flex-1 bg-slate-200 h-2 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-500 ${
                        dept.complianceRate >= 90 ? 'bg-emerald-500' : dept.complianceRate >= 70 ? 'bg-amber-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${dept.complianceRate}%` }}
                    />
                  </div>
                  <span className={`font-black text-xs shrink-0 ${
                    dept.complianceRate >= 90 ? 'text-emerald-700' : dept.complianceRate >= 70 ? 'text-amber-700' : 'text-red-700'
                  }`}>
                    {dept.complianceRate}% đúng hạn
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* DESKTOP TABLE VIEW (>= md) */}
        <div className="hidden md:block overflow-x-auto custom-scrollbar">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100/90 text-slate-700 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 whitespace-nowrap">Phòng Ban</th>
                <th className="px-4 py-3 whitespace-nowrap">SLA Chuẩn</th>
                <th className="px-4 py-3 whitespace-nowrap">Đang Chờ Xử Lý</th>
                <th className="px-4 py-3 whitespace-nowrap">Quá Hạn SLA</th>
                <th className="px-4 py-3 whitespace-nowrap">Tự Động Duyệt</th>
                <th className="px-4 py-3 whitespace-nowrap">Đã Hoàn Tất</th>
                <th className="px-4 py-3 whitespace-nowrap">Tỷ Lệ Đúng Hạn</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {departmentMetrics.map((dept) => {
                const isViolating = dept.overdueCount > 0;
                return (
                  <tr key={dept.deptName} className={`hover:bg-blue-50/30 transition-colors ${isViolating ? 'bg-red-50/20' : ''}`}>
                    <td className="px-4 py-3 font-bold text-slate-900 flex items-center gap-2 whitespace-nowrap">
                      <Building2 className={`w-4 h-4 ${isViolating ? 'text-red-500' : 'text-slate-500'}`} />
                      <span>{dept.deptName}</span>
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-600 font-mono whitespace-nowrap">
                      {dept.defaultSlaHours}h
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-800 whitespace-nowrap">
                      {dept.totalActive}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {dept.overdueCount > 0 ? (
                        <span className="px-2.5 py-1 bg-red-100 text-red-800 font-bold text-[10.5px] rounded-full border border-red-300 animate-pulse inline-flex items-center gap-1 whitespace-nowrap">
                          <span>⚠️</span>
                          <span>{dept.overdueCount} hồ sơ</span>
                        </span>
                      ) : (
                        <span className="text-slate-400 font-mono font-semibold">0</span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-semibold text-purple-700 whitespace-nowrap">
                      {dept.autoApprovedCount > 0 ? `${dept.autoApprovedCount} hồ sơ` : '-'}
                    </td>
                    <td className="px-4 py-3 font-semibold text-emerald-700 whitespace-nowrap">
                      {dept.completedCount}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
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

      {/* 2. DANH SÁCH CHI TIẾT CÁC HỒ SƠ QUÁ HẠN */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
        <div className="px-4 sm:px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-xs sm:text-sm font-bold text-slate-900">Hồ Sơ Đang Trễ Hạn ({overdueDocs.length})</h3>
            <p className="text-[11px] text-slate-500 hidden sm:block">Tra cứu các hồ sơ vi phạm cam kết SLA cần xử lý ngay</p>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="w-full sm:w-auto px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-blue/20"
            >
              <option value="ALL">🏢 Tất cả phòng ban</option>
              {departmentMetrics.map(d => (
                <option key={d.deptName} value={d.deptName}>{d.deptName}</option>
              ))}
            </select>
          </div>
        </div>

        {/* MOBILE OVERDUE CARDS (< md) */}
        <div className="block md:hidden divide-y divide-slate-100 p-3 space-y-3">
          {overdueDocs.length === 0 ? (
            <div className="py-8 text-center text-slate-400">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-1.5" />
              <p className="font-semibold text-xs text-slate-600">Không có hồ sơ nào bị quá hạn</p>
            </div>
          ) : (
            overdueDocs.map((doc) => {
              const currentStep = doc.steps[doc.currentStepIndex];
              const deadlineTime = currentStep?.deadline ? new Date(currentStep.deadline).getTime() : 0;
              const overdueHours = deadlineTime ? Math.max(1, Math.round((Date.now() - deadlineTime) / (1000 * 3600))) : 1;

              return (
                <div 
                  key={doc.id} 
                  className="p-3.5 rounded-2xl bg-red-50/50 border border-red-200 space-y-2.5 shadow-xs"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-mono font-bold text-xs text-brand-blue bg-blue-100/80 px-2 py-0.5 rounded-md">
                      {doc.code}
                    </span>
                    <span className="px-2 py-0.5 bg-brand-red text-white font-bold text-[10px] rounded-full shadow-xs animate-pulse">
                      Quá hạn ~{overdueHours}h
                    </span>
                  </div>

                  <h4 
                    onClick={() => setSelectedDocument(doc)}
                    className="font-bold text-xs text-slate-900 leading-snug hover:text-brand-blue cursor-pointer"
                  >
                    {doc.title}
                  </h4>

                  <div className="text-[11px] text-slate-600 space-y-1 bg-white/80 p-2.5 rounded-xl border border-red-100">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Người lập:</span>
                      <span className="font-semibold text-slate-800">{doc.creatorName} ({doc.department})</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Phòng ban tắc:</span>
                      <span className="font-bold text-red-700">{currentStep?.department}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Bước duyệt:</span>
                      <span className="font-medium text-slate-800">Bước {doc.currentStepIndex + 1}: {currentStep?.title}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Hạn chót SLA:</span>
                      <span className="font-mono font-bold text-red-600">{currentStep?.deadline ? formatDate(currentStep.deadline) : '-'}</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setSelectedDocument(doc)}
                    className="w-full py-2 bg-gradient-to-r from-brand-blue to-indigo-600 hover:from-indigo-600 hover:to-brand-blue text-white font-bold text-xs rounded-xl shadow-glow-blue transition-all cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <span>Xem Chi Tiết & Chỉ Đạo Xử Lý</span>
                  </button>
                </div>
              );
            })
          )}
        </div>

        {/* DESKTOP OVERDUE TABLE (>= md) */}
        <div className="hidden md:block overflow-x-auto custom-scrollbar">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100/90 text-slate-600 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 whitespace-nowrap">Số Hiệu / Trích Yếu</th>
                <th className="px-4 py-3 whitespace-nowrap">Người Lập</th>
                <th className="px-4 py-3 whitespace-nowrap">Phòng Ban Làm Chậm</th>
                <th className="px-4 py-3 whitespace-nowrap">Bước Tắc Nghẽn</th>
                <th className="px-4 py-3 whitespace-nowrap">Thời Hạn SLA</th>
                <th className="px-4 py-3 text-right whitespace-nowrap">Thao Tác</th>
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
                      <td className="px-4 py-3 min-w-[220px]">
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
                        <span className="px-2.5 py-1 bg-red-100 text-red-800 font-bold text-[10px] rounded-full border border-red-300">
                          Bước {doc.currentStepIndex + 1}: {currentStep?.title}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap font-mono text-[11px] text-slate-600">
                        {currentStep?.deadline ? formatDate(currentStep.deadline) : '-'}
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <button
                          onClick={() => setSelectedDocument(doc)}
                          className="px-3.5 py-1.5 bg-brand-blue hover:bg-brand-blue-dark text-white font-bold text-xs rounded-xl transition-all shadow-2xs cursor-pointer hover:shadow"
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
