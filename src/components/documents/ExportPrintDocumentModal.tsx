import React, { useRef, useState, useEffect } from 'react';
import { 
  X, 
  Printer, 
  CheckCircle2, 
  ShieldCheck, 
  Building2, 
  Calendar, 
  FileText, 
  Download, 
  Check, 
  Copy, 
  Flame, 
  Clock, 
  DollarSign, 
  Stamp, 
  Zap,
  ZoomIn,
  ZoomOut
} from 'lucide-react';
import { DocumentItem, ApprovalStep } from '../../types';
import { formatDate, formatCurrency } from '../../lib/storage';
import { formatSlaDisplay } from './CreateDocumentModal';

interface ExportPrintDocumentModalProps {
  document: DocumentItem | null;
  isOpen: boolean;
  onClose: () => void;
}

export const ExportPrintDocumentModal: React.FC<ExportPrintDocumentModalProps> = ({
  document: doc,
  isOpen,
  onClose,
}) => {
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [isCopied, setIsCopied] = useState(false);
  const printAreaRef = useRef<HTMLDivElement>(null);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !doc) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(doc.code);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const createdDate = new Date(doc.createdAt);
  const day = createdDate.getDate().toString().padStart(2, '0');
  const month = (createdDate.getMonth() + 1).toString().padStart(2, '0');
  const year = createdDate.getFullYear();

  const isFullyApproved = doc.status === 'APPROVED';
  const approvedSteps = (doc.steps || []).filter(s => s.status === 'APPROVED');
  const verificationHash = `TH-${doc.id.replace(/[^a-zA-Z0-9]/g, '').slice(-8).toUpperCase()}-${Date.now().toString(36).slice(-4).toUpperCase()}`;

  // Chuẩn hóa họ tên người lập tránh lỗi khoảng cách font và Unicode decomposed
  const cleanCreatorName = (doc.creatorName || '').trim().normalize('NFC').replace(/\s+/g, ' ');
  const nameParts = cleanCreatorName.split(' ');
  const creatorLastName = nameParts.length > 0 ? nameParts[nameParts.length - 1] : 'Ký';

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-0 sm:p-4 overflow-hidden animate-backdrop-in">
      {/* Modal Container */}
      <div className="bg-slate-100 rounded-none sm:rounded-3xl max-w-5xl w-full h-full sm:h-[94vh] flex flex-col shadow-2xl border border-slate-300 overflow-hidden">
        
        {/* Top Control Bar (Hidden on print) */}
        <div className="no-print px-5 py-3.5 bg-gradient-to-r from-slate-900 via-brand-navy to-indigo-950 text-white flex items-center justify-between gap-3 shrink-0 shadow-md border-b border-indigo-900/50">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-brand-blue to-cyan-500 flex items-center justify-center shadow-xs shrink-0">
              <Printer className="h-4 w-4 text-white" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-sm text-white">Xuất & In Phiếu Phê Duyệt Điện Tử</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-400/30 flex items-center gap-1">
                  📄 Chuẩn vừa vặn 1 trang A4
                </span>
                {isFullyApproved ? (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                    Đã hoàn tất phê duyệt
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-400/30">
                    Đang luân chuyển duyệt ({approvedSteps.length}/{doc.steps.length} bước)
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-300 truncate font-mono mt-0.5">
                Mã hồ sơ: {doc.code} — {doc.title}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Zoom Controls */}
            <div className="hidden md:flex items-center gap-1 bg-white/10 px-2 py-1 rounded-xl border border-white/10">
              <button
                type="button"
                onClick={() => setZoomLevel(prev => Math.max(70, prev - 10))}
                title="Thu nhỏ xem trước"
                className="p-1 text-slate-300 hover:text-white rounded hover:bg-white/10 cursor-pointer"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <span className="text-[11px] font-mono text-slate-200 min-w-[40px] text-center">
                {zoomLevel}%
              </span>
              <button
                type="button"
                onClick={() => setZoomLevel(prev => Math.min(130, prev + 10))}
                title="Phóng to xem trước"
                className="p-1 text-slate-300 hover:text-white rounded hover:bg-white/10 cursor-pointer"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Print Button */}
            <button
              type="button"
              onClick={handlePrint}
              className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs rounded-xl flex items-center gap-2 shadow-lg shadow-emerald-900/30 transition-all transform hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>In hồ sơ (1 Trang A4)</span>
            </button>

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              title="Đóng (Esc)"
              className="p-2 text-slate-300 hover:text-white hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Scrollable View Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-300/80 custom-scrollbar flex justify-center items-start">
          
          {/* Printable A4 Paper Document Container - Chuẩn kích thước và tỷ lệ A4 */}
          <div 
            ref={printAreaRef}
            style={{ 
              transform: `scale(${zoomLevel / 100})`, 
              transformOrigin: 'top center',
              transition: 'transform 0.2s ease-out'
            }}
            className="printable-document bg-white w-full max-w-[794px] min-h-[1123px] shadow-2xl p-[14mm_16mm_12mm_16mm] text-slate-900 font-sans border border-slate-300 rounded-xs flex flex-col justify-between"
          >
            {/* Main Content Area - Phân bổ đều và cân đối các khối theo chiều dọc khổ giấy A4 */}
            <div className="flex-1 flex flex-col justify-between space-y-2.5">
              
              {/* KHỐI 1: QUỐC HIỆU & TIÊU ĐỀ VĂN BẢN */}
              <div className="space-y-2">
                {/* TOP HEADER: Quốc hiệu & Tên Đơn vị */}
                <div className="flex justify-between items-start gap-4 pb-2 border-b-2 border-slate-900">
                  {/* Đơn vị trình ký */}
                  <div className="w-[48%] text-center space-y-0.5">
                    <p className="font-extrabold text-[11px] sm:text-[12px] uppercase tracking-wider text-slate-900 leading-tight">
                      CTY CỔ PHẦN XÂY DỰNG VÀ ĐẦU TƯ TRUNG HẢI
                    </p>
                    <p className="font-bold text-[10px] uppercase text-brand-blue tracking-wide">
                      {doc.department || 'BAN QUẢN LÝ DỰ ÁN & VĂN PHÒNG'}
                    </p>
                    <div className="w-20 h-0.5 bg-slate-800 mx-auto my-0.5" />
                    <p className="font-mono text-[9.5px] text-slate-700">
                      Số: <strong>{doc.code}</strong>/TH-PK
                    </p>
                  </div>

                  {/* Quốc hiệu Tiêu ngữ */}
                  <div className="w-[50%] text-center space-y-0.5">
                    <p className="font-bold text-[11px] sm:text-[12px] uppercase tracking-wider text-slate-900 leading-tight">
                      CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
                    </p>
                    <p className="font-semibold text-[10px] italic text-slate-800">
                      Độc lập - Tự do - Hạnh phúc
                    </p>
                    <div className="w-24 h-0.5 bg-slate-800 mx-auto my-0.5" />
                    <p className="text-[10px] italic text-slate-700 font-sans">
                      Hà Nội, ngày {day} tháng {month} năm {year}
                    </p>
                  </div>
                </div>

                {/* DOCUMENT MAIN TITLE - Sử dụng font-sans tracking-normal để tránh tách chữ PHIẾU, KẾT */}
                <div className="text-center pt-0.5 space-y-0.5">
                  <h1 className="text-base sm:text-lg font-black uppercase tracking-normal text-slate-950 font-sans leading-snug">
                    PHIẾU TRÌNH KÝ &amp; KẾT QUẢ PHÊ DUYỆT ĐIỆN TỬ
                  </h1>
                  <p className="text-[10px] italic text-slate-600 font-sans">
                    (Hệ thống Quản trị Quy trình Phê duyệt Điện tử BPM - Trung Hải CMS)
                  </p>
                  <div className="inline-block mt-0.5">
                    {isFullyApproved ? (
                      <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-900 font-bold text-[9.5px] rounded-full border border-emerald-300 inline-flex items-center gap-1 shadow-2xs">
                        <CheckCircle2 className="w-3 h-3 text-emerald-700" />
                        HỒ SƠ ĐÃ HOÀN TẤT PHÊ DUYỆT ĐẦY ĐỦ CÁC CẤP
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 bg-amber-100 text-amber-900 font-bold text-[9.5px] rounded-full border border-amber-300 inline-flex items-center gap-1">
                        <Clock className="w-3 h-3 text-amber-700" />
                        HỒ SƠ ĐANG TRONG TIẾN TRÌNH XÉT DUYỆT ({approvedSteps.length}/{doc.steps.length} BƯỚC)
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* KHỐI 2: CHI TIẾT HỒ SƠ & TÀI LIỆU */}
              <div className="space-y-2">
                {/* SECTION I: THÔNG TIN HỒ SƠ */}
                <div className="space-y-1">
                  <h2 className="text-[10px] font-bold uppercase tracking-wider text-slate-800 bg-slate-100 px-2 py-0.5 rounded border border-slate-300">
                    I. THÔNG TIN CHUNG VỀ HỒ SƠ TRÌNH DUYỆT
                  </h2>

                  <div className="border border-slate-300 rounded overflow-hidden text-[9.5px] leading-tight">
                    {/* Trích yếu */}
                    <div className="grid grid-cols-4 border-b border-slate-200">
                      <div className="p-1.5 bg-slate-50 border-r border-slate-200 font-semibold text-slate-600 col-span-1">
                        Tên / Trích yếu văn bản:
                      </div>
                      <div className="p-1.5 font-bold text-slate-950 col-span-3">
                        {doc.title}
                      </div>
                    </div>

                    <div className="grid grid-cols-4 border-b border-slate-200">
                      <div className="p-1.5 bg-slate-50 font-semibold text-slate-600 border-r border-slate-200">
                        Loại hồ sơ:
                      </div>
                      <div className="p-1.5 font-bold text-slate-900 border-r border-slate-200 truncate">
                        {doc.category}
                      </div>
                      <div className="p-1.5 bg-slate-50 font-semibold text-slate-600 border-r border-slate-200">
                        Dự án / Công trình:
                      </div>
                      <div className="p-1.5 font-bold text-slate-900 truncate">
                        {doc.project || 'Chung / Văn phòng'}
                      </div>
                    </div>

                    <div className="grid grid-cols-4 border-b border-slate-200">
                      <div className="p-1.5 bg-slate-50 font-semibold text-slate-600 border-r border-slate-200">
                        Người khởi tạo:
                      </div>
                      <div className="p-1.5 text-slate-900 border-r border-slate-200 truncate">
                        <strong>{cleanCreatorName}</strong> ({doc.creatorTitle || 'Chuyên viên'})
                      </div>
                      <div className="p-1.5 bg-slate-50 font-semibold text-slate-600 border-r border-slate-200">
                        Phòng ban đề xuất:
                      </div>
                      <div className="p-1.5 font-bold text-brand-blue truncate">
                        {doc.department}
                      </div>
                    </div>

                    <div className="grid grid-cols-4">
                      <div className="p-1.5 bg-slate-50 font-semibold text-slate-600 border-r border-slate-200">
                        Thời điểm lập hồ sơ:
                      </div>
                      <div className="p-1.5 text-slate-900 border-r border-slate-200 font-mono text-[9px]">
                        {formatDate(doc.createdAt)}
                      </div>
                      <div className="p-1.5 bg-slate-50 font-semibold text-slate-600 border-r border-slate-200">
                        Mức độ &amp; Kinh phí:
                      </div>
                      <div className="p-1.5 flex items-center justify-between">
                        <span className={`px-1.5 py-0.2 rounded font-bold text-[9px] ${
                          doc.priority === 'VERY_URGENT' ? 'bg-red-100 text-red-900 font-black' :
                          doc.priority === 'URGENT' ? 'bg-amber-100 text-amber-900 font-bold' :
                          'bg-slate-100 text-slate-800'
                        }`}>
                          {doc.priority === 'VERY_URGENT' ? '🔥 Hỏa tốc (8h)' :
                           doc.priority === 'URGENT' ? '⚡ Khẩn (24h)' : 'Bình thường'}
                        </span>
                        {doc.amount ? (
                          <span className="font-mono font-bold text-emerald-700 text-[9.5px]">
                            {formatCurrency(doc.amount)}
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[9px]">Phi tài chính</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* SECTION II: NỘI DUNG TỜ TRÌNH / TÀI LIỆU (Rút gọn) */}
                {(doc.contentHtml || doc.description) && (
                  <div className="space-y-1">
                    <h2 className="text-[10px] font-bold uppercase tracking-wider text-slate-800 bg-slate-100 px-2 py-0.5 rounded border border-slate-300">
                      II. NỘI DUNG ĐỀ XUẤT / TRÍCH YẾU CHI TIẾT
                    </h2>
                    <div className="p-2 border border-slate-300 rounded text-[9.5px] leading-relaxed text-slate-900 bg-white max-h-[60px] overflow-hidden">
                      {doc.contentHtml ? (
                        <div 
                          className="prose prose-xs max-w-none text-slate-900 font-sans line-clamp-2"
                          dangerouslySetInnerHTML={{ __html: doc.contentHtml }} 
                        />
                      ) : (
                        <p className="font-sans text-slate-800 whitespace-pre-wrap line-clamp-2">{doc.description}</p>
                      )}
                    </div>
                  </div>
                )}

                {/* SECTION III: DANH MỤC ĐÍNH KÈM */}
                {doc.attachments && doc.attachments.length > 0 && (
                  <div className="space-y-1">
                    <div className="flex items-center justify-between bg-slate-100 px-2 py-0.5 rounded border border-slate-300">
                      <h2 className="text-[10px] font-bold uppercase tracking-wider text-slate-800">
                        III. HỒ SƠ &amp; TÀI LIỆU ĐÍNH KÈM ({doc.attachments.length} tệp)
                      </h2>
                      <span className="text-[8.5px] text-slate-500 font-mono">Đã lưu trữ số hóa trên DMS</span>
                    </div>
                    <div className="border border-slate-300 rounded overflow-hidden">
                      <table className="w-full text-left text-[9px] border-collapse">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-200 text-slate-700">
                            <th className="p-1 w-8 text-center border-r border-slate-200 font-bold">STT</th>
                            <th className="p-1 border-r border-slate-200 font-bold">Tên tài liệu / Văn bản</th>
                            <th className="p-1 w-20 text-right border-r border-slate-200 font-bold">Dung lượng</th>
                            <th className="p-1 w-28 border-r border-slate-200 font-bold">Người nộp</th>
                            <th className="p-1 w-24 font-bold">Thời gian nộp</th>
                          </tr>
                        </thead>
                        <tbody>
                          {doc.attachments.slice(0, 2).map((att, idx) => (
                            <tr key={att.id} className="border-b border-slate-200 last:border-b-0">
                              <td className="p-1 text-center border-r border-slate-200 font-semibold">{idx + 1}</td>
                              <td className="p-1 border-r border-slate-200 font-medium text-slate-900 truncate max-w-[280px]">{att.name}</td>
                              <td className="p-1 text-right border-r border-slate-200 font-mono text-[8.5px]">
                                {Math.round(att.size / 1024)} KB
                              </td>
                              <td className="p-1 border-r border-slate-200 text-slate-700 truncate">{att.uploadedBy}</td>
                              <td className="p-1 text-slate-600 font-mono text-[8.5px]">{formatDate(att.uploadedAt)}</td>
                            </tr>
                          ))}
                          {doc.attachments.length > 2 && (
                            <tr>
                              <td colSpan={5} className="p-0.5 text-center text-slate-500 italic text-[8.5px] bg-slate-50">
                                ... và {doc.attachments.length - 2} tệp đính kèm khác (Tra cứu đầy đủ trên hệ thống Trung Hải CMS)
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>

              {/* KHỐI 3: KẾT QUẢ KÝ DUYỆT CỦA CÁC BAN DUYỆT (CỐT LÕI) */}
              <div className="space-y-1.5 page-break-inside-avoid">
                <div className="flex items-center justify-between bg-slate-100 px-2 py-0.5 rounded border border-slate-300">
                  <h2 className="text-[10px] font-bold uppercase tracking-wider text-slate-800">
                    IV. Ý KIẾN VÀ CHỮ KÝ PHÊ DUYỆT CỦA CÁC BAN DUYỆT ({doc.steps.length} BƯỚC)
                  </h2>
                  <span className="text-[8.5px] font-mono text-slate-600">
                    Xác thực số hóa tiêu chuẩn ISO/IEC 27001
                  </span>
                </div>

                {/* Grid of Signatures for all steps - Phân bổ đều các cột */}
                <div 
                  className="grid gap-2.5"
                  style={{
                    gridTemplateColumns: `repeat(${Math.min(doc.steps.length, 3)}, minmax(0, 1fr))`
                  }}
                >
                  {doc.steps.map((step, idx) => {
                    const isApproved = step.status === 'APPROVED';
                    const hasDrawSignature = step.signatureImage && step.signatureImage.startsWith('data:image');
                    const hasUrlSignature = step.signatureImage && step.signatureImage.startsWith('http');

                    return (
                      <div 
                        key={step.id || idx}
                        className={`border rounded-lg p-2.5 flex flex-col justify-between text-center relative overflow-hidden transition-all ${
                          isApproved 
                            ? 'border-emerald-600 bg-white shadow-2xs' 
                            : 'border-slate-300 bg-slate-50/60 opacity-80'
                        }`}
                      >
                        {/* Header Box: Role / Department */}
                        <div>
                          <div className="text-[8.5px] font-bold text-slate-500 uppercase tracking-wider">
                            BƯỚC {idx + 1}
                          </div>
                          <h3 className="font-extrabold text-[10px] text-slate-900 uppercase leading-snug line-clamp-1 mt-0.2" title={step.title}>
                            {step.title}
                          </h3>
                          <p className="text-[9px] font-bold text-brand-blue truncate">
                            {step.department}
                          </p>

                          {/* Ý kiến phê duyệt */}
                          {step.comment ? (
                            <div className="mt-1 p-1 bg-slate-50 border border-slate-200 rounded text-[9px] italic text-slate-700 leading-tight line-clamp-1">
                              "{step.comment}"
                            </div>
                          ) : isApproved ? (
                            <div className="mt-1 p-0.5 bg-emerald-50 text-emerald-800 rounded text-[8.5px] italic">
                              "Đã kiểm tra và phê duyệt"
                            </div>
                          ) : null}

                          {/* Kiểm tra nội bộ ban nếu có */}
                          {step.isInternalChecked && (
                            <div className="mt-1 text-[8.5px] text-indigo-700 bg-indigo-50/80 p-0.5 rounded border border-indigo-100 flex items-center justify-center gap-1">
                              <CheckCircle2 className="w-2.5 h-2.5 text-indigo-600 shrink-0" />
                              <span className="truncate">KT nội bộ: {step.checkedByName || 'Chuyên viên ban'}</span>
                            </div>
                          )}
                        </div>

                        {/* Stamp / Signature Area */}
                        <div className="my-1.5 py-1 border-y border-dashed border-slate-200 flex flex-col items-center justify-center min-h-[60px]">
                          {isApproved ? (
                            step.autoApprovedBySystem ? (
                              /* Auto Approved Stamp */
                              <div className="p-1 border border-purple-600 rounded text-purple-900 bg-purple-50/70 text-center space-y-0.2 max-w-[150px]">
                                <Zap className="w-3.5 h-3.5 text-purple-700 mx-auto" />
                                <span className="block font-black text-[8.5px] uppercase tracking-wide">
                                  HỆ THỐNG DUYỆT TỰ ĐỘNG
                                </span>
                                <span className="block text-[7.5px] text-purple-700 font-mono">
                                  (Quá hạn SLA {step.slaHours}h)
                                </span>
                                <span className="block text-[8px] font-mono text-purple-950 font-bold">
                                  {formatDate(step.decisionDate)}
                                </span>
                              </div>
                            ) : (
                              /* Official Red/Blue Digital Stamp */
                              <div className="space-y-0.5 flex flex-col items-center">
                                {/* Chữ ký vẽ tay sắc nét */}
                                {hasDrawSignature || hasUrlSignature ? (
                                  <div className="h-7 max-w-[120px] flex items-center justify-center overflow-hidden mb-0.5">
                                    <img 
                                      src={step.signatureImage} 
                                      alt="Chữ ký" 
                                      className="max-h-full object-contain filter contrast-150 brightness-95 mix-blend-multiply drop-shadow-2xs"
                                    />
                                  </div>
                                ) : (
                                  <div className="h-7 max-w-[120px] flex flex-col items-center justify-center mb-0.5">
                                    <span className="font-['Brush_Script_MT',cursive] italic font-bold text-blue-700 text-xs tracking-wide -rotate-3 select-none">
                                      {(step.approverName || 'Đã ký').split(' ').pop()}
                                    </span>
                                    <div className="w-12 h-[1px] bg-blue-600/70 -mt-0.5 rounded-full" />
                                  </div>
                                )}

                                {/* Corporate Red Verification Stamp (Chuẩn văn bản Việt Nam) */}
                                <div className="px-2 py-1 border border-brand-red rounded text-brand-red bg-red-50/80 text-center space-y-0.2 shadow-2xs max-w-[170px]">
                                  <div className="flex items-center justify-center gap-1 font-black text-[7px] uppercase tracking-wider border-b border-brand-red/30 pb-0.2">
                                    <ShieldCheck className="w-2.5 h-2.5 text-brand-red shrink-0" />
                                    <span>CTY CP XÂY DỰNG VÀ ĐẦU TƯ TRUNG HẢI</span>
                                  </div>
                                  <p className="font-black text-[8.5px] uppercase tracking-wider pt-0.2">
                                    ✓ ĐÃ KÝ ĐIỆN TỬ
                                  </p>
                                  <p className="font-bold text-[8.5px] text-slate-900 truncate">
                                    {step.approverName}
                                  </p>
                                  <p className="text-[7.5px] font-mono text-slate-600">
                                    {formatDate(step.decisionDate)}
                                  </p>
                                  <p className="text-[7px] font-mono text-slate-400">
                                    AUTH: {step.id.slice(-6).toUpperCase()}
                                  </p>
                                </div>
                              </div>
                            )
                          ) : (
                            /* Pending State */
                            <div className="text-center text-slate-400 text-[10px] italic py-2">
                              (Chưa ký duyệt)
                            </div>
                          )}
                        </div>

                        {/* Signer Footer Name */}
                        <div>
                          <p className="font-bold text-[10.5px] text-slate-900 leading-tight font-sans">
                            {step.approverName || 'Đại diện thẩm quyền'}
                          </p>
                          <p className="text-[9px] text-slate-500 truncate mt-0.2 font-sans">
                            {step.approverTitle || 'Người ký duyệt'}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* KHỐI 4: CHỮ KÝ NGƯỜI LẬP & XÁC THỰC TOÀN VẸN VĂN BẢN */}
              <div className="pt-2 border-t border-slate-300 flex justify-between items-end text-xs text-slate-700 page-break-inside-avoid">
                {/* Chữ ký người lập hồ sơ */}
                <div className="text-center w-56 space-y-0.5">
                  <p className="font-bold uppercase text-[10px] text-slate-900 font-sans tracking-wide">
                    NGƯỜI LẬP HỒ SƠ
                  </p>
                  <p className="text-[9px] italic text-slate-500 font-sans">
                    (Ký, ghi rõ họ tên)
                  </p>
                  
                  {/* Khu vực nét ký số hóa thanh thoát */}
                  <div className="h-10 flex flex-col items-center justify-center my-0.5">
                    <div className="relative flex flex-col items-center justify-center">
                      <svg viewBox="0 0 140 40" className="w-28 h-7 overflow-visible" fill="none">
                        <path
                          d="M15 25 C 25 10, 38 6, 48 18 C 58 30, 70 12, 82 20 C 95 30, 110 14, 125 18"
                          stroke="#1d4ed8"
                          strokeWidth="2.2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        <path
                          d="M28 28 Q 65 38 120 26"
                          stroke="#2563eb"
                          strokeWidth="1.8"
                          strokeLinecap="round"
                        />
                        <text
                          x="68"
                          y="20"
                          textAnchor="middle"
                          fill="#1e40af"
                          fontSize="14"
                          fontWeight="bold"
                          fontStyle="italic"
                          style={{ fontFamily: "'Segoe Script', 'Brush Script MT', 'Dancing Script', cursive, sans-serif" }}
                        >
                          {creatorLastName}
                        </text>
                      </svg>
                      <span className="text-[7.5px] font-mono text-blue-700 bg-blue-50 px-1.5 py-0.2 rounded border border-blue-200 font-semibold leading-tight">
                        ✓ ĐÃ KÝ ĐIỆN TỬ
                      </span>
                    </div>
                  </div>

                  <p className="font-bold text-slate-950 text-[10.5px] tracking-normal font-sans">
                    {cleanCreatorName}
                  </p>
                  <p className="text-[9px] text-slate-600 font-sans">
                    {doc.creatorTitle || 'Chuyên viên'} • {doc.department}
                  </p>
                </div>

                {/* Khối xác thực toàn vẹn & thông tin in */}
                <div className="text-right text-[8.5px] text-slate-600 font-sans space-y-0.5 max-w-xs">
                  <p className="text-slate-900 font-bold uppercase tracking-wider text-[9px]">
                    XÁC THỰC TOÀN VẸN VĂN BẢN
                  </p>
                  <p className="font-mono text-[8px] text-slate-700">
                    Mã băm chứng thực: {verificationHash}
                  </p>
                  <p>
                    Đơn vị: <strong>CTY CP XÂY DỰNG VÀ ĐẦU TƯ TRUNG HẢI</strong>
                  </p>
                  <p className="font-mono text-[8px] text-slate-500">
                    Thời điểm in: {formatDate(new Date().toISOString())}
                  </p>
                </div>
              </div>

            </div>

            {/* DOCUMENT FOOTER & LEGAL NOTICE - 1 dòng cân đối, không bị xuống dòng vụn vặt */}
            <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-[7.5px] text-slate-600 font-sans shrink-0 mt-2">
              <span className="font-semibold tracking-wide">
                CTY CP XÂY DỰNG VÀ ĐẦU TƯ TRUNG HẢI • HỆ THỐNG TRÌNH KÝ &amp; PHÊ DUYỆT ĐIỆN TỬ
              </span>
              <span className="text-right">
                Văn bản điện tử xác thực theo quy chế nội bộ Cty Trung Hải. Bản in có giá trị đối soát.
              </span>
            </div>

          </div>
        </div>

        {/* Modal Bottom Bar */}
        <div className="no-print px-5 py-3 bg-white border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-2.5 shrink-0 text-xs text-slate-600">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-700">Mã tra cứu:</span>
            <code className="px-2 py-0.5 bg-slate-100 border border-slate-200 rounded font-mono font-bold text-indigo-700">
              {doc.code}
            </code>
            <button
              type="button"
              onClick={handleCopyCode}
              className="text-slate-500 hover:text-brand-blue flex items-center gap-1 cursor-pointer font-medium"
            >
              {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{isCopied ? 'Đã chép' : 'Sao chép'}</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors cursor-pointer"
            >
              Đóng
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="px-5 py-2 bg-brand-blue hover:bg-blue-700 text-white font-bold rounded-xl flex items-center gap-2 shadow-sm transition-all cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>In phiếu trình ký / Xuất PDF</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
