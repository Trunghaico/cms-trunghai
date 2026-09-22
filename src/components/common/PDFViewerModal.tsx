import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  X, 
  ZoomIn, 
  ZoomOut, 
  RotateCw, 
  Download, 
  Printer, 
  Maximize2, 
  Minimize2, 
  ChevronLeft, 
  ChevronRight, 
  FileText, 
  ShieldCheck,
  ExternalLink,
  CheckCircle2
} from 'lucide-react';
import { Attachment } from '../../types';
import { getSecureFileUrl } from '../../lib/nasStorageService';

interface PDFViewerModalProps {
  attachment: Attachment | (Attachment & { documentCode?: string; documentTitle?: string; documentStatus?: string }) | null;
  documentTitle?: string;
  documentCode?: string;
  onClose: () => void;
}

export const PDFViewerModal: React.FC<PDFViewerModalProps> = ({ 
  attachment, 
  documentTitle,
  documentCode,
  onClose 
}) => {
  const [zoom, setZoom] = useState<number>(100);
  const [rotation, setRotation] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const totalPages = 2; // Số trang mô phỏng nếu là mock data
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [isClosing, setIsClosing] = useState<boolean>(false);
  const [mounted, setMounted] = useState<boolean>(false);

  useEffect(() => {
    setMounted(true);
    setZoom(100);
    setRotation(0);
    setCurrentPage(1);

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [attachment]);

  if (!attachment || !mounted || typeof document === 'undefined') return null;

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      setIsClosing(false);
      onClose();
    }, 150);
  };

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 15, 200));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 15, 60));
  const handleResetZoom = () => setZoom(100);
  const handleRotate = () => setRotation(prev => (prev + 90) % 360);
  const handlePrevPage = () => setCurrentPage(prev => Math.max(prev - 1, 1));
  const handleNextPage = () => setCurrentPage(prev => Math.min(prev + 1, totalPages));

  const handlePrint = () => {
    window.print();
  };

  const rawUrl = attachment.url;
  const secureUrl = getSecureFileUrl(rawUrl);

  const handleDownload = () => {
    if (secureUrl && secureUrl !== '#' && secureUrl.length > 5) {
      const a = document.createElement('a');
      a.href = secureUrl;
      a.download = attachment.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } else {
      alert(`Đang tải file: ${attachment.name}`);
    }
  };

  const fileNameLower = attachment.name.toLowerCase();
  const isPdf = fileNameLower.endsWith('.pdf') || (attachment.type && attachment.type.includes('pdf'));
  const isImage = (attachment.type && attachment.type.startsWith('image/')) || /\.(png|jpe?g|webp|gif|svg)$/i.test(attachment.name);

  const hasRealFileContent = !!(
    secureUrl && 
    secureUrl !== '#' && 
    (
      secureUrl.startsWith('data:') || 
      secureUrl.startsWith('blob:') || 
      secureUrl.startsWith('http://') || 
      secureUrl.startsWith('https://') ||
      secureUrl.startsWith('/api/nas')
    )
  );

  const displayDocCode = ('documentCode' in attachment && attachment.documentCode) || documentCode || 'HĐ-2026/TH';
  const displayDocTitle = ('documentTitle' in attachment && attachment.documentTitle) || documentTitle || attachment.name.replace(/\.[^/.]+$/, '').replace(/_/g, ' ');

  const modalContent = (
    <div 
      className={`fixed inset-0 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-1 sm:p-2 md:p-3 overflow-hidden ${
        isClosing ? 'animate-backdrop-out pointer-events-none' : 'animate-backdrop-in'
      }`}
      style={{ zIndex: 99999 }}
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <div 
        className={`bg-slate-900 text-white rounded-3xl shadow-2xl border border-slate-700/80 flex flex-col transition-all duration-150 overflow-hidden ${
          isFullscreen 
            ? 'fixed inset-0 w-screen h-screen rounded-none z-[100000]' 
            : 'w-[98vw] max-w-6xl h-[96vh]'
        } ${isClosing ? 'animate-modal-out' : 'animate-modal-in'}`}
      >
        
        {/* COMPACT ALL-IN-ONE HEADER BAR (Height ~42px) */}
        <div className="px-4 py-2 bg-slate-850 border-b border-slate-700/80 flex items-center justify-between gap-2 shrink-0 select-none min-h-[44px]">
          
          {/* Left: File Info & Badge */}
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="h-8 w-8 rounded-xl bg-gradient-to-tr from-brand-blue to-cyan-500 flex items-center justify-center shrink-0 shadow-xs">
              <FileText className="h-4 w-4 text-white" />
            </div>
            <div className="min-w-0 flex items-center gap-2">
              <h3 className="font-bold text-xs text-white truncate max-w-[200px] sm:max-w-xs md:max-w-md" title={attachment.name}>
                {attachment.name}
              </h3>
              {attachment.isScan && (
                <span className="px-2 py-0.5 bg-brand-red text-white text-[9px] font-bold rounded-full shrink-0 shadow-xs">
                  Bản Scan
                </span>
              )}
              {hasRealFileContent ? (
                <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[9px] font-bold rounded-full shrink-0 hidden sm:inline">
                  File Gốc
                </span>
              ) : null}
              <span className="text-[10px] text-slate-400 font-mono hidden md:inline truncate">
                • {displayDocCode}
              </span>
            </div>
          </div>

          {/* Center: Integrated Quick Controls (Pagination + Zoom + Rotate) */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Page Navigation for Sample Template */}
            {!hasRealFileContent && (
              <div className="flex items-center gap-1 bg-slate-900 border border-slate-700/80 rounded-xl px-1.5 py-1">
                <button
                  onClick={handlePrevPage}
                  disabled={currentPage <= 1}
                  className="p-1 rounded-lg hover:bg-slate-750 disabled:opacity-30 transition-colors"
                  title="Trang trước"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </button>
                <span className="px-1.5 font-mono text-[11px] text-slate-200 font-semibold">
                  {currentPage}/{totalPages}
                </span>
                <button
                  onClick={handleNextPage}
                  disabled={currentPage >= totalPages}
                  className="p-1 rounded-lg hover:bg-slate-750 disabled:opacity-30 transition-colors"
                  title="Trang sau"
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            )}

            {/* Zoom Controls */}
            <div className="flex items-center gap-0.5 bg-slate-900 border border-slate-700/80 rounded-xl p-1">
              <button
                onClick={handleZoomOut}
                className="p-1 hover:bg-slate-750 rounded-lg text-slate-300 hover:text-white transition-colors"
                title="Thu nhỏ"
              >
                <ZoomOut className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={handleResetZoom}
                className="px-2 font-mono text-[11px] font-semibold text-white hover:text-brand-blue transition-colors"
                title="Đặt lại 100%"
              >
                {zoom}%
              </button>
              <button
                onClick={handleZoomIn}
                className="p-1 hover:bg-slate-750 rounded-lg text-slate-300 hover:text-white transition-colors"
                title="Phóng to"
              >
                <ZoomIn className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Rotate */}
            <button
              onClick={handleRotate}
              className="p-1.5 bg-slate-900 border border-slate-700/80 hover:bg-slate-750 rounded-xl text-slate-300 hover:text-white transition-colors"
              title="Xoay 90 độ"
            >
              <RotateCw className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Right: Actions & Close Button */}
          <div className="flex items-center gap-1.5 shrink-0">
            {hasRealFileContent && (
              <a
                href={attachment.url}
                target="_blank"
                rel="noreferrer"
                title="Mở trong tab mới"
                className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-750 rounded-xl transition-colors"
              >
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            )}
            <button
              onClick={handlePrint}
              title="In tài liệu"
              className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-750 rounded-xl transition-colors"
            >
              <Printer className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={handleDownload}
              title="Tải về máy tính"
              className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-750 rounded-xl transition-colors"
            >
              <Download className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              title={isFullscreen ? "Thu nhỏ cửa sổ" : "Toàn màn hình"}
              className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-750 rounded-xl transition-colors"
            >
              {isFullscreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
            </button>
            <div className="w-[1px] h-4 bg-slate-700 mx-1" />
            <button
              onClick={handleClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-brand-red rounded-xl transition-colors"
              title="Đóng (Esc)"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

        </div>

        {/* EXPANDED PDF VIEWER BODY */}
        <div className="flex-1 bg-slate-950/95 overflow-auto p-2 sm:p-4 flex items-start justify-center relative">
          
          {/* CASE 1: Real PDF file uploaded by user (Base64 data or Blob) */}
          {hasRealFileContent && isPdf ? (
            <div 
              className="w-full h-full min-h-[500px] bg-white rounded-2xl shadow-2xl overflow-hidden transition-transform duration-150 origin-top flex flex-col"
              style={{
                transform: `scale(${zoom / 100}) rotate(${rotation}deg)`,
                transformOrigin: 'top center',
              }}
            >
              <object
                data={secureUrl}
                type="application/pdf"
                className="w-full h-full min-h-[750px] flex-1 border-0"
              >
                <iframe
                  src={secureUrl}
                  className="w-full h-full min-h-[750px] flex-1 border-0"
                  title={attachment.name}
                >
                  <embed
                    src={secureUrl}
                    type="application/pdf"
                    className="w-full h-full min-h-[750px] flex-1"
                  />
                </iframe>
              </object>
            </div>
          ) : hasRealFileContent && isImage ? (
            /* CASE 2: Image file uploaded by user */
            <div 
              className="flex items-center justify-center p-2 transition-transform duration-150 origin-top"
              style={{
                transform: `scale(${zoom / 100}) rotate(${rotation}deg)`,
                transformOrigin: 'top center',
              }}
            >
              <img
                src={secureUrl}
                alt={attachment.name}
                className="max-w-full max-h-[85vh] object-contain rounded-2xl shadow-2xl bg-white border border-slate-300"
              />
            </div>
          ) : (
            /* CASE 3: Enterprise Form View for Sample/Mock Files */
            <div 
              className="bg-white text-slate-900 shadow-2xl rounded-2xl border border-slate-300 transition-transform duration-150 origin-top p-6 sm:p-12 max-w-4xl w-full min-h-[850px] relative select-text"
              style={{
                transform: `scale(${zoom / 100}) rotate(${rotation}deg)`,
                transformOrigin: 'top center',
              }}
            >
              {/* Official Watermark Background */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.03] select-none">
                <span className="text-7xl font-black rotate-[-30deg] tracking-widest text-slate-900 uppercase">
                  TRUNG HẢI DMS
                </span>
              </div>

              {/* Document Header */}
              <div className="flex justify-between items-start border-b border-slate-300 pb-4 mb-5">
                <div>
                  <h4 className="font-bold text-xs uppercase tracking-wide text-slate-800">
                    CÔNG TY CỔ PHẦN CÔNG NGHỆ TRUNG HẢI
                  </h4>
                  <p className="text-[10px] text-slate-500 mt-0.5">Số: {displayDocCode} • Hệ thống DMS</p>
                </div>
                <div className="text-center">
                  <p className="font-bold text-[11px] uppercase tracking-wider text-slate-900">
                    CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
                  </p>
                  <p className="text-[10px] font-semibold text-slate-700 italic">
                    Độc lập - Tự do - Hạnh phúc
                  </p>
                  <div className="w-24 h-[1px] bg-slate-400 mx-auto mt-1" />
                </div>
              </div>

              {/* Document Title */}
              <div className="text-center my-4">
                <h2 className="text-base sm:text-lg font-black uppercase text-slate-900 tracking-wide">
                  {attachment.name.replace(/\.[^/.]+$/, '').replace(/_/g, ' ')}
                </h2>
                <p className="text-[11px] text-slate-500 italic mt-0.5">
                  Trích yếu hồ sơ: {displayDocTitle}
                </p>
              </div>

              {/* Document Content Based on Page */}
              {currentPage === 1 ? (
                <div className="space-y-4 text-xs leading-relaxed text-slate-800">
                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-[11px]">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <strong>Đơn vị lập hồ sơ:</strong> {attachment.uploadedBy || 'Phòng Kỹ thuật & Dự án'}
                      </div>
                      <div>
                        <strong>Mã hồ sơ:</strong> {displayDocCode}
                      </div>
                      <div>
                        <strong>Ngày số hóa:</strong> {new Date(attachment.uploadedAt || Date.now()).toLocaleDateString('vi-VN')}
                      </div>
                      <div>
                        <strong>Tên tệp lưu trữ:</strong> {attachment.name}
                      </div>
                    </div>
                  </div>

                  <h5 className="font-bold text-xs uppercase text-slate-900 pt-1 border-b border-slate-200 pb-1">
                    I. CĂN CỨ VÀ NỘI DUNG TÀI LIỆU
                  </h5>
                  <p>
                    - Căn cứ quy định lưu trữ và ban hành văn bản của Công ty Cổ phần Công nghệ Trung Hải;<br />
                    - Căn cứ hồ sơ đề xuất, tờ trình phê duyệt số hiệu <strong>{displayDocCode}</strong> đã được các cấp có thẩm quyền thẩm định;<br />
                    - Căn cứ các bảng thông số kỹ thuật, hợp đồng và hóa đơn chứng từ kèm theo;
                  </p>

                  <h5 className="font-bold text-xs uppercase text-slate-900 pt-1 border-b border-slate-200 pb-1">
                    II. NỘI DUNG CHI TIẾT VĂN BẢN ĐÍNH KÈM
                  </h5>
                  <div className="p-3.5 bg-slate-50/80 border border-slate-200 rounded-xl space-y-1.5">
                    <p className="font-semibold text-slate-900">
                      Tài liệu: {attachment.name}
                    </p>
                    <p className="text-slate-600 text-[11px]">
                      Văn bản được số hóa trực tiếp từ bản gốc lưu trữ tại Kho dữ liệu điện tử DMS. Nội dung tài liệu phản ánh đầy đủ các điều khoản hợp đồng kinh tế, biên bản nghiệm thu hoặc bảng dự toán kinh phí liên quan đến hồ sơ {displayDocCode}.
                    </p>
                    <div className="text-[10px] text-brand-blue font-semibold pt-0.5">
                      ✓ Đã kiểm tra tính toàn vẹn chữ ký số & dấu mộc pháp lý
                    </div>
                  </div>

                  <p className="text-[10px] text-slate-500 italic pt-1">
                    (Xem tiếp chữ ký số và con dấu xác thực tại Trang 2)
                  </p>
                </div>
              ) : (
                /* Page 2: Signature and Red Seal */
                <div className="space-y-5 text-xs leading-relaxed text-slate-800">
                  <h5 className="font-bold text-xs uppercase text-slate-900 border-b border-slate-200 pb-1">
                    III. ĐIỀU KHOẢN THI HÀNH & XÁC THỰC LƯU TRỮ
                  </h5>
                  <p>
                    1. Toàn bộ các điều khoản được thực hiện theo đúng nội dung hợp đồng và tờ trình đã phê duyệt.<br />
                    2. Văn bản có hiệu lực kể từ ngày ký số và được lưu trữ trên nền tảng quản lý hồ sơ số DMS của Công ty Trung Hải.
                  </p>

                  {/* Red Seal & Signatures Box */}
                  <div className="pt-4 grid grid-cols-2 gap-6 items-start">
                    <div className="text-center">
                      <p className="font-bold text-xs uppercase text-slate-800">NGƯỜI LẬP HỒ SƠ</p>
                      <p className="text-[10px] text-slate-500 italic mt-0.5">(Ký, ghi rõ họ tên)</p>
                      <div className="h-16 flex items-center justify-center">
                        <span className="font-serif italic text-base text-brand-blue font-semibold">
                          {attachment.uploadedBy || 'Nguyễn Văn Long'}
                        </span>
                      </div>
                      <p className="text-xs font-bold text-slate-800">{attachment.uploadedBy || 'Nguyễn Văn Long'}</p>
                      <p className="text-[10px] text-slate-500">Chuyên viên phụ trách</p>
                    </div>

                    <div className="text-center relative">
                      <p className="font-bold text-xs uppercase text-slate-800">ĐẠI DIỆN PHÊ DUYỆT</p>
                      <p className="text-[10px] text-slate-500 italic mt-0.5">(Ký số & Đóng dấu điện tử)</p>
                      
                      {/* Red Stamp Overlay */}
                      <div className="h-20 flex items-center justify-center relative">
                        {/* Stamp Graphic */}
                        <div className="w-20 h-20 rounded-full border-2 border-dashed border-brand-red flex flex-col items-center justify-center p-1 text-brand-red select-none opacity-90 rotate-[-12deg] shadow-xs">
                          <div className="text-[6px] font-bold uppercase text-center leading-tight">
                            CÔNG TY CỔ PHẦN<br />CÔNG NGHỆ TRUNG HẢI
                          </div>
                          <div className="text-[5px] font-mono font-bold my-0.5">★ ĐÃ PHÊ DUYỆT ★</div>
                          <div className="text-[5px] text-center font-bold">MÃ: TH-DMS-2026</div>
                        </div>

                        {/* Signature Text */}
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                          <span className="font-serif italic text-base text-brand-blue-dark font-bold drop-shadow">
                            Đỗ Trung Hải
                          </span>
                        </div>
                      </div>

                      <p className="text-xs font-bold text-slate-900 mt-0.5">ĐỖ TRUNG HẢI</p>
                      <p className="text-[10px] text-slate-600 font-medium">Tổng Giám đốc</p>
                      <div className="inline-flex items-center gap-1 mt-0.5 text-[9px] text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                        <CheckCircle2 className="h-3 w-3" />
                        <span>Chữ ký số hợp lệ (VNPT-CA 2026)</span>
                      </div>
                    </div>
                  </div>

                  {/* Security Hash Footer */}
                  <div className="pt-6 border-t border-slate-200 text-[10px] text-slate-400 font-mono flex items-center justify-between">
                    <span>Mã lưu trữ: {displayDocCode} • SHA-256 Verified</span>
                    <span>Trang 2 / 2</span>
                  </div>
                </div>
              )}

            </div>
          )}

        </div>

        {/* ULTRA-COMPACT FOOTER BAR (Height ~30px) */}
        <div className="px-4 py-2 bg-slate-850 border-t border-slate-700/80 flex items-center justify-between text-[11px] shrink-0 min-h-[34px]">
          <div className="flex items-center gap-1.5 text-slate-400 text-[10px]">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
            <span>Chế độ xem bảo mật DMS • SSL 256-bit</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-slate-500 hidden sm:inline">Phím tắt: Esc để đóng</span>
            <button
              type="button"
              onClick={handleClose}
              className="px-3.5 py-1 bg-slate-750 hover:bg-slate-700 text-white font-medium text-[11px] rounded-xl transition-colors cursor-pointer"
            >
              Đóng
            </button>
          </div>
        </div>

      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};
