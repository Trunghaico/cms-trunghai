import React, { useState, useMemo } from 'react';
import { 
  X, 
  Trash2, 
  Upload, 
  FileText, 
  AlertCircle, 
  CheckCircle2, 
  RotateCcw, 
  FastForward, 
  Send, 
  Eye, 
  Loader2, 
  Cloud,
  FileCheck,
  ShieldCheck,
  Building2,
  Calendar,
  DollarSign,
  MessageSquare
} from 'lucide-react';
import { useDocument } from '../../context/DocumentContext';
import { DocumentItem, Attachment, ResubmitMode } from '../../types';
import { QuillEditor } from '../common/QuillEditor';
import { PDFViewerModal } from '../common/PDFViewerModal';
import { uploadFileToNAS } from '../../lib/nasStorageService';
import { formatDate, formatCurrency } from '../../lib/storage';

interface ResubmitDocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  document: DocumentItem;
}

export const ResubmitDocumentModal: React.FC<ResubmitDocumentModalProps> = ({
  isOpen,
  onClose,
  document: doc,
}) => {
  const { resubmitDocument, activeUser } = useDocument();

  // Form states
  const [title, setTitle] = useState(doc.title);
  const [amount, setAmount] = useState<number | undefined>(doc.amount);
  const [contentHtml, setContentHtml] = useState(doc.contentHtml || doc.description || '');
  const [attachments, setAttachments] = useState<Attachment[]>(doc.attachments || []);
  const [supplementNote, setSupplementNote] = useState('');
  const [resubmitMode, setResubmitMode] = useState<ResubmitMode>('CONTINUE_FROM_CURRENT');

  // UI / Upload states
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [previewAttachment, setPreviewAttachment] = useState<Attachment | null>(null);

  // Tìm yêu cầu bổ sung gần nhất từ lịch sử xử lý (Audit Logs)
  const latestRequestInfoLog = useMemo(() => {
    return [...doc.auditLogs].reverse().find(l => l.action === 'REQUEST_INFO');
  }, [doc.auditLogs]);

  // Thông tin bước hiện tại yêu cầu bổ sung và bước đầu tiên
  const currentStep = doc.steps[doc.currentStepIndex];
  const firstStep = doc.steps[0];
  const approvedStepsCount = doc.steps.filter((s, idx) => idx < doc.currentStepIndex && s.status === 'APPROVED').length;

  if (!isOpen) return null;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    setIsUploading(true);

    const files = Array.from(e.target.files);

    for (let idx = 0; idx < files.length; idx++) {
      const file = files[idx];
      const isPdf = file.name.toLowerCase().endsWith('.pdf');
      const isImage = file.type.startsWith('image/');

      const nasResult = await uploadFileToNAS(file);
      const finalUrl = nasResult ? nasResult.url : URL.createObjectURL(file);

      const newAtt: Attachment = {
        id: `att-resubmit-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 6)}`,
        name: file.name,
        size: file.size,
        type: file.type || (isPdf ? 'application/pdf' : isImage ? 'image/png' : 'application/octet-stream'),
        url: finalUrl,
        uploadedAt: new Date().toISOString(),
        uploadedBy: activeUser?.name || 'Người lập',
        isScan: file.name.toLowerCase().includes('scan') || isPdf,
      };

      setAttachments(prev => [...prev, newAtt]);
    }

    setIsUploading(false);
    e.target.value = '';
  };

  const removeAttachment = (id: string) => {
    setAttachments(prev => prev.filter(a => a.id !== id));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!title.trim()) {
      setErrorMsg('Vui lòng nhập tên / trích yếu hồ sơ.');
      return;
    }

    if (!supplementNote.trim()) {
      setErrorMsg('Vui lòng nhập nội dung giải trình / thông tin đã bổ sung.');
      return;
    }

    setIsSubmitting(true);

    try {
      const result = resubmitDocument(doc.id, {
        title: title.trim(),
        amount: amount,
        contentHtml: contentHtml,
        description: contentHtml ? undefined : doc.description,
        attachments: attachments,
        supplementNote: supplementNote.trim(),
        resubmitMode: resubmitMode,
      });

      if (result.success) {
        onClose();
      } else {
        setErrorMsg(result.message || 'Có lỗi xảy ra khi gửi lại hồ sơ.');
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('Lỗi hệ thống khi gửi lại hồ sơ.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div 
        className="fixed inset-0 z-50 bg-slate-900/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-backdrop-in"
        onClick={(e) => {
          if (e.target === e.currentTarget && !isSubmitting) onClose();
        }}
      >
        <div className="bg-white rounded-[3px] max-w-4xl w-full shadow-2xl border border-slate-200 flex flex-col max-h-[94vh] overflow-hidden animate-modal-in">
          
          {/* Header */}
          <div className="px-6 py-4 bg-gradient-to-r from-amber-600 via-amber-700 to-amber-800 text-white flex items-center justify-between shrink-0 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-[3px] bg-white/15 flex items-center justify-center border border-white/20">
                <RotateCcw className="h-5 w-5 text-white animate-spin-once" />
              </div>
              <div>
                <h3 className="text-base font-bold flex items-center gap-2 text-white">
                  <span>Bổ Sung Hồ Sơ & Gửi Lại Phê Duyệt</span>
                  <span className="text-[11px] bg-white/20 text-white font-mono px-2 py-0.5 rounded-[3px] border border-white/30">
                    {doc.code}
                  </span>
                </h3>
                <p className="text-xs text-amber-100 mt-0.5 truncate max-w-xl">
                  {doc.title}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-[3px] transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Form Content */}
          <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
            <div className="p-6 overflow-y-auto space-y-5 flex-1 bg-slate-50/50">
              
              {/* Box Yêu cầu bổ sung từ cấp phê duyệt */}
              <div className="p-4 bg-amber-50 border-l-4 border-amber-500 rounded-r-[3px] shadow-2xs space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-amber-900 font-bold text-xs uppercase tracking-wider">
                    <AlertCircle className="h-4 w-4 text-amber-600 shrink-0" />
                    <span>Nội Dung Yêu Cầu Bổ Sung Cần Đáp Ứng:</span>
                  </div>
                  {latestRequestInfoLog && (
                    <span className="text-[11px] text-amber-700 font-medium">
                      {formatDate(latestRequestInfoLog.timestamp)}
                    </span>
                  )}
                </div>

                <div className="bg-white/90 p-3 rounded-[3px] border border-amber-200/80 text-xs text-slate-800 leading-relaxed font-medium">
                  {latestRequestInfoLog ? (
                    <div>
                      <p className="text-amber-950 font-semibold mb-1">
                        Từ: <span className="text-brand-blue font-bold">{latestRequestInfoLog.actorName}</span> ({latestRequestInfoLog.actorTitle})
                      </p>
                      <p className="italic text-slate-700 bg-amber-50/60 p-2 rounded-[2px] border border-amber-100">
                        "{latestRequestInfoLog.comment?.replace(/^Yêu cầu bổ sung tài liệu\/thông tin:\s*/i, '') || doc.description}"
                      </p>
                    </div>
                  ) : (
                    <p className="italic text-slate-600">
                      Hồ sơ đang ở trạng thái yêu cầu bổ sung thông tin hoặc tài liệu đính kèm.
                    </p>
                  )}
                </div>
              </div>

              {/* Thông báo lỗi nếu có */}
              {errorMsg && (
                <div className="p-3 bg-red-50 border-l-4 border-brand-red text-xs text-brand-red font-medium flex items-center gap-2 rounded-r-[3px] animate-fade-in">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Section 1: Thông tin cơ bản hồ sơ */}
              <div className="bg-white p-4 rounded-[3px] border border-slate-200 shadow-2xs space-y-4">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2 border-b pb-2 border-slate-100">
                  <FileText className="h-3.5 w-3.5 text-brand-blue" />
                  <span>1. Cập Nhật Thông Tin Hồ Sơ</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Trích yếu / Tên hồ sơ <span className="text-brand-red">*</span>
                    </label>
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Nhập tên hồ sơ / trích yếu..."
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-[3px] focus:outline-none focus:ring-1 focus:ring-brand-blue focus:border-brand-blue"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Giá trị đề xuất (VNĐ)
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        value={amount !== undefined ? amount : ''}
                        onChange={(e) => setAmount(e.target.value ? Number(e.target.value) : undefined)}
                        placeholder="Để trống nếu phi tài chính"
                        className="w-full px-3 py-2 text-xs border border-slate-300 rounded-[3px] focus:outline-none focus:ring-1 focus:ring-brand-blue focus:border-brand-blue"
                      />
                      {amount !== undefined && amount > 0 && (
                        <span className="absolute right-2 top-2 text-[10px] text-brand-blue font-bold">
                          {formatCurrency(amount)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Rich text Content */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Nội dung tờ trình / Căn cứ phê duyệt (Rich Text)
                  </label>
                  <QuillEditor
                    value={contentHtml}
                    onChange={setContentHtml}
                    placeholder="Chỉnh sửa hoặc cập nhật chi tiết nội dung văn bản..."
                    minHeight="140px"
                  />
                </div>
              </div>

              {/* Section 2: Quản lý & Bổ sung tài liệu đính kèm */}
              <div className="bg-white p-4 rounded-[3px] border border-slate-200 shadow-2xs space-y-4">
                <div className="flex items-center justify-between border-b pb-2 border-slate-100">
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                    <FileCheck className="h-3.5 w-3.5 text-emerald-600" />
                    <span>2. Tài Liệu Đính Kèm & Bổ Sung ({attachments.length})</span>
                  </h4>

                  <label className={`inline-flex items-center gap-1.5 px-3 py-1.5 bg-brand-blue hover:bg-brand-blue-dark text-white rounded-[3px] text-xs font-bold cursor-pointer transition-colors shadow-2xs ${
                    isUploading ? 'opacity-60 cursor-not-allowed' : ''
                  }`}>
                    {isUploading ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        <span>Đang tải lên...</span>
                      </>
                    ) : (
                      <>
                        <Upload className="h-3.5 w-3.5" />
                        <span>Đính Kèm Thêm Tệp Mới</span>
                      </>
                    )}
                    <input
                      type="file"
                      multiple
                      className="hidden"
                      onChange={handleFileUpload}
                      disabled={isUploading}
                    />
                  </label>
                </div>

                {attachments.length === 0 ? (
                  <div className="p-4 border border-dashed border-slate-300 rounded-[3px] text-center text-xs text-slate-500 bg-slate-50/50">
                    Chưa có tài liệu nào đính kèm. Vui lòng tải lên tài liệu bổ sung (PDF, Word, Excel, Scan...).
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {attachments.map((att) => (
                      <div
                        key={att.id}
                        className="p-2.5 bg-slate-50 hover:bg-slate-100/80 border border-slate-200 rounded-[3px] flex items-center justify-between gap-2 transition-colors"
                      >
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <FileText className="h-4 w-4 text-brand-blue shrink-0" />
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-bold text-slate-800 truncate" title={att.name}>
                              {att.name}
                            </p>
                            <p className="text-[10px] text-slate-500">
                              {(att.size / 1024).toFixed(1)} KB • {att.uploadedBy}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => setPreviewAttachment(att)}
                            className="p-1 text-slate-600 hover:text-brand-blue hover:bg-blue-50 rounded-[2px] transition-colors"
                            title="Xem trước tài liệu"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => removeAttachment(att.id)}
                            className="p-1 text-slate-400 hover:text-brand-red hover:bg-red-50 rounded-[2px] transition-colors"
                            title="Xóa tài liệu này"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Section 3: Ý kiến / Giải trình nội dung bổ sung */}
              <div className="bg-white p-4 rounded-[3px] border border-slate-200 shadow-2xs space-y-3">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2 border-b pb-2 border-slate-100">
                  <MessageSquare className="h-3.5 w-3.5 text-amber-600" />
                  <span>3. Nội Dung Giải Trình / Báo Cáo Bổ Sung <span className="text-brand-red">*</span></span>
                </h4>

                <div>
                  <textarea
                    rows={3}
                    value={supplementNote}
                    onChange={(e) => setSupplementNote(e.target.value)}
                    placeholder="Mô tả cụ thể nội dung, số liệu hoặc tệp đã được bổ sung theo yêu cầu (ví dụ: Đã đính kèm phụ lục đơn giá số 02 và làm rõ điều khoản thanh toán tại Điều 4...)"
                    className="w-full p-2.5 text-xs border border-slate-300 rounded-[3px] focus:outline-none focus:ring-1 focus:ring-brand-blue focus:border-brand-blue"
                    required
                  />
                  <p className="text-[11px] text-slate-500 mt-1 italic">
                    Nội dung này sẽ được ghi vào Nhật ký xử lý (Audit Trail) và thông báo tới người xét duyệt.
                  </p>
                </div>
              </div>

              {/* Section 4: Chọn phương thức trình lại phê duyệt (Rất quan trọng) */}
              <div className="bg-white p-4 rounded-[3px] border border-slate-200 shadow-2xs space-y-3">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2 border-b pb-2 border-slate-100">
                  <ShieldCheck className="h-3.5 w-3.5 text-purple-600" />
                  <span>4. Chọn Phương Thức Luân Chuyển Phê Duyệt Lại</span>
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {/* Option 1: Tiếp tục quy trình (Bỏ qua phòng ban đã duyệt) */}
                  <label 
                    className={`relative p-3.5 rounded-[3px] border-2 cursor-pointer transition-all flex flex-col justify-between ${
                      resubmitMode === 'CONTINUE_FROM_CURRENT'
                        ? 'bg-blue-50/80 border-brand-blue shadow-xs'
                        : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <input
                            type="radio"
                            name="resubmitMode"
                            value="CONTINUE_FROM_CURRENT"
                            checked={resubmitMode === 'CONTINUE_FROM_CURRENT'}
                            onChange={() => setResubmitMode('CONTINUE_FROM_CURRENT')}
                            className="h-4 w-4 text-brand-blue focus:ring-brand-blue"
                          />
                          <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                            <FastForward className="h-4 w-4 text-brand-blue" />
                            <span>Duyệt Tiếp Tục (Bỏ qua các phòng ban đã duyệt)</span>
                          </span>
                        </div>
                      </div>

                      <p className="text-[11px] text-slate-600 leading-relaxed pl-6">
                        Giữ nguyên kết quả & chữ ký số của <strong>{approvedStepsCount} bước</strong> đã duyệt trước đó. Hồ sơ sẽ được chuyển thẳng đến:
                      </p>

                      <div className="ml-6 p-2 bg-white rounded-[3px] border border-blue-200 text-xs font-semibold text-brand-blue flex items-center gap-2">
                        <div className="h-5 w-5 rounded-[2px] bg-brand-blue text-white flex items-center justify-center text-[10px] font-bold">
                          {doc.currentStepIndex + 1}
                        </div>
                        <span className="truncate">
                          Bước {doc.currentStepIndex + 1}: {currentStep?.title} ({currentStep?.approverName || currentStep?.department})
                        </span>
                      </div>
                    </div>

                    <div className="mt-2.5 pt-2 border-t border-blue-100 flex items-center gap-1 text-[10px] text-emerald-700 font-bold">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                      <span>Khuyên dùng khi chỉ cần bổ sung hồ sơ cho cấp đang yêu cầu</span>
                    </div>
                  </label>

                  {/* Option 2: Trình duyệt lại từ đầu */}
                  <label 
                    className={`relative p-3.5 rounded-[3px] border-2 cursor-pointer transition-all flex flex-col justify-between ${
                      resubmitMode === 'RESTART_FROM_BEGINNING'
                        ? 'bg-amber-50/80 border-amber-500 shadow-xs'
                        : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <input
                            type="radio"
                            name="resubmitMode"
                            value="RESTART_FROM_BEGINNING"
                            checked={resubmitMode === 'RESTART_FROM_BEGINNING'}
                            onChange={() => setResubmitMode('RESTART_FROM_BEGINNING')}
                            className="h-4 w-4 text-amber-600 focus:ring-amber-500"
                          />
                          <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                            <RotateCcw className="h-4 w-4 text-amber-600" />
                            <span>Trình Duyệt Lại Từ Đầu (Toàn bộ quy trình)</span>
                          </span>
                        </div>
                      </div>

                      <p className="text-[11px] text-slate-600 leading-relaxed pl-6">
                        Khởi động lại toàn bộ quy trình xét duyệt từ Bước 1. Tất cả các phòng ban trong chuỗi sẽ xem xét và ký duyệt lại:
                      </p>

                      <div className="ml-6 p-2 bg-white rounded-[3px] border border-amber-200 text-xs font-semibold text-amber-800 flex items-center gap-2">
                        <div className="h-5 w-5 rounded-[2px] bg-amber-600 text-white flex items-center justify-center text-[10px] font-bold">
                          1
                        </div>
                        <span className="truncate">
                          Bước 1: {firstStep?.title} ({firstStep?.approverName || firstStep?.department})
                        </span>
                      </div>
                    </div>

                    <div className="mt-2.5 pt-2 border-t border-amber-100 flex items-center gap-1 text-[10px] text-amber-800 font-bold">
                      <AlertCircle className="h-3.5 w-3.5 text-amber-600" />
                      <span>Áp dụng khi thay đổi lớn về giá trị hoặc nội dung cốt lõi</span>
                    </div>
                  </label>
                </div>
              </div>

            </div>

            {/* Footer Buttons */}
            <div className="px-6 py-4 bg-slate-100 border-t border-slate-200 flex items-center justify-between shrink-0">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-[3px] border border-slate-300 transition-colors shadow-2xs"
              >
                Hủy Bỏ
              </button>

              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2 bg-brand-blue hover:bg-brand-blue-dark text-white font-bold text-xs uppercase tracking-wider rounded-[3px] shadow transition-all flex items-center gap-2 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Đang gửi lại hồ sơ...</span>
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    <span>Xác Nhận & Gửi Lại Phê Duyệt</span>
                  </>
                )}
              </button>
            </div>
          </form>

        </div>
      </div>

      {/* Preview modal if active */}
      {previewAttachment && (
        <PDFViewerModal
          attachment={previewAttachment}
          documentTitle={doc.title}
          documentCode={doc.code}
          onClose={() => setPreviewAttachment(null)}
        />
      )}
    </>
  );
};
