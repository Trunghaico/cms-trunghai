import React, { useState, useMemo, useEffect } from 'react';
import { useDocument } from '../../context/DocumentContext';
import { 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  Building2, 
  ShieldAlert, 
  Zap, 
  Search, 
  FileText,
  X,
  ArrowRight,
  ExternalLink,
  ChevronRight,
  Filter,
  Flame,
  User,
  ArrowDown
} from 'lucide-react';
import { formatDate } from '../../lib/storage';
import { DocumentItem } from '../../types';

export const SLAReportView: React.FC = () => {
  const { documents, setSelectedDocument, departments: systemDepts } = useDocument();
  const [selectedDept, setSelectedDept] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  // State cho Modal danh sách hồ sơ quá hạn khi bấm trực tiếp vào số lượng quá hạn
  const [isOverdueModalOpen, setIsOverdueModalOpen] = useState(false);
  const [overdueModalDept, setOverdueModalDept] = useState<string | null>(null);
  const [modalSearchTerm, setModalSearchTerm] = useState('');

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

  // 2. Danh sách hồ sơ đang tắc nghẽn / quá hạn SLA (Bảng dưới)
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
        return (
          doc.code.toLowerCase().includes(q) || 
          doc.title.toLowerCase().includes(q) || 
          (doc.creatorName || '').toLowerCase().includes(q) ||
          currentStep.department.toLowerCase().includes(q)
        );
      }

      return true;
    });
  }, [documents, selectedDept, searchTerm]);

  // 3. Danh sách hồ sơ quá hạn cho Modal (khi người dùng bấm trực tiếp vào số quá hạn)
  const modalOverdueDocs = useMemo(() => {
    if (!overdueModalDept) return [];
    const now = Date.now();
    return documents.filter(doc => {
      if (doc.status === 'APPROVED' || doc.status === 'REJECTED') return false;
      const currentStep = doc.steps[doc.currentStepIndex];
      if (!currentStep || currentStep.status !== 'CURRENT') return false;

      const isOverdue = doc.isOverdue || currentStep.isOverdue || (currentStep.deadline && now > new Date(currentStep.deadline).getTime());
      if (!isOverdue) return false;

      if (overdueModalDept !== 'ALL' && currentStep.department !== overdueModalDept) return false;

      if (modalSearchTerm) {
        const q = modalSearchTerm.toLowerCase();
        return (
          doc.code.toLowerCase().includes(q) ||
          doc.title.toLowerCase().includes(q) ||
          (doc.creatorName || '').toLowerCase().includes(q) ||
          (currentStep.department || '').toLowerCase().includes(q) ||
          (currentStep.title || '').toLowerCase().includes(q)
        );
      }

      return true;
    }).sort((a, b) => {
      const stepA = a.steps[a.currentStepIndex];
      const stepB = b.steps[b.currentStepIndex];
      const timeA = stepA?.deadline ? new Date(stepA.deadline).getTime() : 0;
      const timeB = stepB?.deadline ? new Date(stepB.deadline).getTime() : 0;
      return timeA - timeB; // Quá hạn lâu nhất lên trước
    });
  }, [documents, overdueModalDept, modalSearchTerm]);

  // Xử lý mở modal khi bấm vào số quá hạn
  const handleOpenOverdueModal = (deptName: string) => {
    setOverdueModalDept(deptName);
    setModalSearchTerm('');
    setIsOverdueModalOpen(true);
  };

  // Đóng modal
  const handleCloseOverdueModal = () => {
    setIsOverdueModalOpen(false);
    setOverdueModalDept(null);
    setModalSearchTerm('');
  };

  // Mở chi tiết hồ sơ từ modal
  const handleSelectDoc = (doc: DocumentItem) => {
    setIsOverdueModalOpen(false);
    setSelectedDocument(doc);
  };

  // Lọc vào bảng danh sách phía dưới và cuộn tới
  const handleFilterAndScroll = (deptName: string) => {
    setSelectedDept(deptName);
    setIsOverdueModalOpen(false);
    setTimeout(() => {
      const el = document.getElementById('overdue-docs-table');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
      }
    }, 100);
  };

  // Lắng nghe phím ESC để đóng modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOverdueModalOpen) {
        handleCloseOverdueModal();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOverdueModalOpen]);

  // Tổng hợp tổng số
  const totalOverdue = departmentMetrics.reduce((acc, d) => acc + d.overdueCount, 0);
  const totalAutoApproved = departmentMetrics.reduce((acc, d) => acc + d.autoApprovedCount, 0);
  const totalActiveInSla = departmentMetrics.reduce((acc, d) => acc + d.totalActive, 0);

  // Lấy SLA chuẩn của phòng ban đang mở modal nếu có
  const currentModalDeptInfo = useMemo(() => {
    if (!overdueModalDept || overdueModalDept === 'ALL') return null;
    return departmentMetrics.find(d => d.deptName === overdueModalDept);
  }, [overdueModalDept, departmentMetrics]);

  return (
    <div className="space-y-6 animate-fade-in relative">
      
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
        <div 
          onClick={() => totalOverdue > 0 && handleOpenOverdueModal('ALL')}
          className={`p-4 bg-white border rounded-2xl shadow-xs flex items-center justify-between gap-3.5 transition-all ${
            totalOverdue > 0 
              ? 'border-red-200/90 hover:border-red-300 hover:shadow-md hover:bg-red-50/20 cursor-pointer group' 
              : 'border-slate-200/90'
          }`}
          title={totalOverdue > 0 ? "Bấm trực tiếp để xem danh sách toàn bộ hồ sơ quá hạn SLA" : undefined}
        >
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="p-3 bg-red-100 text-brand-red rounded-xl shrink-0 group-hover:scale-110 transition-transform">
              <ShieldAlert className="w-6 h-6 animate-pulse" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] text-slate-500 font-bold uppercase tracking-wider truncate">Hồ Sơ Đang Quá Hạn SLA</p>
              <p className="text-2xl font-black text-brand-red mt-0.5">{totalOverdue}</p>
              <p className="text-[10.5px] text-red-600 font-semibold truncate">
                {totalOverdue > 0 ? 'Bấm để xem danh sách chi tiết →' : 'Không có hồ sơ trễ hạn'}
              </p>
            </div>
          </div>
          {totalOverdue > 0 && (
            <span className="text-xs text-red-600 font-bold hidden sm:inline-flex items-center gap-1 bg-red-50 border border-red-200 px-2.5 py-1 rounded-xl group-hover:bg-red-100 transition-colors shrink-0">
              <span>Xem ({totalOverdue})</span>
              <span>→</span>
            </span>
          )}
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
        <div className="px-4 sm:px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs sm:text-sm font-bold text-slate-900">Hiệu Suất SLA Theo Phòng Ban</h3>
              <span className="text-[10.5px] font-semibold text-brand-blue bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200 hidden md:inline-flex items-center gap-1">
                <span>💡 Bấm vào số lượng hồ sơ quá hạn để xem danh sách cụ thể</span>
              </span>
            </div>
            <p className="text-[11px] text-slate-500">Đánh giá tỷ lệ xử lý đúng hạn và số hồ sơ bị tắc nghẽn</p>
          </div>
          <span className="text-[11px] font-bold text-slate-700 bg-white px-2.5 py-1 rounded-full border border-slate-200 shadow-2xs self-start sm:self-auto">
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

                {/* Overdue alert banner if any - CLICKABLE */}
                {dept.overdueCount > 0 && (
                  <button
                    type="button"
                    onClick={() => handleOpenOverdueModal(dept.deptName)}
                    className="w-full mt-2.5 px-3 py-2 bg-red-100 hover:bg-red-200/90 border border-red-300 text-red-800 rounded-xl flex items-center justify-between text-xs font-bold transition-all cursor-pointer shadow-2xs active:scale-98 text-left group"
                    title={`Bấm để xem danh sách ${dept.overdueCount} hồ sơ quá hạn của ${dept.deptName}`}
                  >
                    <span className="flex items-center gap-1.5 min-w-0 truncate">
                      <span className="animate-pulse shrink-0">⚠️</span>
                      <span className="truncate">{dept.overdueCount} hồ sơ quá hạn SLA</span>
                    </span>
                    <span className="text-[10px] uppercase font-black bg-red-600 group-hover:bg-red-700 text-white px-2 py-0.5 rounded-full flex items-center gap-1 shrink-0 shadow-2xs">
                      <span>Xem cụ thể</span>
                      <span>→</span>
                    </span>
                  </button>
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
                <th className="px-4 py-3 whitespace-nowrap">Quá Hạn SLA (Bấm để xem)</th>
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
                        <button
                          type="button"
                          onClick={() => handleOpenOverdueModal(dept.deptName)}
                          className="px-3 py-1.5 bg-red-100 hover:bg-red-200 text-red-800 font-bold text-[11px] rounded-full border border-red-300 shadow-2xs hover:shadow-md transition-all duration-150 cursor-pointer inline-flex items-center gap-1.5 group transform hover:scale-105 active:scale-95"
                          title={`Bấm trực tiếp để xem danh sách ${dept.overdueCount} hồ sơ quá hạn của ${dept.deptName}`}
                        >
                          <span className="text-red-600 animate-pulse">⚠️</span>
                          <span>{dept.overdueCount} hồ sơ</span>
                          <span className="text-[10px] text-red-600 font-bold group-hover:translate-x-0.5 transition-transform">→</span>
                        </button>
                      ) : (
                        <span className="px-2.5 py-1 text-slate-400 font-mono font-semibold text-[11px]">
                          0
                        </span>
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

      {/* 2. DANH SÁCH CHI TIẾT CÁC HỒ SƠ QUÁ HẠN (BẢNG TRANG BÁO CÁO) */}
      <div id="overdue-docs-table" className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden scroll-mt-20">
        <div className="px-4 sm:px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs sm:text-sm font-bold text-slate-900">
                Hồ Sơ Đang Trễ Hạn ({overdueDocs.length})
              </h3>
              {selectedDept !== 'ALL' && (
                <span className="px-2.5 py-0.5 bg-red-100 text-red-800 text-[11px] font-bold rounded-full border border-red-300 flex items-center gap-1.5">
                  <span>Phòng: {selectedDept}</span>
                  <button
                    onClick={() => setSelectedDept('ALL')}
                    className="hover:text-red-950 font-black cursor-pointer"
                    title="Bỏ lọc phòng ban"
                  >
                    ×
                  </button>
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-500 hidden sm:block">Tra cứu các hồ sơ vi phạm cam kết SLA cần xử lý ngay</p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            {/* Quick Search */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Tìm mã số, tiêu đề, người lập..."
                className="w-full sm:w-56 pl-8 pr-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-blue/20"
              />
              {searchTerm && (
                <button 
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Department Filter Select */}
            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-blue/20"
            >
              <option value="ALL">🏢 Tất cả phòng ban</option>
              {departmentMetrics.map(d => (
                <option key={d.deptName} value={d.deptName}>
                  {d.deptName} {d.overdueCount > 0 ? `(⚠️ ${d.overdueCount} trễ)` : ''}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* MOBILE OVERDUE CARDS (< md) */}
        <div className="block md:hidden divide-y divide-slate-100 p-3 space-y-3">
          {overdueDocs.length === 0 ? (
            <div className="py-8 text-center text-slate-400">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-1.5" />
              <p className="font-semibold text-xs text-slate-600">Không có hồ sơ nào bị quá hạn trong bộ lọc này</p>
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
                    <FileText className="w-3.5 h-3.5" />
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

      {/* ========================================================================= */}
      {/* 3. MODAL POPUP: XEM TRỰC TIẾP DANH SÁCH HỒ SƠ QUÁ HẠN KHI BẤM VÀO SỐ LƯỢNG */}
      {/* ========================================================================= */}
      {isOverdueModalOpen && overdueModalDept && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 animate-fade-in">
          <div 
            className="bg-white w-full max-w-4xl max-h-[90vh] rounded-3xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-scale-up"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="px-5 py-4 bg-gradient-to-r from-red-600 via-rose-600 to-amber-600 text-white flex items-center justify-between shrink-0 shadow-md">
              <div className="flex items-center gap-3 min-w-0">
                <div className="p-2.5 bg-white/20 backdrop-blur-md rounded-2xl shrink-0 shadow-xs">
                  <ShieldAlert className="w-6 h-6 text-amber-300 animate-pulse" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-sm sm:text-base font-black tracking-tight truncate">
                      Hồ Sơ Quá Hạn SLA: {overdueModalDept === 'ALL' ? 'Toàn Bộ Phòng Ban' : overdueModalDept}
                    </h3>
                    <span className="px-2.5 py-0.5 bg-white text-red-700 font-extrabold text-[11px] rounded-full shadow-2xs">
                      {modalOverdueDocs.length} hồ sơ trễ hạn
                    </span>
                  </div>
                  <p className="text-[11px] text-red-100 mt-0.5 truncate">
                    {currentModalDeptInfo 
                      ? `Quy định chuẩn: SLA ${currentModalDeptInfo.defaultSlaHours}h | Bấm vào từng hồ sơ để xem chi tiết, ký duyệt hoặc chỉ đạo xử lý` 
                      : 'Các hồ sơ đang bị ách tắc vượt quá thời hạn cam kết SLA trong toàn hệ thống'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleCloseOverdueModal}
                className="p-2 bg-white/10 hover:bg-white/25 text-white rounded-xl transition-all cursor-pointer shrink-0 ml-2"
                title="Đóng (ESC)"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Sub-bar: Search & Quick Jump */}
            <div className="px-5 py-3 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 shrink-0">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={modalSearchTerm}
                  onChange={(e) => setModalSearchTerm(e.target.value)}
                  placeholder="Lọc nhanh theo mã hồ sơ, tiêu đề, người tạo, bước duyệt..."
                  className="w-full pl-8 pr-8 py-1.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500/20"
                  autoFocus
                />
                {modalSearchTerm && (
                  <button
                    onClick={() => setModalSearchTerm('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={() => handleFilterAndScroll(overdueModalDept)}
                className="text-xs font-bold text-slate-700 hover:text-brand-blue bg-white hover:bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-xl shadow-2xs transition-all flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
              >
                <ArrowDown className="w-3.5 h-3.5 text-brand-blue" />
                <span>Xem trên bảng dưới trang</span>
              </button>
            </div>

            {/* Modal Body: Overdue Dossiers List */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3 custom-scrollbar">
              {modalOverdueDocs.length === 0 ? (
                <div className="py-12 text-center text-slate-400 space-y-2">
                  <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
                  <h4 className="font-bold text-sm text-slate-700">Không tìm thấy hồ sơ nào bị quá hạn</h4>
                  <p className="text-xs text-slate-500">
                    {modalSearchTerm ? 'Không có kết quả khớp với từ khóa tìm kiếm.' : 'Tất cả hồ sơ thuộc phạm vi này đều đang được xử lý đúng cam kết SLA!'}
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {modalOverdueDocs.map((doc, idx) => {
                    const currentStep = doc.steps[doc.currentStepIndex];
                    const deadlineTime = currentStep?.deadline ? new Date(currentStep.deadline).getTime() : 0;
                    const overdueHours = deadlineTime ? Math.max(1, Math.round((Date.now() - deadlineTime) / (1000 * 3600))) : (doc.overdueHours || 1);
                    const overdueDays = Math.floor(overdueHours / 24);
                    const remainingHours = overdueHours % 24;
                    const overdueText = overdueDays > 0 ? `Trễ ${overdueDays} ngày ${remainingHours}h` : `Trễ ~${overdueHours} giờ`;

                    return (
                      <div
                        key={doc.id}
                        className="p-3.5 sm:p-4 bg-white hover:bg-red-50/30 border border-red-200 rounded-2xl shadow-xs transition-all flex flex-col md:flex-row md:items-center justify-between gap-3.5 group hover:border-red-300"
                      >
                        {/* Info Left */}
                        <div className="flex-1 min-w-0 space-y-1.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono font-bold text-xs text-brand-blue bg-blue-100/80 px-2 py-0.5 rounded-md">
                              {doc.code}
                            </span>
                            <span className="px-2.5 py-0.5 bg-red-100 text-red-800 font-bold text-[10.5px] rounded-full border border-red-300 animate-pulse inline-flex items-center gap-1">
                              <span>⚠️</span>
                              <span>{overdueText}</span>
                            </span>
                            {doc.category && (
                              <span className="text-[10px] text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md font-medium">
                                {doc.category}
                              </span>
                            )}
                          </div>

                          <h4 
                            onClick={() => handleSelectDoc(doc)}
                            className="font-bold text-xs sm:text-sm text-slate-900 group-hover:text-brand-blue transition-colors cursor-pointer leading-snug line-clamp-2"
                            title={doc.title}
                          >
                            {doc.title}
                          </h4>

                          {/* Step & Bottleneck Meta */}
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-1 sm:gap-3 text-[11px] text-slate-600 pt-1 border-t border-slate-100">
                            <div>
                              <span className="text-slate-400">Người lập: </span>
                              <strong className="text-slate-800">{doc.creatorName}</strong> ({doc.department})
                            </div>
                            <div>
                              <span className="text-slate-400">Đang tắc tại: </span>
                              <strong className="text-red-700">{currentStep?.department}</strong>
                            </div>
                            <div>
                              <span className="text-slate-400">Hạn chót: </span>
                              <strong className="font-mono text-slate-700">{currentStep?.deadline ? formatDate(currentStep.deadline) : '-'}</strong>
                            </div>
                          </div>
                        </div>

                        {/* Action Right */}
                        <div className="shrink-0 flex items-center md:flex-col justify-end gap-2 border-t md:border-t-0 pt-2 md:pt-0 border-slate-100">
                          <button
                            type="button"
                            onClick={() => handleSelectDoc(doc)}
                            className="w-full md:w-auto px-4 py-2 bg-gradient-to-r from-brand-blue to-indigo-600 hover:from-indigo-600 hover:to-brand-blue text-white font-bold text-xs rounded-xl shadow-glow-blue transition-all cursor-pointer flex items-center justify-center gap-1.5 transform hover:scale-102 active:scale-98"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            <span>Xem Chi Tiết & Chỉ Đạo</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3 shrink-0">
              <span className="text-xs text-slate-500 font-medium">
                Hiển thị <strong>{modalOverdueDocs.length}</strong> hồ sơ quá hạn
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCloseOverdueModal}
                  className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs rounded-xl transition-colors cursor-pointer"
                >
                  Đóng
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};

