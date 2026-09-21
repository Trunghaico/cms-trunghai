import React, { useState, useMemo } from 'react';
import { useDocument } from '../../context/DocumentContext';
import { DocumentFilter } from './DocumentFilter';
import { DocumentItem } from '../../types';
import { formatDate, formatCurrency } from '../../lib/storage';
import { canUserAccessDocument, isUserApproverForStep } from '../../lib/permissions';
import { 
  FileText, 
  Eye, 
  Trash2, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  Flame, 
  ShieldCheck, 
  ArrowUpDown,
  Plus,
  FileSignature,
  RotateCcw
} from 'lucide-react';

interface DocumentTableProps {
  filterType?: 'ALL' | 'MY_DOCS' | 'PENDING_MY_APPROVAL';
  title?: string;
  subtitle?: string;
}

export const DocumentTable: React.FC<DocumentTableProps> = ({
  filterType = 'ALL',
  title = 'Tất Cả Hồ Sơ Trình Ký',
  subtitle = 'Quản lý toàn bộ danh sách văn bản và tiến độ luân chuyển phê duyệt',
}) => {
  const { 
    documents, 
    activeUser, 
    setSelectedDocument, 
    setIsCreateModalOpen, 
    deleteDocument,
    hasPermission,
    searchQuery: globalSearchQuery 
  } = useDocument();

  const canOverride = hasPermission('approval.override');
  const canDelete = hasPermission('doc.delete');
  const canCreate = hasPermission('doc.create');

  // Local filter states
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [priorityFilter, setPriorityFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [departmentFilter, setDepartmentFilter] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'createdAt' | 'code' | 'amount'>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Lấy danh sách danh mục & phòng ban duy nhất
  const categories = useMemo(() => Array.from(new Set(documents.map(d => d.category))), [documents]);
  const departments = useMemo(() => Array.from(new Set(documents.map(d => d.department))), [documents]);

  const handleResetFilters = () => {
    setStatusFilter('ALL');
    setPriorityFilter('ALL');
    setCategoryFilter('ALL');
    setDepartmentFilter('ALL');
    setSearchTerm('');
  };

  // Lọc dữ liệu theo tab và tiêu chuẩn bảo mật phân quyền ma trận
  const filteredDocuments = useMemo(() => {
    if (!activeUser) return [];
    return documents.filter(doc => {
      // 1. KIỂM TRA QUYỀN XEM HỒ SƠ:
      // Hồ sơ của ai lập thì chỉ có người lập, người phê duyệt và người theo dõi (Cc) được thấy.
      // Người được phân quyền theo dõi toàn bộ hồ sơ (Director, Admin, doc.view_all) mới thấy tất cả.
      if (!canUserAccessDocument(activeUser, doc)) {
        return false;
      }

      const isCreator = doc.creatorId === activeUser.id;

      // 2. Tab base filter
      if (filterType === 'MY_DOCS' && !isCreator) {
        return false;
      }

      if (filterType === 'PENDING_MY_APPROVAL') {
        if (doc.status === 'APPROVED' || doc.status === 'REJECTED' || doc.status === 'ADDITIONAL_REQ') return false;
        const currentStep = doc.steps[doc.currentStepIndex];
        if (!currentStep || currentStep.status !== 'CURRENT') return false;

        const isApproverForCurrentStep = isUserApproverForStep(activeUser, currentStep);
        if (!isApproverForCurrentStep) return false;
      }

      // 3. Status filter
      if (statusFilter !== 'ALL' && doc.status !== statusFilter) {
        return false;
      }

      // 4. Priority filter
      if (priorityFilter !== 'ALL' && doc.priority !== priorityFilter) {
        return false;
      }

      // 5. Category filter
      if (categoryFilter !== 'ALL' && doc.category !== categoryFilter) {
        return false;
      }

      // 6. Department filter
      if (departmentFilter !== 'ALL' && doc.department !== departmentFilter) {
        return false;
      }

      // 7. Search (both local search and header global search)
      const query = (searchTerm || globalSearchQuery).toLowerCase().trim();
      if (query) {
        const matchCode = doc.code.toLowerCase().includes(query);
        const matchTitle = doc.title.toLowerCase().includes(query);
        const matchCreator = doc.creatorName.toLowerCase().includes(query);
        const matchDept = doc.department.toLowerCase().includes(query);
        if (!matchCode && !matchTitle && !matchCreator && !matchDept) {
          return false;
        }
      }

      return true;
    }).sort((a, b) => {
      if (sortBy === 'createdAt') {
        const timeA = new Date(a.createdAt).getTime();
        const timeB = new Date(b.createdAt).getTime();
        return sortOrder === 'desc' ? timeB - timeA : timeA - timeB;
      }
      if (sortBy === 'code') {
        return sortOrder === 'desc' ? b.code.localeCompare(a.code) : a.code.localeCompare(b.code);
      }
      if (sortBy === 'amount') {
        const amtA = a.amount || 0;
        const amtB = b.amount || 0;
        return sortOrder === 'desc' ? amtB - amtA : amtA - amtB;
      }
      return 0;
    });
  }, [documents, filterType, activeUser, statusFilter, priorityFilter, categoryFilter, departmentFilter, searchTerm, globalSearchQuery, sortBy, sortOrder]);

  const toggleSort = (field: 'createdAt' | 'code' | 'amount') => {
    if (sortBy === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded-[3px] border border-emerald-300">
            <ShieldCheck className="h-3 w-3" />
            Đã Phê Duyệt
          </span>
        );
      case 'IN_PROGRESS':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-brand-blue-light text-brand-blue text-[10px] font-bold rounded-[3px] border border-brand-blue/20">
            <Clock className="h-3 w-3" />
            Đang Xử Lý
          </span>
        );
      case 'PENDING':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-100 text-amber-900 text-[10px] font-bold rounded-[3px] border border-amber-300">
            <Clock className="h-3 w-3" />
            Chờ Duyệt
          </span>
        );
      case 'ADDITIONAL_REQ':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-50 text-amber-800 text-[10px] font-bold rounded-[3px] border border-amber-300">
            <AlertCircle className="h-3 w-3" />
            Yêu Cầu Bổ Sung
          </span>
        );
      case 'REJECTED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-100 text-red-800 text-[10px] font-bold rounded-[3px] border border-red-300">
            <XCircle className="h-3 w-3" />
            Bị Từ Chối
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 bg-slate-100 text-slate-700 text-[10px] font-bold rounded-[3px]">
            Bản Nháp
          </span>
        );
    }
  };

  if (!activeUser) return null;

  return (
    <div className="space-y-4">
      
      {/* Table Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <span>{title}</span>
            <span className="px-2 py-0.5 text-xs bg-slate-200 text-slate-700 font-bold rounded-[3px]">
              {filteredDocuments.length}
            </span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>
        </div>

        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="self-start sm:self-auto px-4 py-2 bg-brand-red hover:bg-brand-red-dark text-white text-xs font-bold uppercase tracking-wider rounded-[3px] shadow transition-all duration-150 transform hover:-translate-y-0.5 active:translate-y-0"
        >
          <span>Tạo Trình Ký Mới</span>
        </button>
      </div>

      {/* Filter Component */}
      <DocumentFilter
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        priorityFilter={priorityFilter}
        setPriorityFilter={setPriorityFilter}
        categoryFilter={categoryFilter}
        setCategoryFilter={setCategoryFilter}
        departmentFilter={departmentFilter}
        setDepartmentFilter={setDepartmentFilter}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        categories={categories}
        departments={departments}
        onReset={handleResetFilters}
      />

      {/* Main Table */}
      <div className="bg-white rounded-[3px] border border-slate-200 shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 uppercase text-[10px] tracking-wider select-none">
              <tr>
                <th className="px-4 py-3.5 cursor-pointer hover:bg-slate-100" onClick={() => toggleSort('code')}>
                  <div className="flex items-center gap-1.5">
                    <span>Số Hiệu</span>
                    <ArrowUpDown className="h-3 w-3 text-slate-400" />
                  </div>
                </th>
                <th className="px-4 py-3.5">Trích Yếu Hồ Sơ</th>
                <th className="px-4 py-3.5">Người Trình / Đơn Vị</th>
                <th className="px-4 py-3.5 cursor-pointer hover:bg-slate-100" onClick={() => toggleSort('amount')}>
                  <div className="flex items-center gap-1.5">
                    <span>Giá Trị (VNĐ)</span>
                    <ArrowUpDown className="h-3 w-3 text-slate-400" />
                  </div>
                </th>
                <th className="px-4 py-3.5">Tiến Trình (BPM)</th>
                <th className="px-4 py-3.5">Trạng Thái</th>
                <th className="px-4 py-3.5 cursor-pointer hover:bg-slate-100" onClick={() => toggleSort('createdAt')}>
                  <div className="flex items-center gap-1.5">
                    <span>Ngày Trình</span>
                    <ArrowUpDown className="h-3 w-3 text-slate-400" />
                  </div>
                </th>
                <th className="px-4 py-3.5 text-right">Thao Tác</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {filteredDocuments.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <FileText className="h-10 w-10 mx-auto mb-2 text-slate-300" />
                    <p className="text-sm font-medium">Không tìm thấy hồ sơ nào phù hợp</p>
                    <p className="text-xs text-slate-400 mt-1">Thử thay đổi bộ lọc hoặc tạo hồ sơ trình ký mới</p>
                  </td>
                </tr>
              ) : (
                filteredDocuments.map((doc) => {
                  const currentStep = doc.steps[doc.currentStepIndex];
                  const isApproverForCurrentStep = isUserApproverForStep(activeUser, currentStep);
                  const isMyTurn = doc.status !== 'APPROVED' && doc.status !== 'REJECTED' && doc.status !== 'ADDITIONAL_REQ' && currentStep?.status === 'CURRENT' && isApproverForCurrentStep;

                  return (
                    <tr 
                      key={doc.id}
                      className={`hover:bg-blue-50/40 transition-colors ${
                        isMyTurn ? 'bg-amber-50/30' : ''
                      }`}
                    >
                      {/* Code */}
                      <td className="px-4 py-3 font-mono font-bold text-brand-blue whitespace-nowrap">
                        <span 
                          onClick={() => setSelectedDocument(doc)}
                          className="hover:underline cursor-pointer"
                        >
                          {doc.code}
                        </span>
                      </td>

                      {/* Title & Category */}
                      <td className="px-4 py-3 min-w-[240px] max-w-sm">
                        <div 
                          onClick={() => setSelectedDocument(doc)}
                          className="font-bold text-slate-900 hover:text-brand-blue cursor-pointer line-clamp-1"
                          title={doc.title}
                        >
                          {doc.title}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] text-slate-500 font-medium">
                            {doc.category}
                          </span>
                          {doc.priority === 'VERY_URGENT' && (
                            <span className="px-1.5 py-0.2 bg-brand-red text-white text-[9px] font-bold rounded-[3px] flex items-center gap-0.5">
                              <Flame className="h-2.5 w-2.5" />
                              Hỏa tốc
                            </span>
                          )}
                          {doc.priority === 'URGENT' && (
                            <span className="px-1.5 py-0.2 bg-amber-500 text-white text-[9px] font-bold rounded-[3px]">
                              Khẩn
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Creator & Dept */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <p className="font-semibold text-slate-800">{doc.creatorName}</p>
                        <p className="text-[10px] text-slate-500">{doc.department}</p>
                      </td>

                      {/* Amount */}
                      <td className="px-4 py-3 font-semibold text-slate-800 whitespace-nowrap">
                        {formatCurrency(doc.amount)}
                      </td>

                      {/* BPM Step Progress */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        {doc.status === 'APPROVED' ? (
                          <div className="text-[10px] font-bold text-emerald-700">
                            Hoàn tất {doc.steps.length}/{doc.steps.length} bước
                          </div>
                        ) : (
                          <div>
                            <div className="text-[11px] font-bold text-slate-800">
                              Bước {doc.currentStepIndex + 1}/{doc.steps.length}
                            </div>
                            <p className="text-[10px] text-brand-blue truncate max-w-[140px]">
                              {currentStep?.title || 'Đang xử lý'}
                            </p>
                          </div>
                        )}
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="space-y-1">
                          {getStatusBadge(doc.status)}
                          {doc.isOverdue || (currentStep?.status === 'CURRENT' && currentStep?.deadline && new Date().getTime() > new Date(currentStep.deadline).getTime()) ? (
                            <div>
                              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-red-100 text-red-800 border border-red-300 text-[9px] font-bold rounded-[2px] animate-pulse">
                                <AlertCircle className="h-2.5 w-2.5 text-brand-red shrink-0" />
                                <span>Trễ SLA ({doc.overdueDepartment || currentStep?.department})</span>
                              </span>
                            </div>
                          ) : null}
                          {doc.steps.some(s => s.autoApprovedBySystem) ? (
                            <div>
                              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-purple-100 text-purple-800 border border-purple-200 text-[9px] font-bold rounded-[2px]">
                                <span>⚡ Tự động duyệt</span>
                              </span>
                            </div>
                          ) : null}
                        </div>
                      </td>

                      {/* Date */}
                      <td className="px-4 py-3 text-slate-500 font-mono text-[11px] whitespace-nowrap">
                        {formatDate(doc.createdAt)}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {doc.status === 'ADDITIONAL_REQ' && (doc.creatorId === activeUser.id || activeUser.role === 'ADMIN') ? (
                            <button
                              onClick={() => setSelectedDocument(doc)}
                              className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-[3px] transition-colors shadow-2xs flex items-center gap-1 cursor-pointer"
                            >
                              <RotateCcw className="h-3.5 w-3.5" />
                              <span>Bổ Sung</span>
                            </button>
                          ) : isMyTurn ? (
                            <button
                              onClick={() => setSelectedDocument(doc)}
                              className="px-2.5 py-1 bg-brand-blue hover:bg-brand-blue-dark text-white font-bold text-xs rounded-[3px] transition-colors shadow-sm flex items-center gap-1 cursor-pointer"
                            >
                              <FileSignature className="h-3.5 w-3.5" />
                              <span>Ký Duyệt</span>
                            </button>
                          ) : (
                            <button
                              onClick={() => setSelectedDocument(doc)}
                              title="Xem chi tiết"
                              className="p-1.5 text-slate-600 hover:text-brand-blue hover:bg-slate-100 rounded-[3px] border border-slate-200 transition-colors cursor-pointer"
                            >
                              <Eye className="h-3.5 w-3.5" />
                            </button>
                          )}

                          {canDelete && (doc.creatorId === activeUser.id || canOverride) && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (confirm(`Xác nhận xóa hồ sơ ${doc.code}?`)) {
                                  deleteDocument(doc.id);
                                }
                              }}
                              title="Xóa hồ sơ"
                              className="p-1.5 text-slate-400 hover:text-brand-red hover:bg-red-50 rounded-[3px] transition-colors cursor-pointer"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer */}
        <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <span>Hiển thị {filteredDocuments.length} trên tổng số {documents.length} hồ sơ</span>
          <span className="font-medium text-slate-600">Hệ thống Trình ký Điện tử Trung Hải BPM</span>
        </div>
      </div>

    </div>
  );
};
