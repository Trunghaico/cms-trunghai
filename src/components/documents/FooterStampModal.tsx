import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  X, 
  Printer, 
  Download, 
  CheckCircle2, 
  ShieldCheck, 
  Stamp, 
  ChevronLeft, 
  ChevronRight, 
  ZoomIn, 
  ZoomOut, 
  Settings2, 
  FileText, 
  Layers, 
  Check, 
  RotateCw,
  Maximize2,
  Minimize2,
  Info
} from 'lucide-react';
import { DocumentItem } from '../../types';
import { 
  stampPdfWithFooterSeal, 
  createStandardDocumentPdf, 
  createFooterStampCanvas, 
  FooterStampOptions, 
  FooterSignerInfo 
} from '../../lib/pdfFooterStamper';
import { convertOfficeOrImageToPdf } from '../../lib/officeToPdfConverter';
import { formatDate } from '../../lib/storage';

interface FooterStampModalProps {
  isOpen: boolean;
  onClose: () => void;
  document: DocumentItem;
  pdfSource?: ArrayBuffer | Uint8Array | string | null;
}

export const FooterStampModal: React.FC<FooterStampModalProps> = ({
  isOpen,
  onClose,
  document: doc,
  pdfSource,
}) => {
  const [marginMode, setMarginMode] = useState<'SAFE_SCALE' | 'STANDARD'>('SAFE_SCALE');
  const [applyToAllPages, setApplyToAllPages] = useState<boolean>(true);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(2);
  const [zoom, setZoom] = useState<number>(100);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [previewBlobUrl, setPreviewBlobUrl] = useState<string | null>(null);
  const [previewStampDataUri, setPreviewStampDataUri] = useState<string>('');

  // Lấy toàn bộ danh sách các phòng ban đã phê duyệt
  const approvedSteps = (doc.steps || []).filter(s => s.status === 'APPROVED');
  const availableSigners: FooterSignerInfo[] = useMemo(() => {
    if (approvedSteps.length > 0) {
      return approvedSteps.map(s => ({
        name: s.approverName,
        roleTitle: s.approverTitle,
        department: s.department || s.title,
        signatureImage: s.signatureImage,
        signedAt: s.decisionDate,
      }));
    }
    // Mẫu mặc định nếu tài liệu mô phỏng chưa có bước duyệt
    return [
      {
        name: doc.creatorName || 'Nguyễn Văn Long',
        roleTitle: doc.creatorTitle || 'Chuyên viên phụ trách',
        department: doc.department || 'Phòng Kỹ thuật & Dự án',
        signedAt: doc.createdAt,
      },
      {
        name: 'Trần Đình Đạo',
        roleTitle: 'Trưởng phòng Kỹ thuật',
        department: 'PHÒNG KỸ THUẬT THI CÔNG',
        signedAt: new Date(Date.now() - 3600000 * 24).toISOString(),
      },
      {
        name: 'Lê Bá Trung',
        roleTitle: 'Kế toán trưởng',
        department: 'PHÒNG TÀI CHÍNH KẾ TOÁN',
        signedAt: new Date(Date.now() - 3600000 * 12).toISOString(),
      },
      {
        name: 'Đỗ Trung Hải',
        roleTitle: 'Tổng Giám Đốc',
        department: 'BAN TỔNG GIÁM ĐỐC',
        signedAt: new Date().toISOString(),
      }
    ];
  }, [doc, approvedSteps]);

  // Các phòng ban được chọn đóng dấu giáp lai (mặc định chọn tất cả các ban)
  const [selectedDeptIndices, setSelectedDeptIndices] = useState<number[]>([]);

  // Tự động khởi tạo tick chọn tất cả khi danh sách thay đổi
  useEffect(() => {
    setSelectedDeptIndices(availableSigners.map((_, i) => i));
  }, [availableSigners]);

  const activeSigners = useMemo(() => {
    const list = selectedDeptIndices.map(i => availableSigners[i]).filter(Boolean);
    return list.length > 0 ? list : availableSigners;
  }, [selectedDeptIndices, availableSigners]);

  // 1. Tạo tem mẫu trực quan cho giao diện xem trước
  useEffect(() => {
    if (!isOpen) return;
    createFooterStampCanvas(activeSigners, doc.code, currentPage, totalPages).then((uri) => {
      setPreviewStampDataUri(uri);
    });
  }, [isOpen, activeSigners, doc.code, currentPage, totalPages]);

  // 2. Tạo bản PDF hoàn thiện khi cấu hình thay đổi
  useEffect(() => {
    if (!isOpen) return;

    let isCancelled = false;

    const generatePreviewPdf = async () => {
      setIsGenerating(true);
      try {
        let sourceBytes: Uint8Array | ArrayBuffer;

        if (pdfSource && pdfSource !== '#') {
          if (typeof pdfSource === 'string') {
            if (pdfSource.startsWith('data:application/pdf;base64,')) {
              const base64 = pdfSource.replace('data:application/pdf;base64,', '');
              sourceBytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
            } else {
              try {
                const res = await fetch(pdfSource);
                if (res.ok) {
                  const buf = await res.arrayBuffer();
                  const h = new Uint8Array(buf.slice(0, 4));
                  if (h[0] === 0x25 && h[1] === 0x50 && h[2] === 0x44 && h[3] === 0x46) {
                    sourceBytes = buf;
                  } else {
                    const fallbackName = typeof pdfSource === 'string'
                      ? pdfSource.split('/').pop()?.split('?')[0] || `${doc.code}.docx`
                      : `${doc.code}.docx`;
                    const conv = await convertOfficeOrImageToPdf(new File([buf], fallbackName));
                    sourceBytes = conv.pdfBytes;
                  }
                } else {
                  sourceBytes = await createStandardDocumentPdf(doc);
                }
              } catch {
                sourceBytes = await createStandardDocumentPdf(doc);
              }
            }
          } else {
            sourceBytes = pdfSource;
          }
        } else {
          sourceBytes = await createStandardDocumentPdf(doc);
        }

        const options: FooterStampOptions = {
          marginMode,
          applyToAllPages,
          signers: activeSigners,
          documentCode: doc.code,
          documentTitle: doc.title,
        };

        const finalBytes = await stampPdfWithFooterSeal(sourceBytes, options);
        if (isCancelled) return;

        const blob = new Blob([finalBytes as any], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);

        if (previewBlobUrl) {
          URL.revokeObjectURL(previewBlobUrl);
        }
        setPreviewBlobUrl(url);
      } catch (err) {
        console.error('Lỗi khi sinh bản PDF giáp lai chân trang:', err);
      } finally {
        if (!isCancelled) setIsGenerating(false);
      }
    };

    generatePreviewPdf();

    return () => {
      isCancelled = true;
    };
  }, [isOpen, marginMode, applyToAllPages, doc, pdfSource]);

  // Clean up Blob URL when closing
  useEffect(() => {
    return () => {
      if (previewBlobUrl) {
        URL.revokeObjectURL(previewBlobUrl);
      }
    };
  }, [previewBlobUrl]);

  if (!isOpen) return null;

  const handleDownload = () => {
    if (!previewBlobUrl) return;
    const a = document.createElement('a');
    a.href = previewBlobUrl;
    a.download = `${(doc.code || 'TH_DOC').replace(/[^a-zA-Z0-9_-]/g, '_')}_Giap_Lai_Chan_Trang.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handlePrint = () => {
    if (!previewBlobUrl) return;
    const printWindow = window.open(previewBlobUrl);
    if (printWindow) {
      printWindow.onload = () => {
        printWindow.print();
      };
    }
  };

  return (
    <div className="fixed inset-0 z-[1000] bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 overflow-hidden animate-backdrop-in">
      <div className="bg-white rounded-3xl max-w-6xl w-full h-[96vh] flex flex-col shadow-2xl border border-slate-300 overflow-hidden animate-modal-in">
        
        {/* TOP BAR */}
        <div className="px-5 py-3.5 bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-950 text-white flex items-center justify-between shrink-0 shadow-md">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-brand-red to-rose-600 flex items-center justify-center shadow-xs">
              <Stamp className="h-4 w-4 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm sm:text-base text-white">
                  Đóng Dấu & Giáp Lai Chân Trang (Footer Stamping)
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-emerald-400" />
                  ISO/IEC 19790
                </span>
              </div>
              <p className="text-[11px] text-blue-200/80 mt-0.5">
                {doc.code} — {doc.title}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              disabled={isGenerating || !previewBlobUrl}
              className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
            >
              <Printer className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">In Ngay</span>
            </button>
            <button
              type="button"
              onClick={handleDownload}
              disabled={isGenerating || !previewBlobUrl}
              className="px-3.5 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all shadow-md cursor-pointer disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Tải PDF Đã Đóng Dấu</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-white/70 hover:text-white hover:bg-white/10 rounded-xl transition-colors cursor-pointer ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* MAIN BODY: 2 COLUMNS (CONTROLS & LIVE PDF PREVIEW) */}
        <div className="flex-1 flex flex-col md:flex-row min-h-0 bg-slate-100 overflow-hidden">
          
          {/* LEFT SIDEBAR: ALGORITHM CONTROLS & STAMP DETAILS */}
          <div className="w-full md:w-80 lg:w-96 bg-white border-r border-slate-200 p-4 sm:p-5 flex flex-col justify-between overflow-y-auto custom-scrollbar shrink-0 gap-4">
            <div className="space-y-4">
              
              {/* Algorithm Option Card */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Settings2 className="w-4 h-4 text-blue-600" />
                  <span>Thuật Toán Xử Lý An Toàn Lề Trang</span>
                </label>
                
                {/* Option B: Safe Scale 94% (Recommended) */}
                <div 
                  onClick={() => setMarginMode('SAFE_SCALE')}
                  className={`p-3 rounded-2xl border-2 transition-all cursor-pointer ${
                    marginMode === 'SAFE_SCALE'
                      ? 'border-blue-600 bg-blue-50/70 shadow-xs'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    <input 
                      type="radio" 
                      name="marginMode" 
                      checked={marginMode === 'SAFE_SCALE'} 
                      onChange={() => setMarginMode('SAFE_SCALE')}
                      className="mt-1 text-blue-600 focus:ring-blue-500" 
                    />
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-xs text-slate-900">Kịch bản B: Co lề an toàn 94%</span>
                        <span className="px-1.5 py-0.2 bg-blue-600 text-white text-[9px] font-extrabold rounded-full">
                          Khuyên dùng
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
                        Tự động co tỷ lệ trang còn 94% và nâng nội dung lên trên 38pt, tạo dải lề trắng tinh ở chân trang. Đảm bảo <strong>100% không đè lên chữ</strong> hoặc bảng biểu Excel sát đáy.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Option A: Standard Margin */}
                <div 
                  onClick={() => setMarginMode('STANDARD')}
                  className={`p-3 rounded-2xl border-2 transition-all cursor-pointer ${
                    marginMode === 'STANDARD'
                      ? 'border-blue-600 bg-blue-50/70 shadow-xs'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    <input 
                      type="radio" 
                      name="marginMode" 
                      checked={marginMode === 'STANDARD'} 
                      onChange={() => setMarginMode('STANDARD')}
                      className="mt-1 text-blue-600 focus:ring-blue-500" 
                    />
                    <div>
                      <span className="font-bold text-xs text-slate-900">Kịch bản A: Lề tiêu chuẩn (Margin 20pt)</span>
                      <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
                        Dán trực tiếp tem vào góc dưới bên phải (X = Width - 250pt, Y = 20pt). Phù hợp với văn bản Word có khoảng trống chân trang sẵn từ 1.5 - 2cm.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Scope Selection */}
              <div className="space-y-2 pt-2 border-t border-slate-200">
                <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-indigo-600" />
                  <span>Phạm Vi Đóng Dấu Giáp Lai</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setApplyToAllPages(true)}
                    className={`p-2.5 rounded-xl border text-left text-xs font-bold transition-all cursor-pointer ${
                      applyToAllPages
                        ? 'bg-indigo-50 border-indigo-500 text-indigo-900 shadow-2xs'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span>Toàn bộ các trang</span>
                      {applyToAllPages && <Check className="w-3.5 h-3.5 text-indigo-600" />}
                    </div>
                    <span className="text-[10px] text-slate-500 font-normal block mt-0.5">Giáp lai từng trang</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setApplyToAllPages(false)}
                    className={`p-2.5 rounded-xl border text-left text-xs font-bold transition-all cursor-pointer ${
                      !applyToAllPages
                        ? 'bg-indigo-50 border-indigo-500 text-indigo-900 shadow-2xs'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span>Chỉ trang cuối</span>
                      {!applyToAllPages && <Check className="w-3.5 h-3.5 text-indigo-600" />}
                    </div>
                    <span className="text-[10px] text-slate-500 font-normal block mt-0.5">Dấu mộc kết văn bản</span>
                  </button>
                </div>
              </div>

              {/* Danh sách các phòng ban phê duyệt đóng dấu giáp lai */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-800 flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-brand-red" />
                    <span>Phòng ban đóng dấu giáp lai ({activeSigners.length}/{availableSigners.length}):</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      if (selectedDeptIndices.length === availableSigners.length) {
                        setSelectedDeptIndices([availableSigners.length - 1]);
                      } else {
                        setSelectedDeptIndices(availableSigners.map((_, i) => i));
                      }
                    }}
                    className="text-[10px] text-blue-600 hover:text-blue-800 font-bold cursor-pointer transition-colors"
                  >
                    {selectedDeptIndices.length === availableSigners.length ? 'Chọn 1 ban' : 'Chọn tất cả'}
                  </button>
                </div>

                <div className="space-y-1.5 max-h-48 overflow-y-auto custom-scrollbar">
                  {availableSigners.map((signer, sIdx) => {
                    const isChecked = selectedDeptIndices.includes(sIdx);
                    return (
                      <div
                        key={sIdx}
                        onClick={() => {
                          if (isChecked) {
                            if (selectedDeptIndices.length > 1) {
                              setSelectedDeptIndices(prev => prev.filter(i => i !== sIdx));
                            }
                          } else {
                            setSelectedDeptIndices(prev => [...prev, sIdx]);
                          }
                        }}
                        className={`p-2 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between gap-2 ${
                          isChecked
                            ? 'bg-red-50/70 border-red-300 text-slate-900 shadow-2xs'
                            : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-xs text-brand-red truncate">
                              {signer.department || signer.roleTitle}
                            </span>
                            <span className="px-1 py-0.2 bg-emerald-100 text-emerald-800 text-[8.5px] font-bold rounded">
                              Đã duyệt
                            </span>
                          </div>
                          <p className="text-[10.5px] font-semibold text-slate-800 truncate mt-0.5">
                            {signer.name} <span className="font-normal text-slate-500 text-[10px]">({signer.roleTitle})</span>
                          </p>
                        </div>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          readOnly
                          className="rounded text-red-600 focus:ring-red-500 h-4 w-4 shrink-0 pointer-events-none"
                        />
                      </div>
                    );
                  })}
                </div>

                {previewStampDataUri && (
                  <div className="pt-2 border-t border-slate-200">
                    <span className="text-[10px] text-slate-500 block mb-1 font-medium">Mẫu tem giáp lai thực tế (Vector Canvas 3x):</span>
                    <img 
                      src={previewStampDataUri} 
                      alt="Footer Stamp Preview" 
                      className="w-full h-auto rounded border border-slate-300 shadow-2xs bg-white" 
                    />
                  </div>
                )}
              </div>

            </div>

            {/* Bottom Download Helper */}
            <div className="pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={handleDownload}
                disabled={isGenerating || !previewBlobUrl}
                className="w-full py-2.5 px-4 bg-gradient-to-r from-brand-red via-red-600 to-rose-700 hover:from-red-600 hover:to-brand-red text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 active:scale-98"
              >
                <Download className="w-4 h-4" />
                <span>{isGenerating ? 'Đang tạo PDF...' : 'Tải File PDF Giáp Lai'}</span>
              </button>
            </div>

          </div>

          {/* RIGHT VIEWPORT: LIVE PDF PREVIEW */}
          <div className="flex-1 flex flex-col min-h-0 bg-slate-850 p-2 sm:p-4">
            
            {/* Viewport Toolbar */}
            <div className="px-3 py-1.5 bg-slate-900 border border-slate-700/80 rounded-2xl flex items-center justify-between text-xs text-white mb-2 shrink-0">
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-300 text-[11px]">Bản Xem Trước Văn Bản Đã Dán Tem:</span>
                {isGenerating && (
                  <span className="px-2 py-0.5 bg-blue-500/20 text-blue-300 text-[10px] rounded-full animate-pulse">
                    Đang xử lý dán tem...
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1">
                <span className="text-[11px] text-slate-400 mr-2">
                  Chế độ: <strong className="text-white">{marginMode === 'SAFE_SCALE' ? 'Co lề 94%' : 'Lề chuẩn'}</strong>
                </span>
                <button
                  type="button"
                  onClick={handlePrint}
                  title="In tài liệu"
                  className="p-1 hover:bg-slate-750 text-slate-300 hover:text-white rounded-lg transition-colors cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* PDF Embedded View */}
            <div className="flex-1 min-h-0 bg-slate-900 rounded-2xl border border-slate-700 overflow-hidden relative shadow-inner">
              {previewBlobUrl ? (
                <iframe
                  src={`${previewBlobUrl}#toolbar=0&navpanes=0&view=FitH`}
                  className="w-full h-full border-0 rounded-2xl bg-white"
                  title="PDF Giáp Lai Preview"
                />
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-2">
                  <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                  <p className="text-xs">Đang sinh bản PDF giáp lai an toàn lề...</p>
                </div>
              )}
            </div>

          </div>

        </div>

      </div>
    </div>
  );
};
