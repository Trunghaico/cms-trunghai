import React, { useState, useMemo, useEffect } from 'react';
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
  RotateCcw,
  MessageSquare,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight
} from 'lucide-react';

interface DocumentTableProps {
  filterType?: 'ALL' | 'MY_DOCS' | 'RECEIVED' | 'ARCHIVE' | 'PENDING_MY_APPROVAL' | 'MY_APPROVED_HISTORY';
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

  // Pagination State - Mặc định tối đa 15 hồ sơ / trang theo yêu cầu
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(15);

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
      if (!canUserAccessDocument(activeUser, doc)) {
        return false;
      }

      const isCreator = doc.creatorId === activeUser.id;

      // 2. Tab base filter
      if (filterType === 'MY_DOCS' && !isCreator) {
        return false;
      }

      if (filterType === 'RECEIVED') {
        // Hồ sơ tiếp nhận / Chờ xử lý: hồ sơ chuyển đến phòng ban của người dùng hoặc đang chờ xử lý
        const currentStep = doc.steps[doc.currentStepIndex];
        const isTargetDept = currentStep?.department?.toLowerCase() === activeUser.department.toLowerCase() ||
                             doc.department.toLowerCase() === activeUser.department.toLowerCase();
        const isNotDone = doc.status === 'PENDING' || doc.status === 'IN_PROGRESS' || doc.status === 'ADDITIONAL_REQ';
        if (!isTargetDept || !isNotDone) {
          return false;
        }
      }

      if (filterType === 'ARCHIVE') {
        // Kho lưu trữ: Hồ sơ đã đóng / hoàn tất phê duyệt
        if (doc.status !== 'APPROVED') {
          return false;
        }
      }

      if (filterType === 'PENDING_MY_APPROVAL') {
        if (doc.status === 'APPROVED' || doc.status === 'REJECTED' || doc.status === 'ADDITIONAL_REQ') return false;
        const currentStep = doc.steps[doc.currentStepIndex];
        if (!currentStep || currentStep.status !== 'CURRENT') return false;

        const isApproverForCurrentStep = isUserApproverForStep(activeUser, currentStep);
        if (!isApproverForCurrentStep) return false;
      }

      if (filterType === 'MY_APPROVED_HISTORY') {
        // Tôi đã duyệt: Các hồ sơ mà chính tài khoản này đã từng bấm phê duyệt ở bất kỳ bước nào
        const hasApproved = doc.steps.some(step => 
          step.status === 'APPROVED' && (
            step.approverId === activeUser.id || 
            (step.approverName && step.approverName.trim().toLowerCase() === activeUser.name.trim().toLowerCase())
          )
        );
        if (!hasApproved) return false;
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

  // Tự động chuyển về trang 1 khi người dùng thay đổi bộ lọc, tìm kiếm hoặc tab
  useEffect(() => {
    setCurrentPage(1);
  }, [filterType, statusFilter, priorityFilter, categoryFilter, departmentFilter, searchTerm, globalSearchQuery, sortBy, sortOrder, pageSize]);

  const totalItems = filteredDocuments.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  // Đảm bảo currentPage luôn hợp lệ khi danh sách hồ sơ thay đổi
  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [totalPages, currentPage]);

  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalItems);

  const paginatedDocuments = useMemo(() => {
    return filteredDocuments.slice(startIndex, startIndex + pageSize);
  }, [filteredDocuments, startIndex, pageSize]);

  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (currentPage <= 3) {
        pages.push(1, 2, 3, 4, '...', totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
      } else {
        pages.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages);
      }
    }
    return pages;
  };

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
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded-full border border-emerald-200 shadow-2xs">
            <CheckCircle2 className="h-3 w-3 text-emerald-600" />
            Đã Phê Duyệt
          </span>
        );
      case 'IN_PROGRESS':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-indigo-100 text-indigo-700 text-[10px] font-bold rounded-full border border-indigo-200 shadow-2xs">
            <Clock className="h-3 w-3 text-indigo-600" />
            Đang Xử Lý
          </span>
        );
      case 'PENDING':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-amber-100 text-amber-900 text-[10px] font-bold rounded-full border border-amber-200 shadow-2xs">
            <Clock className="h-3 w-3 text-amber-600" />
            Chờ Duyệt
          </span>
        );
      case 'ADDITIONAL_REQ':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-amber-50 text-amber-800 text-[10px] font-bold rounded-full border border-amber-200 shadow-2xs">
            <AlertCircle className="h-3 w-3 text-amber-600" />
            Yêu Cầu Bổ Sung
          </span>
        );
      case 'REJECTED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-red-100 text-red-800 text-[10px] font-bold rounded-full border border-red-200 shadow-2xs">
            <XCircle className="h-3 w-3 text-red-600" />
            Bị Từ Chối
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-0.5 bg-slate-100 text-slate-700 text-[10px] font-bold rounded-full">
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
            <span className="px-2.5 py-0.5 text-xs bg-slate-200/80 text-slate-700 font-bold rounded-full">
              {filteredDocuments.length}
            </span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>
        </div>

        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="self-start sm:self-auto px-4 py-2.5 bg-gradient-to-r from-brand-red to-red-600 hover:from-red-600 hover:to-brand-red text-white text-xs font-bold uppercase tracking-wider rounded-xl shadow-[0_0_15px_rgba(237,50,55,0.3)] hover:shadow-[0_0_20px_rgba(237,50,55,0.5)] transition-all duration-150 transform hover:-translate-y-0.5 active:translate-y-0 flex items-center gap-2 cursor-pointer shrink-0"
        >
          <Plus className="h-4 w-4" />
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

      {/* Main Table / Cards View */}
      <div className="bg-white/95 backdrop-blur-md rounded-2xl border border-slate-200/90 shadow-card overflow-hidden">
        
        {/* 1. MOBILE & TABLET CARDS FEED (< lg) */}
        <div className="lg:hidden p-3 sm:p-4 divide-y divide-slate-100 space-y-3">
          {filteredDocuments.length === 0 ? (
            <div className="py-12 text-center text-slate-400">
              <FileText className="h-10 w-10 mx-auto mb-2 text-slate-300" />
              <p className="text-sm font-medium">Không tìm thấy hồ sơ nào phù hợp</p>
              <p className="text-xs text-slate-400 mt-1">Thử thay đổi bộ lọc hoặc tạo hồ sơ trình ký mới</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {paginatedDocuments.map((doc) => {
                const currentStep = doc.steps[doc.currentStepIndex];
                const isApproverForCurrentStep = isUserApproverForStep(activeUser, currentStep);
                const isMyTurn = doc.status !== 'APPROVED' && doc.status !== 'REJECTED' && doc.status !== 'ADDITIONAL_REQ' && currentStep?.status === 'CURRENT' && isApproverForCurrentStep;
                const progressPct = Math.round(((doc.status === 'APPROVED' ? doc.steps.length : doc.currentStepIndex) / doc.steps.length) * 100);

                return (
                  <div
                    key={`mobile-${doc.id}`}
                    onClick={() => setSelectedDocument(doc)}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer space-y-3 ${
                      isMyTurn 
                        ? 'bg-gradient-to-br from-amber-50/70 via-white to-orange-50/40 border-amber-300 shadow-sm ring-1 ring-amber-400/30' 
                        : 'bg-white border-slate-200/90 hover:border-indigo-300 shadow-2xs hover:shadow-sm'
                    }`}
                  >
                    {/* Header: Code, Priority, Status */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-mono font-bold text-xs text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-lg border border-indigo-100">
                          {doc.code}
                        </span>
                        {doc.priority === 'VERY_URGENT' && (
                          <span className="px-2 py-0.5 bg-brand-red text-white text-[9px] font-bold rounded-full flex items-center gap-0.5 shadow-2xs">
                            <Flame className="h-2.5 w-2.5" />
                            Hỏa tốc
                          </span>
                        )}
                        {doc.priority === 'URGENT' && (
                          <span className="px-2 py-0.5 bg-amber-500 text-white text-[9px] font-bold rounded-full">
                            Khẩn
                          </span>
                        )}
                      </div>
                      <div>
                        {getStatusBadge(doc.status)}
                      </div>
                    </div>

                    {/* Title */}
                    <div>
                      <h4 className="font-bold text-slate-900 text-xs sm:text-sm line-clamp-2 hover:text-indigo-600 transition-colors leading-snug">
                        {doc.title}
                      </h4>
                      <div className="flex items-center gap-2 mt-1 text-[10.5px] text-slate-500 flex-wrap">
                        <span className="bg-slate-100 px-2 py-0.5 rounded-full font-medium truncate max-w-[140px]">
                          {doc.category}
                        </span>
                        {doc.amount ? (
                          <span className="font-mono font-semibold text-slate-700">
                            • {formatCurrency(doc.amount)}
                          </span>
                        ) : null}
                        {doc.comments && doc.comments.length > 0 && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-200">
                            <MessageSquare className="w-3 h-3 text-indigo-600" />
                            <span>{doc.comments.length} thảo luận</span>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Progress Bar & Current Step */}
                    <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 space-y-1.5 text-[11px]">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-600">
                          {doc.status === 'APPROVED' ? '✓ Hoàn tất phê duyệt' : `Tiến trình: Bước ${doc.currentStepIndex + 1}/${doc.steps.length}`}
                        </span>
                        <span className="font-bold text-indigo-600 font-mono text-[10px]">{progressPct}%</span>
                      </div>
                      <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full transition-all duration-300 ${
                            doc.status === 'APPROVED' ? 'bg-emerald-500' : isMyTurn ? 'bg-amber-500' : 'bg-brand-blue'
                          }`}
                          style={{ width: `${progressPct}%` }}
                        />
                      </div>
                      {doc.status !== 'APPROVED' && (
                        <p className="text-[10px] text-slate-500 truncate mt-0.5">
                          Đang chờ: <strong className="text-slate-800">{currentStep?.title || currentStep?.department}</strong>
                        </p>
                      )}
                    </div>

                    {/* Footer: Creator info & Actions */}
                    <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-100 text-[11px]">
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-800 truncate">{doc.creatorName}</p>
                        <p className="text-[10px] text-slate-400 font-mono">{formatDate(doc.createdAt)}</p>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                        {doc.status === 'ADDITIONAL_REQ' && (doc.creatorId === activeUser.id || activeUser.role === 'ADMIN') ? (
                          <button
                            onClick={() => setSelectedDocument(doc)}
                            className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-1 cursor-pointer"
                          >
                            <RotateCcw className="h-3.5 w-3.5" />
                            <span>Bổ Sung</span>
                          </button>
                        ) : isMyTurn ? (
                          <button
                            onClick={() => setSelectedDocument(doc)}
                            className="px-3.5 py-1.5 bg-gradient-to-r from-brand-blue to-indigo-600 hover:from-indigo-600 hover:to-brand-blue text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer active:scale-95"
                          >
                            <FileSignature className="h-3.5 w-3.5" />
                            <span>Ký Duyệt Ngay</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => setSelectedDocument(doc)}
                            className="px-3 py-1.5 bg-slate-100 hover:bg-indigo-50 text-indigo-700 font-bold text-xs rounded-xl border border-slate-200 flex items-center gap-1 cursor-pointer"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            <span>Chi Tiết</span>
                          </button>
                        )}

                        {canDelete && (doc.creatorId === activeUser.id || canOverride) && (
                          <button
                            onClick={() => {
                              if (confirm(`Xác nhận xóa hồ sơ ${doc.code}?`)) {
                                deleteDocument(doc.id);
                              }
                            }}
                            title="Xóa hồ sơ"
                            className="p-1.5 text-slate-400 hover:text-brand-red hover:bg-red-50 rounded-xl transition-colors cursor-pointer"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 2. DESKTOP FULL TABLE (>= lg) */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/90 text-slate-600 font-bold border-b border-slate-200 uppercase text-[10px] tracking-wider select-none">
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
                paginatedDocuments.map((doc) => {
                  const currentStep = doc.steps[doc.currentStepIndex];
                  const isApproverForCurrentStep = isUserApproverForStep(activeUser, currentStep);
                  const isMyTurn = doc.status !== 'APPROVED' && doc.status !== 'REJECTED' && doc.status !== 'ADDITIONAL_REQ' && currentStep?.status === 'CURRENT' && isApproverForCurrentStep;

                  return (
                    <tr 
                      key={doc.id}
                      className={`hover:bg-indigo-50/30 transition-colors ${
                        isMyTurn ? 'bg-amber-50/40' : ''
                      }`}
                    >
                      {/* Code */}
                      <td className="px-4 py-3.5 font-mono font-bold text-indigo-700 whitespace-nowrap">
                        <span 
                          onClick={() => setSelectedDocument(doc)}
                          className="hover:underline cursor-pointer"
                        >
                          {doc.code}
                        </span>
                      </td>

                      {/* Title & Category */}
                      <td className="px-4 py-3.5 min-w-[240px] max-w-sm">
                        <div 
                          onClick={() => setSelectedDocument(doc)}
                          className="font-bold text-slate-900 hover:text-indigo-600 cursor-pointer line-clamp-1 transition-colors"
                          title={doc.title}
                        >
                          {doc.title}
                        </div>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <span className="text-[10px] text-slate-500 font-medium bg-slate-100 px-2 py-0.5 rounded-full">
                            {doc.category}
                          </span>
                          {doc.comments && doc.comments.length > 0 && (
                            <span 
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedDocument(doc);
                              }}
                              className="inline-flex items-center gap-1 text-[9.5px] font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-2 py-0.5 rounded-full border border-indigo-200 transition-colors cursor-pointer"
                              title={`${doc.comments.length} ý kiến trao đổi / thảo luận`}
                            >
                              <MessageSquare className="w-3 h-3 text-indigo-600" />
                              <span>{doc.comments.length} trao đổi</span>
                            </span>
                          )}
                          {doc.priority === 'VERY_URGENT' && (
                            <span className="px-2 py-0.5 bg-brand-red text-white text-[9px] font-bold rounded-full flex items-center gap-0.5 shadow-2xs">
                              <Flame className="h-2.5 w-2.5" />
                              Hỏa tốc
                            </span>
                          )}
                          {doc.priority === 'URGENT' && (
                            <span className="px-2 py-0.5 bg-amber-500 text-white text-[9px] font-bold rounded-full">
                              Khẩn
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Creator & Dept */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <p className="font-semibold text-slate-800">{doc.creatorName}</p>
                        <p className="text-[10px] text-slate-500">{doc.department}</p>
                      </td>

                      {/* Amount */}
                      <td className="px-4 py-3.5 font-semibold text-slate-800 whitespace-nowrap font-mono">
                        {formatCurrency(doc.amount)}
                      </td>

                      {/* BPM Step Progress */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        {doc.status === 'APPROVED' ? (
                          <div className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full w-max border border-emerald-200">
                            ✓ Hoàn tất {doc.steps.length}/{doc.steps.length} bước
                          </div>
                        ) : (
                          <div>
                            <div className="text-[11px] font-bold text-slate-800">
                              Bước {doc.currentStepIndex + 1}/{doc.steps.length}
                            </div>
                            <p className="text-[10px] text-indigo-600 font-medium truncate max-w-[140px]">
                              {currentStep?.title || 'Đang xử lý'}
                            </p>
                          </div>
                        )}
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <div className="space-y-1">
                          {getStatusBadge(doc.status)}
                          {doc.isOverdue || (currentStep?.status === 'CURRENT' && currentStep?.deadline && new Date().getTime() > new Date(currentStep.deadline).getTime()) ? (
                            <div>
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-100 text-red-800 border border-red-200 text-[9px] font-bold rounded-full animate-pulse">
                                <AlertCircle className="h-2.5 w-2.5 text-brand-red shrink-0" />
                                <span>Trễ SLA ({doc.overdueDepartment || currentStep?.department})</span>
                              </span>
                            </div>
                          ) : null}
                          {doc.steps.some(s => s.autoApprovedBySystem) ? (
                            <div>
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-100 text-purple-800 border border-purple-200 text-[9px] font-bold rounded-full">
                                <span>⚡ Tự động duyệt</span>
                              </span>
                            </div>
                          ) : null}
                        </div>
                      </td>

                      {/* Date */}
                      <td className="px-4 py-3.5 text-slate-500 font-mono text-[11px] whitespace-nowrap">
                        {formatDate(doc.createdAt)}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3.5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {doc.status === 'ADDITIONAL_REQ' && (doc.creatorId === activeUser.id || activeUser.role === 'ADMIN') ? (
                            <button
                              onClick={() => setSelectedDocument(doc)}
                              className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl transition-all shadow-xs flex items-center gap-1 cursor-pointer"
                            >
                              <RotateCcw className="h-3.5 w-3.5" />
                              <span>Bổ Sung</span>
                            </button>
                          ) : isMyTurn ? (
                            <button
                              onClick={() => setSelectedDocument(doc)}
                              className="px-3 py-1.5 bg-gradient-to-r from-brand-blue to-indigo-600 hover:from-indigo-600 hover:to-brand-blue text-white font-bold text-xs rounded-xl transition-all shadow-xs flex items-center gap-1 cursor-pointer"
                            >
                              <FileSignature className="h-3.5 w-3.5" />
                              <span>Ký Duyệt</span>
                            </button>
                          ) : (
                            <button
                              onClick={() => setSelectedDocument(doc)}
                              title="Xem chi tiết"
                              className="p-2 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50/80 rounded-xl border border-slate-200 transition-colors cursor-pointer"
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
                              className="p-2 text-slate-400 hover:text-brand-red hover:bg-red-50 rounded-xl transition-colors cursor-pointer"
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

        {/* Table / Feed Footer & Pagination */}
        <div className="px-4 sm:px-6 py-4 bg-slate-50/90 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-600">
          
          {/* Summary & Page size selector */}
          <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-start">
            <span>
              Hiển thị <strong className="text-slate-900">{totalItems === 0 ? 0 : startIndex + 1}</strong> - <strong className="text-slate-900">{endIndex}</strong> trên <strong className="text-slate-900">{totalItems}</strong> hồ sơ
            </span>
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400 hidden sm:inline">|</span>
              <span className="text-slate-500">Mỗi trang:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="bg-white border border-slate-300 text-slate-700 text-xs font-semibold rounded-lg px-2.5 py-1 focus:outline-none focus:border-brand-blue cursor-pointer shadow-2xs"
              >
                <option value={15}>15 hồ sơ</option>
                <option value={25}>25 hồ sơ</option>
                <option value={50}>50 hồ sơ</option>
                <option value={100}>100 hồ sơ</option>
              </select>
            </div>
          </div>

          {/* Pagination Navigation Controls */}
          {totalPages > 1 && (
            <div className="flex items-center gap-1.5 w-full sm:w-auto justify-center sm:justify-end">
              {/* First page */}
              <button
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
                className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-600 disabled:opacity-40 disabled:pointer-events-none transition-colors cursor-pointer"
                title="Trang đầu tiên"
              >
                <ChevronsLeft className="w-4 h-4" />
              </button>

              {/* Prev page */}
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-600 disabled:opacity-40 disabled:pointer-events-none text-xs font-medium transition-colors cursor-pointer"
                title="Trang trước"
              >
                <ChevronLeft className="w-4 h-4" />
                <span className="hidden sm:inline">Trước</span>
              </button>

              {/* Page numbers */}
              <div className="flex items-center gap-1">
                {getPageNumbers().map((page, idx) => {
                  if (page === '...') {
                    return (
                      <span key={`dots-${idx}`} className="px-2 py-1 text-slate-400 font-bold select-none">
                        ...
                      </span>
                    );
                  }
                  const isCurrent = page === currentPage;
                  return (
                    <button
                      key={`page-${page}`}
                      onClick={() => setCurrentPage(Number(page))}
                      className={`min-w-[32px] h-8 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center ${
                        isCurrent
                          ? 'bg-brand-blue text-white shadow-xs'
                          : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      {page}
                    </button>
                  );
                })}
              </div>

              {/* Next page */}
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-600 disabled:opacity-40 disabled:pointer-events-none text-xs font-medium transition-colors cursor-pointer"
                title="Trang sau"
              >
                <span className="hidden sm:inline">Sau</span>
                <ChevronRight className="w-4 h-4" />
              </button>

              {/* Last page */}
              <button
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
                className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-600 disabled:opacity-40 disabled:pointer-events-none transition-colors cursor-pointer"
                title="Trang cuối"
              >
                <ChevronsRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {totalPages <= 1 && (
            <span className="font-semibold text-indigo-700 text-xs hidden sm:inline">Trung Hải E-Approval BPM</span>
          )}

        </div>
      </div>

    </div>
  );
};
