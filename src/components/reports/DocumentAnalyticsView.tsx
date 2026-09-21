import React, { useState, useMemo } from 'react';
import { useDocument } from '../../context/DocumentContext';
import { 
  BarChart3, 
  FolderKanban, 
  Layers, 
  DollarSign, 
  FileText, 
  Calendar, 
  TrendingUp, 
  CheckCircle2, 
  Clock, 
  Building2,
  PieChart
} from 'lucide-react';
import { formatCurrency } from '../../lib/storage';

export const DocumentAnalyticsView: React.FC = () => {
  const { documents, stats } = useDocument();
  const [timeRange, setTimeRange] = useState<'ALL' | 'THIS_MONTH' | 'THIS_QUARTER'>('ALL');

  // Lọc theo khoảng thời gian
  const filteredDocs = useMemo(() => {
    if (timeRange === 'ALL') return documents;
    const now = new Date();
    return documents.filter(d => {
      const docDate = new Date(d.createdAt);
      if (timeRange === 'THIS_MONTH') {
        return docDate.getMonth() === now.getMonth() && docDate.getFullYear() === now.getFullYear();
      }
      if (timeRange === 'THIS_QUARTER') {
        const currentQuarter = Math.floor(now.getMonth() / 3);
        const docQuarter = Math.floor(docDate.getMonth() / 3);
        return currentQuarter === docQuarter && docDate.getFullYear() === now.getFullYear();
      }
      return true;
    });
  }, [documents, timeRange]);

  // 1. Tổng giá trị tài chính đề xuất
  const totalAmount = useMemo(() => {
    return filteredDocs.reduce((acc, d) => acc + (d.amount || 0), 0);
  }, [filteredDocs]);

  // 2. Thống kê theo Dự án
  const projectStats = useMemo(() => {
    const map: Record<string, { name: string; count: number; totalAmount: number }> = {};
    filteredDocs.forEach(d => {
      const pName = d.project?.trim() || 'Văn phòng / Chung';
      if (!map[pName]) {
        map[pName] = { name: pName, count: 0, totalAmount: 0 };
      }
      map[pName].count += 1;
      map[pName].totalAmount += d.amount || 0;
    });
    return Object.values(map).sort((a, b) => b.count - a.count);
  }, [filteredDocs]);

  // 3. Thống kê theo Loại hồ sơ
  const categoryStats = useMemo(() => {
    const map: Record<string, { name: string; count: number; totalAmount: number }> = {};
    filteredDocs.forEach(d => {
      const cat = d.category || 'Khác';
      if (!map[cat]) {
        map[cat] = { name: cat, count: 0, totalAmount: 0 };
      }
      map[cat].count += 1;
      map[cat].totalAmount += d.amount || 0;
    });
    return Object.values(map).sort((a, b) => b.count - a.count);
  }, [filteredDocs]);

  // 4. Thống kê theo Phòng ban khởi tạo
  const departmentCreationStats = useMemo(() => {
    const map: Record<string, number> = {};
    filteredDocs.forEach(d => {
      map[d.department] = (map[d.department] || 0) + 1;
    });
    return Object.entries(map).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);
  }, [filteredDocs]);

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-brand-blue" />
            <span>Thống Kê Hồ Sơ & Báo Cáo Phân Tích Nghiệp Vụ</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Tổng hợp dữ liệu hồ sơ phát sinh theo thời gian, theo dự án và danh mục văn bản
          </p>
        </div>

        {/* Time Filter Tabs */}
        <div className="flex items-center gap-1 bg-white p-1 rounded-[3px] border border-slate-200 shadow-2xs">
          <button
            onClick={() => setTimeRange('ALL')}
            className={`px-3 py-1 text-xs font-bold rounded-[2px] transition-colors cursor-pointer ${
              timeRange === 'ALL' ? 'bg-brand-blue text-white' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Tất cả thời gian
          </button>
          <button
            onClick={() => setTimeRange('THIS_MONTH')}
            className={`px-3 py-1 text-xs font-bold rounded-[2px] transition-colors cursor-pointer ${
              timeRange === 'THIS_MONTH' ? 'bg-brand-blue text-white' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Tháng này
          </button>
          <button
            onClick={() => setTimeRange('THIS_QUARTER')}
            className={`px-3 py-1 text-xs font-bold rounded-[2px] transition-colors cursor-pointer ${
              timeRange === 'THIS_QUARTER' ? 'bg-brand-blue text-white' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Quý này
          </button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="p-4 bg-white border border-slate-200 rounded-[4px] shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase">Tổng Hồ Sơ</span>
            <FileText className="w-4 h-4 text-brand-blue" />
          </div>
          <p className="text-2xl font-black text-slate-900 mt-1">{filteredDocs.length}</p>
          <p className="text-[10px] text-slate-500 mt-0.5">Hồ sơ đã khởi tạo</p>
        </div>

        <div className="p-4 bg-white border border-slate-200 rounded-[4px] shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase">Tổng Giá Trị (VNĐ)</span>
            <DollarSign className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-lg font-black text-emerald-700 mt-1 font-mono truncate" title={formatCurrency(totalAmount)}>
            {formatCurrency(totalAmount)}
          </p>
          <p className="text-[10px] text-slate-500 mt-0.5">Giá trị hợp đồng / đề xuất</p>
        </div>

        <div className="p-4 bg-white border border-slate-200 rounded-[4px] shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase">Dự Án / Công Trình</span>
            <FolderKanban className="w-4 h-4 text-amber-600" />
          </div>
          <p className="text-2xl font-black text-amber-900 mt-1">{projectStats.length}</p>
          <p className="text-[10px] text-slate-500 mt-0.5">Công trình đang triển khai</p>
        </div>

        <div className="p-4 bg-white border border-slate-200 rounded-[4px] shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase">Đã Phê Duyệt</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-black text-emerald-700 mt-1">
            {filteredDocs.filter(d => d.status === 'APPROVED').length}
          </p>
          <p className="text-[10px] text-emerald-700 font-medium">Hoàn tất quy trình ký số</p>
        </div>
      </div>

      {/* Grid: Thống kê theo Loại hồ sơ & Thống kê theo Dự án */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Khối 1: Cơ Cấu Theo Loại Hồ Sơ */}
        <div className="bg-white p-5 rounded-[4px] border border-slate-200 shadow-card space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-brand-blue" />
                <span>Phân Bổ Theo Loại Hồ Sơ</span>
              </h3>
              <p className="text-[11px] text-slate-500">Số lượng văn bản theo từng danh mục nghiệp vụ</p>
            </div>
            <span className="text-xs font-bold text-brand-blue">{categoryStats.length} loại</span>
          </div>

          <div className="space-y-3">
            {categoryStats.map((item) => {
              const pct = Math.round((item.count / (filteredDocs.length || 1)) * 100);
              return (
                <div key={item.name} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-800">{item.name}</span>
                    <span className="font-bold text-slate-600">
                      {item.count} hồ sơ ({pct}%)
                      {item.totalAmount > 0 && ` • ${formatCurrency(item.totalAmount)}`}
                    </span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-brand-blue rounded-full transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Khối 2: Thống Kê Theo Dự Án / Công Trình */}
        <div className="bg-white p-5 rounded-[4px] border border-slate-200 shadow-card space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                <FolderKanban className="w-4 h-4 text-amber-600" />
                <span>Thống Kê Theo Dự Án / Công Trình</span>
              </h3>
              <p className="text-[11px] text-slate-500">Mức độ phát sinh hồ sơ theo từng dự án</p>
            </div>
            <span className="text-xs font-bold text-amber-700">{projectStats.length} dự án</span>
          </div>

          <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
            {projectStats.map((item) => (
              <div key={item.name} className="p-2.5 bg-slate-50 border border-slate-200 rounded-[3px] flex items-center justify-between text-xs">
                <div>
                  <p className="font-bold text-slate-900">{item.name}</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    Giá trị: <strong className="text-emerald-700">{item.totalAmount > 0 ? formatCurrency(item.totalAmount) : 'Phi tài chính'}</strong>
                  </p>
                </div>
                <span className="px-2.5 py-1 bg-white border border-slate-300 font-bold text-slate-800 rounded text-xs">
                  {item.count} hồ sơ
                </span>
              </div>
            ))}
          </div>
        </div>

      </div>

    </div>
  );
};
