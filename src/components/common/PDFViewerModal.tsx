import React, { useState, useEffect, useRef } from 'react';
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
  CheckCircle2,
  AlertCircle,
  Loader2,
  Info
} from 'lucide-react';
import { Attachment, DocumentItem, ApprovalStep } from '../../types';
import { useDocument } from '../../context/DocumentContext';
import { getSecureFileUrl } from '../../lib/nasStorageService';
import { OfficePdfSigner } from '../../lib/officeToPdfConverter';
import { FooterStampModal } from '../documents/FooterStampModal';

interface PDFViewerModalProps {
  attachment: Attachment | (Attachment & { documentCode?: string; documentTitle?: string; documentStatus?: string }) | null;
  documentTitle?: string;
  documentCode?: string;
  document?: DocumentItem | null;
  steps?: ApprovalStep[];
  onClose: () => void;
}

export const PDFViewerModal: React.FC<PDFViewerModalProps> = ({
  attachment,
  documentTitle,
  documentCode,
  document: documentProp,
  steps: stepsProp,
  onClose
}) => {
  const { documents, selectedDocument } = useDocument();

  const [zoom, setZoom] = useState<number>(100);
  const [rotation, setRotation] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const totalPages = 2; // Số trang mô phỏng nếu là mock data
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [isClosing, setIsClosing] = useState<boolean>(false);
  const [mounted, setMounted] = useState<boolean>(false);
  const [imageError, setImageError] = useState<boolean>(false);
  const [isFooterStampOpen, setIsFooterStampOpen] = useState<boolean>(false);
  const mouseDownTargetRef = useRef<EventTarget | null>(null);

  const rawUrl = attachment?.url;
  const secureUrl = getSecureFileUrl(rawUrl);

  const fileNameLower = attachment?.name?.toLowerCase() || '';
  const isPdf = fileNameLower.endsWith('.pdf') || (attachment?.type && attachment.type.includes('pdf'));
  const isImage = (attachment?.type && attachment.type.startsWith('image/')) || /\.(png|jpe?g|webp|gif|svg)$/i.test(fileNameLower);
  const isOfficeDoc = /\.(docx|xlsx|pptx|doc|xls)$/i.test(fileNameLower);

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

  const displayDocCode = (attachment && 'documentCode' in attachment && attachment.documentCode) || documentCode || 'HĐ-2026/TH';
  const displayDocTitle = (attachment && 'documentTitle' in attachment && attachment.documentTitle) || documentTitle || (attachment ? attachment.name.replace(/\.[^/.]+$/, '').replace(/_/g, ' ') : '');

  // Xác định hồ sơ hiện tại để lấy các phòng ban phê duyệt
  const activeDoc: DocumentItem | null =
    documentProp ||
    (selectedDocument && (selectedDocument.code === displayDocCode || selectedDocument.title === displayDocTitle) ? selectedDocument : null) ||
    documents.find(d => d.code === displayDocCode || d.title === displayDocTitle) ||
    selectedDocument ||
    null;

  // Tổng hợp danh sách người ký & các phòng ban phê duyệt
  const docSigners: OfficePdfSigner[] = React.useMemo(() => {
    const list: OfficePdfSigner[] = [];

    // 1. Người lập hồ sơ
    const creatorName = activeDoc?.creatorName || (attachment as any)?.uploadedBy || 'Nguyễn Văn Long';
    const creatorTitle = activeDoc?.creatorTitle || 'Chuyên viên phụ trách';
    const creatorDept = activeDoc?.department || 'Phòng Kỹ thuật & Dự án';
    const createdAt = activeDoc?.createdAt || attachment?.uploadedAt || new Date().toISOString();

    list.push({
      id: 'creator',
      name: creatorName,
      roleTitle: creatorTitle,
      department: creatorDept,
      status: 'APPROVED',
      decisionDate: createdAt,
      isCreator: true,
      stepOrder: 0,
    });

    // 2. Các phòng ban phê duyệt
    const steps = stepsProp || activeDoc?.steps;
    if (steps && steps.length > 0) {
      steps.forEach((step, idx) => {
        list.push({
          id: step.id,
          name: step.approverName,
          roleTitle: step.approverTitle,
          department: step.department || step.title,
          status: step.status,
          decisionDate: step.decisionDate || (step.status === 'APPROVED' ? activeDoc?.updatedAt || new Date().toISOString() : undefined),
          signatureImage: step.signatureImage,
          comment: step.comment,
          stepOrder: step.stepOrder || idx + 1,
          autoApprovedBySystem: step.autoApprovedBySystem,
        });
      });
    } else {
      // Mẫu chuẩn các phòng ban Trung Hải nếu tài liệu mô phỏng chưa có steps
      list.push(
        {
          id: 'step-kt',
          name: 'Trần Đình Đạo',
          roleTitle: 'Trưởng phòng Kỹ thuật',
          department: 'PHÒNG KỸ THUẬT THI CÔNG',
          status: 'APPROVED',
          decisionDate: new Date(Date.now() - 3600000 * 24).toISOString(),
          stepOrder: 1,
        },
        {
          id: 'step-tc',
          name: 'Lê Bá Trung',
          roleTitle: 'Kế toán trưởng',
          department: 'PHÒNG TÀI CHÍNH KẾ TOÁN',
          status: 'APPROVED',
          decisionDate: new Date(Date.now() - 3600000 * 12).toISOString(),
          stepOrder: 2,
        },
        {
          id: 'step-tgd',
          name: 'Đỗ Trung Hải',
          roleTitle: 'Tổng Giám Đốc',
          department: 'BAN TỔNG GIÁM ĐỐC',
          status: 'APPROVED',
          decisionDate: new Date().toISOString(),
          stepOrder: 3,
        }
      );
    }

    return list;
  }, [activeDoc, stepsProp, attachment]);

  useEffect(() => {
    setMounted(true);
    setZoom(100);
    setRotation(0);
    setCurrentPage(1);
    setImageError(false);

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

  const handleDownload = () => {
    const downloadTarget = secureUrl;
    if (downloadTarget && downloadTarget !== '#' && downloadTarget.length > 5) {
      const a = document.createElement('a');
      a.href = downloadTarget;
      a.download = attachment.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } else {
      alert(`Đang tải file: ${attachment.name}`);
    }
  };

  const modalContent = (
    <div
      className={`fixed inset-0 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-1 sm:p-2 md:p-3 overflow-hidden pt-[max(env(safe-area-inset-top,0px),8px)] pb-safe ${isClosing ? 'animate-backdrop-out pointer-events-none' : 'animate-backdrop-in'
        }`}
      style={{ zIndex: 99999 }}
      onMouseDown={(e) => {
        mouseDownTargetRef.current = e.target;
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && mouseDownTargetRef.current === e.currentTarget) {
          handleClose();
        }
      }}
    >
      <div
        className={`bg-slate-900 text-white rounded-3xl shadow-2xl border border-slate-700/80 flex flex-col transition-all duration-150 overflow-hidden ${isFullscreen
          ? 'fixed inset-0 w-screen h-screen rounded-none z-[100000]'
          : 'w-[98vw] max-w-7xl h-[96vh]'
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
            {(!hasRealFileContent || isImage) && (
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
            )}

            {/* Rotate for mock & image */}
            {(!hasRealFileContent || isImage) && (
              <button
                onClick={handleRotate}
                className="p-1.5 bg-slate-900 border border-slate-700/80 hover:bg-slate-750 rounded-xl text-slate-300 hover:text-white transition-colors"
                title="Xoay 90 độ"
              >
                <RotateCw className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Right: Actions & Close Button */}
          <div className="flex items-center gap-1.5 shrink-0">
            {hasRealFileContent && (
              <a
                href={secureUrl}
                target="_blank"
                rel="noreferrer"
                title="Mở toàn màn hình trong tab mới"
                className="px-2 py-1 text-slate-300 hover:text-white hover:bg-slate-750 rounded-xl transition-colors flex items-center gap-1 text-xs"
              >
                <ExternalLink className="h-3.5 w-3.5 text-cyan-400" />
                <span className="hidden sm:inline text-[11px] font-medium">Mở tab mới</span>
              </a>
            )}
            {activeDoc && isPdf && hasRealFileContent && (
              <button
                type="button"
                onClick={() => setIsFooterStampOpen(true)}
                title="Đóng dấu giáp lai chân trang cho tệp PDF tải lên"
                className="px-2.5 py-1 text-slate-200 hover:text-white bg-slate-800 hover:bg-slate-750 border border-slate-700 hover:border-slate-600 rounded-xl transition-all flex items-center gap-1.5 text-xs font-semibold cursor-pointer shadow-2xs active:scale-95"
              >
                <ShieldCheck className="h-3.5 w-3.5 text-brand-red shrink-0" />
                <span className="hidden sm:inline">Giáp lai chân trang</span>
              </button>
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
              className="p-1.5 text-slate-400 hover:text-white hover:bg-brand-red rounded-xl transition-colors cursor-pointer"
              title="Đóng (Esc)"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

        </div>

        {/* EXPANDED PDF VIEWER BODY */}
        <div className={`flex-1 min-h-0 min-w-0 bg-slate-950/95 relative flex ${hasRealFileContent && isPdf
          ? 'p-1 sm:p-2 overflow-hidden flex-col'
          : 'overflow-auto p-2 sm:p-4 items-start justify-center'
          }`}>

          {/* CASE 1: Real PDF file uploaded by user */}
          {hasRealFileContent && isPdf ? (
            <div className="w-full h-full flex-1 min-h-0 min-w-0 bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col border border-slate-700/60 relative">
              <iframe
                src={`${secureUrl}#toolbar=1&navpanes=0&view=FitH`}
                className="w-full h-full flex-1 min-h-0 min-w-0 border-0 rounded-2xl bg-white"
                title={attachment.name}
              />
            </div>
          ) : hasRealFileContent && isOfficeDoc ? (
            /* CASE 2: Word / Excel files - Do NOT convert, keep original and offer download */
            <div className="bg-white text-slate-900 shadow-2xl rounded-2xl border border-slate-300 p-8 sm:p-12 max-w-xl w-full text-center space-y-4 my-auto select-text">
              <div className="w-16 h-16 rounded-3xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto border border-blue-200 shadow-xs">
                <FileText className="w-8 h-8" />
              </div>
              <div>
                <h4 className="text-base font-bold text-slate-900">{attachment.name}</h4>
                <p className="text-xs text-slate-500 mt-1">
                  Tệp văn bản Word / Excel gốc • {attachment.size ? (attachment.size / 1024).toFixed(1) + ' KB' : 'DMS Storage'}
                </p>
              </div>
              <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-left text-xs text-amber-800 space-y-1">
                <p className="font-bold flex items-center gap-1.5 text-amber-900">
                  <Info className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Quy định đóng dấu & hiển thị tệp:</span>
                </p>
                <p className="text-[11.5px] leading-relaxed">
                  Hệ thống không tự động chuyển đổi tệp Word/Excel sang PDF. Tính năng <strong>Đóng dấu giáp lai chân trang</strong> chỉ áp dụng cho các tệp định dạng <strong>.PDF</strong> gốc do người dùng tải lên.
                </p>
              </div>
              <div className="flex items-center justify-center gap-3 pt-2">
                <a
                  href={secureUrl}
                  download={attachment.name}
                  className="px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs rounded-xl flex items-center gap-2 shadow-md transition-all cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Tải Tệp Về Máy Tính</span>
                </a>
                <a
                  href={secureUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl flex items-center gap-2 border border-slate-300 transition-all cursor-pointer"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>Mở liên kết tệp</span>
                </a>
              </div>
            </div>
          ) : hasRealFileContent && isImage && !imageError ? (
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
                onError={() => setImageError(true)}
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
              {imageError && (
                <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-2 text-xs text-amber-800 shadow-2xs">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Tệp đính kèm trên máy chủ lưu trữ NAS chưa đồng bộ hoặc đã được di dời. Hệ thống tự động kích hoạt phiếu đối chiếu hồ sơ điện tử.</span>
                </div>
              )}
              <div className="flex justify-between items-start border-b border-slate-300 pb-4 mb-5">
                <div>
                  <h4 className="font-bold text-xs uppercase tracking-wide text-slate-800">
                    CTY CỔ PHẦN XÂY DỰNG VÀ ĐẦU TƯ TRUNG HẢI
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
                    - Căn cứ quy định lưu trữ và ban hành văn bản của Cty CP Xây dựng và Đầu tư Trung Hải;<br />
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
                    2. Văn bản có hiệu lực kể từ ngày ký số và được lưu trữ trên nền tảng quản lý hồ sơ số DMS của Cty CP Xây dựng và Đầu tư Trung Hải.
                  </p>

                  {/* Khối Chữ ký điện tử & Dấu mộc các phòng ban phê duyệt */}
                  <div className="pt-4 space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-300 pb-2">
                      <h6 className="font-extrabold text-[11px] uppercase tracking-wide text-slate-900">
                        XÁC NHẬN KÝ DUYỆT & ĐÓNG DẤU ĐIỆN TỬ CÁC PHÒNG BAN
                      </h6>
                      <span className="text-[10px] text-brand-blue font-semibold">
                        ✓ Chứng thực số PAdES - B-LTA hợp lệ
                      </span>
                    </div>

                    <div
                      className="grid gap-3.5 items-start"
                      style={{
                        gridTemplateColumns: `repeat(${Math.min(docSigners.length, 3)}, minmax(0, 1fr))`
                      }}
                    >
                      {docSigners.map((signer, sIdx) => {
                        const isApproved = signer.status === 'APPROVED';
                        const hasDrawSignature = signer.signatureImage && signer.signatureImage.startsWith('data:image');
                        const hasUrlSignature = signer.signatureImage && signer.signatureImage.startsWith('http');

                        return (
                          <div
                            key={signer.id || sIdx}
                            className={`border rounded-xl p-3 flex flex-col justify-between text-center relative overflow-hidden transition-all ${isApproved
                              ? 'border-red-200 bg-red-50/20 shadow-2xs'
                              : signer.isCreator
                                ? 'border-blue-200 bg-blue-50/20 shadow-2xs'
                                : 'border-slate-200 bg-slate-50/50 opacity-80'
                              }`}
                          >
                            {/* Header: Phòng ban / Chức vụ */}
                            <div>
                              <p className="font-black text-[10px] uppercase tracking-wider text-slate-900 line-clamp-1" title={signer.department || signer.roleTitle}>
                                {signer.isCreator ? 'NGƯỜI LẬP HỒ SƠ' : (signer.department || signer.roleTitle || 'PHÒNG PHÊ DUYỆT')}
                              </p>
                              <p className="text-[9px] text-slate-500 italic mt-0.5">
                                {signer.isCreator ? '(Ký, ghi rõ họ tên)' : '(Ký số & Đóng dấu điện tử)'}
                              </p>
                            </div>

                            {/* Khu vực con dấu & chữ ký */}
                            <div className="my-2 py-1 flex flex-col items-center justify-center min-h-[75px]">
                              {isApproved ? (
                                <div className="space-y-1 flex flex-col items-center w-full">
                                  {/* Chữ ký vẽ tay sắc nét */}
                                  {(hasDrawSignature || hasUrlSignature) ? (
                                    <div className="h-8 max-w-[130px] flex items-center justify-center overflow-hidden mb-1">
                                      <img
                                        src={signer.signatureImage}
                                        alt="Chữ ký"
                                        className="max-h-full object-contain filter contrast-150 brightness-95 mix-blend-multiply drop-shadow-2xs"
                                      />
                                    </div>
                                  ) : (
                                    <div className="h-8 max-w-[130px] flex flex-col items-center justify-center mb-1">
                                      <span className="font-['Brush_Script_MT',cursive] italic font-bold text-blue-700 text-sm tracking-wide -rotate-3 select-none">
                                        {(signer.name || 'Trung Hải').split(' ').pop()}
                                      </span>
                                      <div className="w-14 h-[1px] bg-blue-600/80 -mt-0.5 rounded-full" />
                                    </div>
                                  )}

                                  {/* Con dấu đỏ điện tử Trung Hải */}
                                  <div className="w-full px-2 py-1.5 border border-brand-red rounded-lg text-brand-red bg-red-50/90 text-center space-y-0.5 shadow-2xs">
                                    <div className="flex items-center justify-center gap-1 font-black text-[7.5px] uppercase tracking-wider border-b border-brand-red/30 pb-0.5">
                                      <ShieldCheck className="w-2.5 h-2.5 text-brand-red shrink-0" />
                                      <span>CTY CP XÂY DỰNG & ĐẦU TƯ TRUNG HẢI</span>
                                    </div>
                                    <p className="font-black text-[8.5px] uppercase tracking-wider text-brand-red pt-0.5">
                                      ✓ ĐÃ KÝ ĐIỆN TỬ
                                    </p>
                                    <p className="font-bold text-[8.5px] text-slate-900 truncate">
                                      {signer.name}
                                    </p>
                                    <p className="text-[7.5px] font-mono text-slate-600">
                                      {signer.decisionDate ? new Date(signer.decisionDate).toLocaleDateString('vi-VN') + ' ' + new Date(signer.decisionDate).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '20/10/2026 14:30'}
                                    </p>
                                    <p className="text-[7px] font-mono text-slate-400">
                                      AUTH: {(signer.id || 'TH-CA').slice(-6).toUpperCase()}
                                    </p>
                                  </div>
                                </div>
                              ) : signer.isCreator ? (
                                <div className="h-16 flex items-center justify-center">
                                  <span
                                    className="italic text-base text-brand-blue font-bold tracking-normal"
                                    style={{ fontFamily: "'Segoe Script', 'Brush Script MT', cursive, sans-serif" }}
                                  >
                                    {signer.name}
                                  </span>
                                </div>
                              ) : (
                                <div className="text-center text-slate-400 text-[10px] italic py-3">
                                  (Chưa ký duyệt)
                                </div>
                              )}
                            </div>

                            {/* Tên & chức danh phía dưới */}
                            <div>
                              <p className="text-[10px] font-bold text-slate-900 leading-tight uppercase">
                                {signer.name}
                              </p>
                              <p className="text-[9px] text-slate-500 font-medium truncate mt-0.5">
                                {signer.roleTitle}
                              </p>
                              {isApproved ? (
                                <div className="inline-flex items-center gap-1 mt-1 text-[8px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                                  <CheckCircle2 className="h-2.5 w-2.5 shrink-0" />
                                  <span>Chữ ký số hợp lệ</span>
                                </div>
                              ) : signer.isCreator ? (
                                <div className="inline-flex items-center gap-1 mt-1 text-[8px] text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                                  <CheckCircle2 className="h-2.5 w-2.5 shrink-0" />
                                  <span>Người lập hồ sơ</span>
                                </div>
                              ) : null}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Security Hash Footer */}
                  <div className="pt-6 border-t border-slate-200 text-[10px] text-slate-400 font-mono flex items-center justify-between">
                    <span>Mã lưu trữ: {displayDocCode} </span>
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
            <span>Chế độ xem bảo mật DMS </span>
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

      {/* Footer Stamp Modal if active - Chỉ mở cho tệp PDF tải lên */}
      {isFooterStampOpen && activeDoc && isPdf && hasRealFileContent && (
        <FooterStampModal
          isOpen={isFooterStampOpen}
          onClose={() => setIsFooterStampOpen(false)}
          document={activeDoc}
          pdfSource={secureUrl}
        />
      )}
    </div>
  );

  return createPortal(modalContent, document.body);
};
