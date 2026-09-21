import React, { useState } from 'react';
import { useDocument } from '../../context/DocumentContext';
import { 
  Archive, 
  FileText, 
  Download, 
  Eye, 
  HardDrive, 
  Search, 
  Filter, 
  ShieldCheck, 
  FileSpreadsheet, 
  FileCode,
  FolderOpen,
  Calendar,
  X
} from 'lucide-react';
import { formatDate } from '../../lib/storage';
import { PDFViewerModal } from '../common/PDFViewerModal';
import { Attachment } from '../../types';

export const DMSStorageView: React.FC = () => {
  const { documents, setSelectedDocument } = useDocument();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterScanOnly, setFilterScanOnly] = useState(false);
  const [selectedPreview, setSelectedPreview] = useState<(Attachment & { documentCode: string; documentTitle: string; documentStatus?: string }) | null>(null);

  // Tập hợp tất cả các file đính kèm từ tất cả các hồ sơ
  const allAttachments = documents.flatMap(doc => 
    doc.attachments.map(att => ({
      ...att,
      documentCode: doc.code,
      documentTitle: doc.title,
      documentStatus: doc.status,
      document: doc,
    }))
  );

  const filteredAttachments = allAttachments.filter(item => {
    if (filterScanOnly && !item.isScan) return false;
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      return (
        item.name.toLowerCase().includes(q) ||
        item.documentCode.toLowerCase().includes(q) ||
        item.documentTitle.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const totalBytes = allAttachments.reduce((sum, a) => sum + a.size, 0);
  const totalMB = (totalBytes / (1024 * 1024)).toFixed(2);
  const scanFilesCount = allAttachments.filter(a => a.isScan).length;

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Archive className="h-5 w-5 text-brand-blue" />
            <span>Kho Lưu Trữ Hồ Sơ Scan & Tài Liệu Điện Tử (DMS)</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Quản lý tập trung toàn bộ bản scan hợp đồng có dấu đỏ, bảng báo giá, phụ lục và biên bản nghiệm thu
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-semibold px-3 py-1.5 bg-white border border-slate-200 rounded-[3px] shadow-sm">
          <HardDrive className="h-4 w-4 text-emerald-600" />
          <span>Dung lượng lưu trữ DMS: <strong className="text-brand-blue">{totalMB} MB</strong></span>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-[3px] border border-slate-200 shadow-card flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase">Tổng Tài Liệu DMS</p>
            <p className="text-2xl font-black text-slate-800 mt-1">{allAttachments.length}</p>
            <p className="text-[10px] text-slate-400 mt-0.5">Bao gồm PDF, Docx, Excel, Scan</p>
          </div>
          <div className="p-3 bg-brand-blue-light text-brand-blue rounded-[3px]">
            <FolderOpen className="h-6 w-6" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-[3px] border border-slate-200 shadow-card flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase">Bản Scan Dấu Đỏ</p>
            <p className="text-2xl font-black text-brand-red mt-1">{scanFilesCount}</p>
            <p className="text-[10px] text-slate-400 mt-0.5">Đã được số hóa & đóng dấu</p>
          </div>
          <div className="p-3 bg-brand-red-light text-brand-red rounded-[3px]">
            <ShieldCheck className="h-6 w-6" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-[3px] border border-slate-200 shadow-card flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase">Hạ Tầng Lưu Trữ</p>
            <p className="text-base font-black text-emerald-700 mt-1">Lưu Trữ Tập Trung</p>
            <p className="text-[10px] text-slate-400 mt-0.5">Tự động sao lưu & mã hóa bảo mật</p>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-[3px]">
            <HardDrive className="h-6 w-6" />
          </div>
        </div>
      </div>

      {/* Search & Filter bar */}
      <div className="bg-white p-4 rounded-[3px] border border-slate-200 shadow-card flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Tìm theo tên file, mã hồ sơ, hợp đồng..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-[3px] focus:bg-white focus:outline-none focus:ring-1 focus:ring-brand-blue"
          />
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={filterScanOnly}
              onChange={(e) => setFilterScanOnly(e.target.checked)}
              className="rounded-[3px] text-brand-blue focus:ring-brand-blue h-4 w-4"
            />
            <span>Chỉ hiển thị bản scan</span>
          </label>
        </div>
      </div>

      {/* Attachments Table */}
      <div className="bg-white rounded-[3px] border border-slate-200 shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 uppercase text-[10px] tracking-wider">
              <tr>
                <th className="px-4 py-3.5">Tên Tài Liệu / File Scan</th>
                <th className="px-4 py-3.5">Thuộc Hồ Sơ Gốc</th>
                <th className="px-4 py-3.5">Dung Lượng</th>
                <th className="px-4 py-3.5">Người Tải Lên</th>
                <th className="px-4 py-3.5">Ngày Lưu Trữ</th>
                <th className="px-4 py-3.5 text-right">Thao Tác</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {filteredAttachments.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-slate-400">
                    Không tìm thấy tài liệu nào trong kho DMS
                  </td>
                </tr>
              ) : (
                filteredAttachments.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 min-w-[220px]">
                      <div className="flex items-center gap-2.5">
                        <FileText className="h-4 w-4 text-brand-blue shrink-0" />
                        <div>
                          <p className="font-bold text-slate-800 line-clamp-1">{item.name}</p>
                          {item.isScan && (
                            <span className="inline-block px-1.5 py-0.2 bg-brand-red/10 text-brand-red text-[9px] font-bold rounded-[3px] mt-0.5">
                              Bản scan có dấu
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-3">
                      <span 
                        onClick={() => setSelectedDocument(item.document)}
                        className="font-mono font-bold text-brand-blue hover:underline cursor-pointer"
                      >
                        {item.documentCode}
                      </span>
                      <p className="text-[11px] text-slate-500 line-clamp-1 max-w-xs">{item.documentTitle}</p>
                    </td>

                    <td className="px-4 py-3 font-mono text-slate-700">
                      {(item.size / 1024).toFixed(1)} KB
                    </td>

                    <td className="px-4 py-3 text-slate-800 font-medium">
                      {item.uploadedBy}
                    </td>

                    <td className="px-4 py-3 text-slate-500 font-mono text-[11px]">
                      {formatDate(item.uploadedAt)}
                    </td>

                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setSelectedPreview(item)}
                          title="Xem trước tài liệu"
                          className="p-1.5 text-slate-500 hover:text-brand-blue hover:bg-slate-100 rounded-[3px] transition-colors"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => {
                            if (item.url && item.url !== '#') {
                              const a = document.createElement('a');
                              a.href = item.url;
                              a.download = item.name;
                              document.body.appendChild(a);
                              a.click();
                              document.body.removeChild(a);
                            } else {
                              alert(`Đang tải tệp: ${item.name}`);
                            }
                          }}
                          title="Tải về"
                          className="p-1.5 text-slate-500 hover:text-brand-blue hover:bg-slate-100 rounded-[3px] transition-colors"
                        >
                          <Download className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* PDF & Document Viewer Modal */}
      {selectedPreview && (
        <PDFViewerModal
          attachment={selectedPreview}
          documentCode={selectedPreview.documentCode}
          documentTitle={selectedPreview.documentTitle}
          onClose={() => setSelectedPreview(null)}
        />
      )}

    </div>
  );
};
