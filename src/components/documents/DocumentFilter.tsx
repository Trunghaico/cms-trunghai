import React from 'react';
import { Filter, Search, RotateCcw } from 'lucide-react';
import { DocumentPriority, DocumentStatus } from '../../types';

interface DocumentFilterProps {
  statusFilter: string;
  setStatusFilter: (s: string) => void;
  priorityFilter: string;
  setPriorityFilter: (p: string) => void;
  categoryFilter: string;
  setCategoryFilter: (c: string) => void;
  departmentFilter: string;
  setDepartmentFilter: (d: string) => void;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  categories: string[];
  departments: string[];
  onReset: () => void;
}

export const DocumentFilter: React.FC<DocumentFilterProps> = ({
  statusFilter,
  setStatusFilter,
  priorityFilter,
  setPriorityFilter,
  categoryFilter,
  setCategoryFilter,
  departmentFilter,
  setDepartmentFilter,
  searchTerm,
  setSearchTerm,
  categories,
  departments,
  onReset,
}) => {
  return (
    <div className="bg-white/90 backdrop-blur-md p-4 rounded-2xl border border-slate-200/90 shadow-card space-y-3">
      <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
        
        {/* Search input in filter */}
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Tìm theo số hiệu, trích yếu..."
            className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50/80 hover:bg-slate-100/80 focus:bg-white border border-slate-200/90 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-2xs"
          />
        </div>

        {/* Filter Controls Grid */}
        <div className="flex flex-wrap gap-2 w-full md:w-auto items-center">
          
          {/* Status Select */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 text-xs bg-slate-50/80 hover:bg-slate-100/80 focus:bg-white border border-slate-200/90 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-medium transition-all cursor-pointer shadow-2xs"
          >
            <option value="ALL">Tất cả trạng thái</option>
            <option value="PENDING">Chờ duyệt (Mới)</option>
            <option value="IN_PROGRESS">Đang xử lý luân chuyển</option>
            <option value="APPROVED">Đã phê duyệt & Đóng dấu</option>
            <option value="ADDITIONAL_REQ">Yêu cầu bổ sung</option>
            <option value="REJECTED">Bị từ chối</option>
          </select>

          {/* Priority Select */}
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="px-3 py-2 text-xs bg-slate-50/80 hover:bg-slate-100/80 focus:bg-white border border-slate-200/90 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-medium transition-all cursor-pointer shadow-2xs"
          >
            <option value="ALL">Tất cả độ khẩn</option>
            <option value="VERY_URGENT">Hỏa tốc</option>
            <option value="URGENT">Khẩn</option>
            <option value="NORMAL">Bình thường</option>
          </select>

          {/* Category Select */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 text-xs bg-slate-50/80 hover:bg-slate-100/80 focus:bg-white border border-slate-200/90 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-medium transition-all cursor-pointer shadow-2xs"
          >
            <option value="ALL">Tất cả loại hồ sơ</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>

          {/* Department Select */}
          <select
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
            className="px-3 py-2 text-xs bg-slate-50/80 hover:bg-slate-100/80 focus:bg-white border border-slate-200/90 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-medium transition-all cursor-pointer shadow-2xs"
          >
            <option value="ALL">Tất cả phòng ban</option>
            {departments.map((dept) => (
              <option key={dept} value={dept}>{dept}</option>
            ))}
          </select>

          {/* Reset Button */}
          <button
            onClick={onReset}
            className="px-3 py-2 text-xs font-semibold text-slate-600 hover:text-indigo-600 bg-slate-100 hover:bg-indigo-50/80 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
            title="Đặt lại toàn bộ bộ lọc"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Đặt lại</span>
          </button>

        </div>
      </div>
    </div>
  );
};
