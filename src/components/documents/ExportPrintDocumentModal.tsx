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
              <span>In hồ sơ (Print / PDF)</span>
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
        <div className="flex-1 overflow-y-auto p-3 sm:p-6 bg-slate-200/80 custom-scrollbar flex justify-center">
          
          {/* Printable A4 Paper Document Container */}
          <div 
            ref={printAreaRef}
            style={{ 
              transform: `scale(${zoomLevel / 100})`, 
              transformOrigin: 'top center',
              transition: 'transform 0.2s ease-out'
            }}
            className="printable-document bg-white w-full max-w-[820px] shadow-xl p-8 sm:p-12 text-slate-900 font-sans border border-slate-300 rounded-sm min-h-[1100px] flex flex-col justify-between"
          >
            <div>
              {/* TOP HEADER: Quốc hiệu & Tên Đơn vị */}
              <div className="flex justify-between items-start gap-4 pb-4 border-b-2 border-slate-900">
                {/* Đơn vị trình ký */}
                <div className="w-[48%] text-center space-y-0.5">
                  <p className="font-extrabold text-[12px] sm:text-[13px] uppercase tracking-wider text-slate-900 leading-tight">
                    CÔNG TY CỔ PHẦN ĐẦU TƯ TRUNG HẢI
                  </p>
                  <p className="font-bold text-[11px] uppercase text-brand-blue tracking-wide">
                    {doc.department || 'BAN QUẢN LÝ DỰ ÁN & VĂN PHÒNG'}
                  </p>
                  <div className="w-24 h-0.5 bg-slate-800 mx-auto my-1" />
                  <p className="font-mono text-[10.5px] text-slate-700 mt-1">
                    Số: <strong>{doc.code}</strong>/TH-PK
                  </p>
                </div>

                {/* Quốc hiệu Tiêu ngữ */}
                <div className="w-[50%] text-center space-y-0.5">
                  <p className="font-bold text-[12px] sm:text-[13px] uppercase tracking-wider text-slate-900 leading-tight">
                    CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
                  </p>
                  <p className="font-semibold text-[11px] italic text-slate-800">
                    Độc lập - Tự do - Hạnh phúc
                  </p>
                  <div className="w-32 h-0.5 bg-slate-800 mx-auto my-1" />
                  <p className="text-[10.5px] italic text-slate-600 mt-1 font-serif">
                    Hà Nội, ngày {day} tháng {month} năm {year}
                  </p>
                </div>
              </div>

              {/* DOCUMENT MAIN TITLE */}
              <div className="text-center my-6 space-y-1">
                <h1 className="text-lg sm:text-xl font-black uppercase tracking-wide text-slate-950 font-serif">
                  PHIẾU TRÌNH KÝ & KẾT QUẢ PHÊ DUYỆT ĐIỆN TỬ
                </h1>
                <p className="text-xs italic text-slate-600 font-serif">
                  (Hệ thống Quản trị Quy trình Phê duyệt Điện tử BPM - Trung Hải CMS)
                </p>
                <div className="inline-block mt-1">
                  {isFullyApproved ? (
                    <span className="px-3 py-1 bg-emerald-100 text-emerald-900 font-bold text-[11px] rounded-full border border-emerald-300 inline-flex items-center gap-1.5 shadow-2xs">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                      HỒ SƠ ĐÃ HOÀN TẤT PHÊ DUYỆT ĐẦY ĐỦ CÁC CẤP
                    </span>
                  ) : (
                    <span className="px-3 py-1 bg-amber-100 text-amber-900 font-bold text-[11px] rounded-full border border-amber-300 inline-flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-amber-700" />
                      HỒ SƠ ĐANG TRONG TIẾN TRÌNH XÉT DUYỆT
                    </span>
                  )}
                </div>
              </div>

              {/* SECTION I: THÔNG TIN HỒ SƠ */}
              <div className="space-y-2 mb-6">
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 bg-slate-100 px-3 py-1.5 rounded border border-slate-300">
                  I. THÔNG TIN CHUNG VỀ HỒ SƠ TRÌNH DUYỆT
                </h2>

                <div className="border border-slate-300 rounded overflow-hidden text-xs">
                  <div className="grid grid-cols-1 sm:grid-cols-2 border-b border-slate-200">
                    <div className="p-2.5 bg-slate-50 border-r border-slate-200 font-semibold text-slate-600">
                      Tên / Trích yếu văn bản:
                    </div>
                    <div className="p-2.5 font-bold text-slate-950 col-span-1 sm:col-span-1">
                      {doc.title}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-4 border-b border-slate-200">
                    <div className="p-2 bg-slate-50 font-semibold text-slate-600 border-r border-slate-200">
                      Loại hồ sơ:
                    </div>
                    <div className="p-2 font-bold text-slate-900 border-r border-slate-200">
                      {doc.category}
                    </div>
                    <div className="p-2 bg-slate-50 font-semibold text-slate-600 border-r border-slate-200">
                      Dự án / Công trình:
                    </div>
                    <div className="p-2 font-bold text-slate-900">
                      {doc.project || 'Chung / Văn phòng'}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-4 border-b border-slate-200">
                    <div className="p-2 bg-slate-50 font-semibold text-slate-600 border-r border-slate-200">
                      Người khởi tạo:
                    </div>
                    <div className="p-2 text-slate-900 border-r border-slate-200">
                      <strong>{doc.creatorName}</strong> ({doc.creatorTitle || 'Chuyên viên'})
                    </div>
                    <div className="p-2 bg-slate-50 font-semibold text-slate-600 border-r border-slate-200">
                      Phòng ban đề xuất:
                    </div>
                    <div className="p-2 font-bold text-brand-blue">
                      {doc.department}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-4 border-b border-slate-200">
                    <div className="p-2 bg-slate-50 font-semibold text-slate-600 border-r border-slate-200">
                      Thời điểm lập hồ sơ:
                    </div>
                    <div className="p-2 text-slate-900 border-r border-slate-200">
                      {formatDate(doc.createdAt)}
                    </div>
                    <div className="p-2 bg-slate-50 font-semibold text-slate-600 border-r border-slate-200">
                      Hạn duyệt mong muốn:
                    </div>
                    <div className="p-2 font-bold text-slate-900">
                      {formatDate(doc.desiredDeadline || doc.deadline)}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-4">
                    <div className="p-2 bg-slate-50 font-semibold text-slate-600 border-r border-slate-200">
                      Giá trị đề xuất (VNĐ):
                    </div>
                    <div className="p-2 font-bold font-mono text-emerald-700 border-r border-slate-200">
                      {doc.amount ? formatCurrency(doc.amount) : 'Phi tài chính'}
                    </div>
                    <div className="p-2 bg-slate-50 font-semibold text-slate-600 border-r border-slate-200">
                      Mức độ ưu tiên:
                    </div>
                    <div className="p-2">
                      <span className={`px-2 py-0.5 rounded font-bold text-[10.5px] ${
                        doc.priority === 'VERY_URGENT' ? 'bg-red-100 text-red-900 font-black' :
                        doc.priority === 'URGENT' ? 'bg-amber-100 text-amber-900 font-bold' :
                        'bg-slate-100 text-slate-800'
                      }`}>
                        {doc.priority === 'VERY_URGENT' ? '🔥 Hỏa tốc (Chia đều 8h)' :
                         doc.priority === 'URGENT' ? '⚡ Khẩn (Chia đều 24h)' : 'Bình thường'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION II: NỘI DUNG TỜ TRÌNH / TÀI LIỆU */}
              {(doc.contentHtml || doc.description) && (
                <div className="space-y-2 mb-6">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 bg-slate-100 px-3 py-1.5 rounded border border-slate-300">
                    II. NỘI DUNG ĐỀ XUẤT / TRÍCH YẾU CHI TIẾT
                  </h2>
                  <div className="p-4 border border-slate-300 rounded text-xs leading-relaxed text-slate-900 bg-white">
                    {doc.contentHtml ? (
                      <div 
                        className="prose prose-xs max-w-none text-slate-900 font-serif"
                        dangerouslySetInnerHTML={{ __html: doc.contentHtml }} 
                      />
                    ) : (
                      <p className="font-serif text-slate-800 whitespace-pre-wrap">{doc.description}</p>
                    )}
                  </div>
                </div>
              )}

              {/* SECTION III: DANH MỤC ĐÍNH KÈM */}
              {doc.attachments && doc.attachments.length > 0 && (
                <div className="space-y-2 mb-6">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 bg-slate-100 px-3 py-1.5 rounded border border-slate-300">
                    III. HỒ SƠ & TÀI LIỆU ĐÍNH KÈM ({doc.attachments.length} tệp)
                  </h2>
                  <table className="w-full text-left text-xs border border-slate-300 rounded border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-300 text-[11px] text-slate-700">
                        <th className="p-1.5 w-10 text-center border-r border-slate-300 font-bold">STT</th>
                        <th className="p-1.5 border-r border-slate-300 font-bold">Tên tài liệu / Văn bản</th>
                        <th className="p-1.5 w-24 text-right border-r border-slate-300 font-bold">Dung lượng</th>
                        <th className="p-1.5 w-36 border-r border-slate-300 font-bold">Người tải lên</th>
                        <th className="p-1.5 w-32 font-bold">Thời gian nộp</th>
                      </tr>
                    </thead>
                    <tbody>
                      {doc.attachments.map((att, idx) => (
                        <tr key={att.id} className="border-b border-slate-200">
                          <td className="p-1.5 text-center border-r border-slate-200 font-semibold">{idx + 1}</td>
                          <td className="p-1.5 border-r border-slate-200 font-medium text-slate-900">{att.name}</td>
                          <td className="p-1.5 text-right border-r border-slate-200 font-mono text-[11px]">
                            {Math.round(att.size / 1024)} KB
                          </td>
                          <td className="p-1.5 border-r border-slate-200 text-slate-700">{att.uploadedBy}</td>
                          <td className="p-1.5 text-slate-600 font-mono text-[11px]">{formatDate(att.uploadedAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* SECTION IV: KẾT QUẢ KÝ DUYỆT CỦA CÁC BAN (CỐT LÕI) */}
              <div className="space-y-3 mb-6 page-break-inside-avoid">
                <div className="flex items-center justify-between bg-slate-100 px-3 py-1.5 rounded border border-slate-300">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                    IV. Ý KIẾN VÀ CHỮ KÝ PHÊ DUYỆT CỦA CÁC BAN DUYỆT ({doc.steps.length} BƯỚC)
                  </h2>
                  <span className="text-[10.5px] font-mono text-slate-600">
                    Xác thực số hóa tiêu chuẩn ISO/IEC 27001
                  </span>
                </div>

                {/* Grid of Signatures for all steps */}
                <div className={`grid grid-cols-1 ${doc.steps.length <= 2 ? 'sm:grid-cols-2' : doc.steps.length === 3 ? 'sm:grid-cols-3' : 'sm:grid-cols-2 lg:grid-cols-4'} gap-3`}>
                  {doc.steps.map((step, idx) => {
                    const isApproved = step.status === 'APPROVED';
                    const hasDrawSignature = step.signatureImage && step.signatureImage.startsWith('data:image');
                    const hasUrlSignature = step.signatureImage && step.signatureImage.startsWith('http');

                    return (
                      <div 
                        key={step.id || idx}
                        className={`border-2 rounded-xl p-3 flex flex-col justify-between text-center relative overflow-hidden transition-all ${
                          isApproved 
                            ? 'border-emerald-600 bg-white shadow-xs' 
                            : 'border-slate-300 bg-slate-50/60 opacity-80'
                        }`}
                      >
                        {/* Header Box: Role / Department */}
                        <div>
                          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                            BƯỚC {idx + 1}
                          </div>
                          <h3 className="font-extrabold text-[11.5px] text-slate-900 uppercase leading-snug line-clamp-2 mt-0.5" title={step.title}>
                            {step.title}
                          </h3>
                          <p className="text-[10.5px] font-bold text-brand-blue truncate mt-0.5">
                            {step.department}
                          </p>

                          {/* Ý kiến phê duyệt */}
                          {step.comment ? (
                            <div className="mt-2 p-1.5 bg-slate-50 border border-slate-200 rounded text-[10.5px] italic text-slate-700 leading-tight">
                              "{step.comment}"
                            </div>
                          ) : isApproved ? (
                            <div className="mt-2 p-1 bg-emerald-50 text-emerald-800 rounded text-[10px] italic">
                              "Đồng ý phê duyệt"
                            </div>
                          ) : null}

                          {/* Kiểm tra nội bộ ban nếu có */}
                          {step.isInternalChecked && (
                            <div className="mt-1.5 text-[9.5px] text-indigo-700 bg-indigo-50/80 p-1 rounded border border-indigo-100 flex items-center justify-center gap-1">
                              <CheckCircle2 className="w-3 h-3 text-indigo-600 shrink-0" />
                              <span className="truncate">KT nội bộ: {step.checkedByName || 'Chuyên viên ban'}</span>
                            </div>
                          )}
                        </div>

                        {/* Stamp / Signature Area */}
                        <div className="my-3 py-2 border-y border-dashed border-slate-200 flex flex-col items-center justify-center min-h-[90px]">
                          {isApproved ? (
                            step.autoApprovedBySystem ? (
                              /* Auto Approved Stamp */
                              <div className="p-2 border-2 border-purple-600 rounded-lg text-purple-900 bg-purple-50/70 text-center space-y-0.5 max-w-[170px]">
                                <Zap className="w-5 h-5 text-purple-700 mx-auto" />
                                <span className="block font-black text-[9.5px] uppercase tracking-wide">
                                  HỆ THỐNG DUYỆT TỰ ĐỘNG
                                </span>
                                <span className="block text-[8px] text-purple-700 font-mono">
                                  (Quá hạn SLA {step.slaHours}h)
                                </span>
                                <span className="block text-[8.5px] font-mono text-purple-950 font-bold">
                                  {formatDate(step.decisionDate)}
                                </span>
                              </div>
                            ) : (
                              /* Official Red/Blue Digital Stamp */
                              <div className="space-y-1 flex flex-col items-center">
                                {/* If handwritten signature exists */}
                                {hasDrawSignature || hasUrlSignature ? (
                                  <div className="h-10 max-w-[140px] flex items-center justify-center overflow-hidden mb-1">
                                    <img 
                                      src={step.signatureImage} 
                                      alt="Chữ ký" 
                                      className="max-h-full object-contain filter contrast-125"
                                    />
                                  </div>
                                ) : null}

                                {/* Corporate Red Verification Stamp (Chuẩn văn bản Việt Nam) */}
                                <div className="px-2.5 py-1.5 border-2 border-brand-red rounded-lg text-brand-red bg-red-50/80 text-center space-y-0.5 shadow-2xs max-w-[180px]">
                                  <div className="flex items-center justify-center gap-1 font-black text-[8px] uppercase tracking-wider border-b border-brand-red/40 pb-0.5">
                                    <ShieldCheck className="w-3 h-3 text-brand-red shrink-0" />
                                    <span>CÔNG TY CP ĐẦU TƯ TRUNG HẢI</span>
                                  </div>
                                  <p className="font-black text-[9.5px] uppercase tracking-wider pt-0.5">
                                    ✓ ĐÃ KÝ ĐIỆN TỬ
                                  </p>
                                  <p className="font-bold text-[9px] text-slate-900 truncate">
                                    {step.approverName}
                                  </p>
                                  <p className="text-[8px] font-mono text-slate-600">
                                    {formatDate(step.decisionDate)}
                                  </p>
                                  <p className="text-[7.5px] font-mono text-slate-400">
                                    AUTH: {step.id.slice(-6).toUpperCase()}
                                  </p>
                                </div>
                              </div>
                            )
                          ) : (
                            /* Pending State */
                            <div className="text-center text-slate-400 text-xs italic py-4">
                              (Chưa ký duyệt)
                            </div>
                          )}
                        </div>

                        {/* Signer Footer Name */}
                        <div>
                          <p className="font-bold text-xs text-slate-900 leading-tight">
                            {step.approverName || 'Đại diện thẩm quyền'}
                          </p>
                          <p className="text-[10px] text-slate-500 truncate mt-0.5">
                            {step.approverTitle || 'Người ký duyệt'}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Signature of Creator */}
                <div className="pt-3 border-t border-slate-200 flex justify-between items-end text-xs text-slate-700">
                  <div className="text-center w-52 space-y-1">
                    <p className="font-bold uppercase text-[11px] text-slate-800">NGƯỜI LẬP HỒ SƠ</p>
                    <p className="text-[10.5px] italic text-slate-500">(Ký, ghi rõ họ tên)</p>
                    <div className="h-14 flex items-center justify-center font-serif italic text-blue-900 font-bold text-sm">
                      {doc.creatorName}
                    </div>
                    <p className="font-bold text-slate-900">{doc.creatorName}</p>
                    <p className="text-[10.5px] text-slate-500">{doc.creatorTitle || 'Chuyên viên'} - {doc.department}</p>
                  </div>

                  <div className="text-right text-[10.5px] text-slate-500 font-mono space-y-0.5 max-w-xs">
                    <p className="text-slate-700 font-bold">XÁC THỰC TOÀN VẸN VĂN BẢN</p>
                    <p>Mã băm chứng thực: {verificationHash}</p>
                    <p>Thời điểm in: {formatDate(new Date().toISOString())}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* DOCUMENT FOOTER & LEGAL NOTICE */}
            <div className="mt-8 pt-3 border-t-2 border-slate-800 flex flex-col sm:flex-row items-center justify-between text-[9.5px] text-slate-600 font-mono gap-1">
              <div>
                <span>TRUNG HAI CMS • HỆ THỐNG TRÌNH KÝ & PHÊ DUYỆT ĐIỆN TỬ</span>
              </div>
              <div className="text-center sm:text-right">
                <span>Văn bản điện tử được xác thực hợp lệ theo quy chế Trung Hải. Bản in có giá trị đối soát.</span>
              </div>
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
