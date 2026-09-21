import React, { useState } from 'react';
import { 
  X, 
  FileText, 
  Download, 
  Eye, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  AlertTriangle, 
  Calendar, 
  User, 
  Building2, 
  DollarSign, 
  Paperclip, 
  History, 
  Printer, 
  ShieldCheck,
  Send,
  MessageSquare,
  Flame,
  FileCheck2,
  ChevronRight,
  Share2
} from 'lucide-react';
import { useDocument } from '../../context/DocumentContext';
import { ApprovalTimeline } from './ApprovalTimeline';
import { DigitalSignaturePad } from './DigitalSignaturePad';
import { formatCurrency, formatDate } from '../../lib/storage';
import { PDFViewerModal } from '../common/PDFViewerModal';
import { Attachment } from '../../types';

export const DocumentDetailModal: React.FC = () => {
  const { 
    selectedDocument, 
    setSelectedDocument, 
    activeUser, 
    approveStep, 
    rejectDocument, 
    requestAdditionalInfo,
    deleteDocument,
    hasPermission 
  } = useDocument();

  const [activeTab, setActiveTab] = useState<'DETAILS' | 'ATTACHMENTS' | 'AUDIT'>('DETAILS');
  const [approvalAction, setApprovalAction] = useState<'NONE' | 'APPROVE' | 'REJECT' | 'REQUEST_INFO'>('NONE');
  const [commentText, setCommentText] = useState('');
  const [signatureData, setSignatureData] = useState<string>('STAMP_OFFICIAL');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [previewAttachment, setPreviewAttachment] = useState<Attachment | null>(null);
  const [isClosing, setIsClosing] = useState(false);

  if (!selectedDocument || !activeUser) return null;

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      setIsClosing(false);
      setSelectedDocument(null);
    }, 200);
  };

  const currentStep = selectedDocument.steps[selectedDocument.currentStepIndex];
  
  const canApprove = hasPermission('approval.approve');
  const canOverride = hasPermission('approval.override');
  const canReject = hasPermission('approval.reject');
  const canReqInfo = hasPermission('approval.request_info');
  const canDelete = hasPermission('doc.delete');
  const canPrint = hasPermission('doc.print_export');

  // Kiểm tra xem người dùng hiện tại có quyền duyệt bước này không
  const isExactUser = currentStep && currentStep.approverId ? currentStep.approverId === activeUser.id : false;
  const isDeptApprover = currentStep && !currentStep.approverId && (
    (currentStep.department && currentStep.department.toLowerCase() === activeUser.department.toLowerCase()) ||
    activeUser.role === currentStep.approverRole ||
    (currentStep.department?.includes('Pháp chế') && activeUser.role === 'LEGAL_DEPT') ||
    (currentStep.department?.includes('Kế toán') && activeUser.role === 'CHIEF_ACCOUNTANT') ||
    (currentStep.department?.includes('Giám Đốc') && activeUser.role === 'DIRECTOR')
  );

  const isAuthorizedToSign = 
    activeUser.role === 'DIRECTOR' || 
    activeUser.role === 'ADMIN' || 
    activeUser.role === 'DEPT_HEAD' || 
    activeUser.role === 'CHIEF_ACCOUNTANT' || 
    activeUser.role === 'LEGAL_DEPT' ||
    activeUser.role === currentStep?.approverRole;

  const canUserApprove = 
    selectedDocument.status !== 'APPROVED' &&
    selectedDocument.status !== 'REJECTED' &&
    currentStep &&
    currentStep.status === 'CURRENT' &&
    ((canApprove && (isExactUser || (isDeptApprover && isAuthorizedToSign))) || canOverride);

  const handleApproveSubmit = () => {
    setIsSubmitting(true);
    approveStep(selectedDocument.id, commentText, signatureData);
    setIsSubmitting(false);
    setApprovalAction('NONE');
    setCommentText('');
  };

  const handleRejectSubmit = () => {
    if (!commentText.trim()) {
      alert('Vui lòng nhập lý do từ chối phê duyệt hồ sơ.');
      return;
    }
    setIsSubmitting(true);
    rejectDocument(selectedDocument.id, commentText);
    setIsSubmitting(false);
    setApprovalAction('NONE');
    setCommentText('');
  };

  const handleRequestInfoSubmit = () => {
    if (!commentText.trim()) {
      alert('Vui lòng nhập nội dung cần yêu cầu bổ sung.');
      return;
    }
    setIsSubmitting(true);
    requestAdditionalInfo(selectedDocument.id, commentText);
    setIsSubmitting(false);
    setApprovalAction('NONE');
    setCommentText('');
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div 
      className={`fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto ${
        isClosing ? 'animate-backdrop-out pointer-events-none' : 'animate-backdrop-in'
      }`}
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <div 
        className={`bg-white rounded-[3px] max-w-5xl w-full shadow-2xl border border-slate-200 flex flex-col max-h-[92vh] overflow-hidden ${
          isClosing ? 'animate-modal-out' : 'animate-modal-in'
        }`}
      >
        
        {/* Header Bar */}
        <div className="px-6 py-4 bg-brand-blue text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-[3px] bg-white/10 flex items-center justify-center border border-white/20">
              <FileCheck2 className="h-5 w-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono font-black text-sm bg-brand-red px-2 py-0.5 rounded-[3px] text-white">
                  {selectedDocument.code}
                </span>
                <span className="text-xs text-blue-100 font-semibold">
                  {selectedDocument.category}
                </span>
                {selectedDocument.priority === 'VERY_URGENT' && (
                  <span className="text-[10px] font-bold bg-amber-400 text-slate-900 px-1.5 py-0.5 rounded-[3px] flex items-center gap-1">
                    <Flame className="h-3 w-3" />
                    Hỏa tốc
                  </span>
                )}
              </div>
              <h2 className="text-sm sm:text-base font-bold text-white mt-1 line-clamp-1">
                {selectedDocument.title}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              title="In phiếu trình ký"
              className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-[3px] transition-colors"
            >
              <Printer className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={handleClose}
              className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-[3px] transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Navigation Sub-Tabs */}
        <div className="flex items-center justify-between px-6 bg-slate-50 border-b border-slate-200 text-xs font-semibold shrink-0">
          <div className="flex gap-4">
            <button
              onClick={() => setActiveTab('DETAILS')}
              className={`py-3 border-b-2 transition-all ${
                activeTab === 'DETAILS'
                  ? 'border-brand-blue text-brand-blue font-bold'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              Thông tin & Luồng phê duyệt (BPM)
            </button>
            <button
              onClick={() => setActiveTab('ATTACHMENTS')}
              className={`py-3 border-b-2 flex items-center gap-1.5 transition-all ${
                activeTab === 'ATTACHMENTS'
                  ? 'border-brand-blue text-brand-blue font-bold'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>Hồ sơ scan & Đính kèm (DMS)</span>
              <span className="px-1.5 py-0.2 text-[10px] bg-slate-200 text-slate-700 rounded-[3px]">
                {selectedDocument.attachments.length}
              </span>
            </button>
            <button
              onClick={() => setActiveTab('AUDIT')}
              className={`py-3 border-b-2 flex items-center gap-1.5 transition-all ${
                activeTab === 'AUDIT'
                  ? 'border-brand-blue text-brand-blue font-bold'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              <History className="h-3.5 w-3.5" />
              <span>Nhật ký xử lý</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] text-slate-500">Trạng thái:</span>
            <span className={`px-2 py-0.5 text-xs font-bold rounded-[3px] ${
              selectedDocument.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-800' :
              selectedDocument.status === 'REJECTED' ? 'bg-red-100 text-red-800' :
              selectedDocument.status === 'ADDITIONAL_REQ' ? 'bg-amber-100 text-amber-900' :
              selectedDocument.status === 'IN_PROGRESS' ? 'bg-brand-blue-light text-brand-blue' :
              'bg-slate-200 text-slate-700'
            }`}>
              {selectedDocument.status === 'APPROVED' ? 'Đã hoàn tất phê duyệt & Ký số' :
               selectedDocument.status === 'REJECTED' ? 'Đã từ chối' :
               selectedDocument.status === 'ADDITIONAL_REQ' ? 'Yêu cầu bổ sung' :
               selectedDocument.status === 'IN_PROGRESS' ? 'Đang luân chuyển duyệt' : 'Chờ duyệt'}
            </span>
          </div>
        </div>

        {/* Body Content (Scrollable) */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          
          {activeTab === 'DETAILS' && (
            <div className="space-y-6">
              
              {/* Document Metadata Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-slate-50 border border-slate-200 rounded-[3px]">
                <div>
                  <p className="text-[11px] text-slate-500 font-medium">Người lập hồ sơ</p>
                  <p className="text-xs font-bold text-slate-800 mt-0.5">{selectedDocument.creatorName}</p>
                  <p className="text-[10px] text-slate-500">{selectedDocument.department}</p>
                </div>

                <div>
                  <p className="text-[11px] text-slate-500 font-medium">Ngày trình & Hạn mong muốn</p>
                  <p className="text-xs font-bold text-slate-800 mt-0.5">{formatDate(selectedDocument.createdAt)}</p>
                  <p className="text-[10px] text-brand-blue font-semibold">
                    Hạn: {formatDate(selectedDocument.desiredDeadline || selectedDocument.deadline)}
                  </p>
                </div>

                <div>
                  <p className="text-[11px] text-slate-500 font-medium">Dự án áp dụng</p>
                  <p className="text-xs font-bold text-slate-800 mt-0.5 truncate">
                    {selectedDocument.project || 'Chung / Văn phòng'}
                  </p>
                  <p className="text-[10px] text-slate-500">{selectedDocument.category}</p>
                </div>

                <div>
                  <p className="text-[11px] text-slate-500 font-medium">Giá trị đề xuất / Mức độ</p>
                  <p className="text-xs font-black text-brand-blue mt-0.5">
                    {selectedDocument.amount ? formatCurrency(selectedDocument.amount) : 'Phi tài chính'}
                  </p>
                  <p className="text-[10px] font-bold text-brand-red">
                    {selectedDocument.priority === 'VERY_URGENT' ? 'Hỏa tốc (Xử lý ngay)' :
                     selectedDocument.priority === 'URGENT' ? 'Khẩn cấp (Trong ngày)' : 'Bình thường'}
                  </p>
                </div>
              </div>

              {/* CC Followers list if present */}
              {selectedDocument.ccUsers && selectedDocument.ccUsers.length > 0 && (
                <div className="p-3 bg-slate-50/80 border border-slate-200 rounded-[3px] flex items-center gap-3">
                  <span className="text-[11px] font-bold text-slate-600 shrink-0">Người theo dõi (Cc):</span>
                  <div className="flex flex-wrap gap-2">
                    {selectedDocument.ccUsers.map((cc) => (
                      <span
                        key={cc.id}
                        className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-white border border-slate-200 rounded-[3px] text-[11px] text-slate-700 font-semibold"
                      >
                        {cc.avatar && <img src={cc.avatar} alt={cc.name} className="h-4 w-4 rounded-[3px] object-cover" />}
                        <span>{cc.name}</span>
                        <span className="text-slate-400 text-[10px] font-normal">({cc.roleTitle})</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Description / Quill Content Box */}
              <div>
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Nội dung tờ trình / Căn cứ phê duyệt
                </h4>
                <div className="p-4 bg-white border border-slate-200 rounded-[3px] text-xs text-slate-800 leading-relaxed max-h-72 overflow-y-auto">
                  {selectedDocument.contentHtml ? (
                    <div 
                      className="rich-content space-y-2 [&_h1]:text-base [&_h1]:font-bold [&_h2]:text-sm [&_h2]:font-bold [&_h3]:text-xs [&_h3]:font-bold [&_p]:my-1 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_table]:border-collapse [&_table]:w-full [&_td]:border [&_td]:border-slate-200 [&_td]:p-1.5 [&_th]:border [&_th]:border-slate-300 [&_th]:p-1.5 [&_th]:bg-slate-50"
                      dangerouslySetInnerHTML={{ __html: selectedDocument.contentHtml }} 
                    />
                  ) : (
                    <p>{selectedDocument.description || 'Không có mô tả chi tiết kèm theo.'}</p>
                  )}
                </div>
              </div>

              {/* Visual Approval Stepper (BPM Flow) */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Tiến trình luân chuyển & Chữ ký số các cấp (BPM Routing)
                  </h4>
                  <span className="text-xs text-slate-500">
                    Bước {selectedDocument.currentStepIndex + 1} / {selectedDocument.steps.length}
                  </span>
                </div>
                <ApprovalTimeline
                  steps={selectedDocument.steps}
                  currentStepIndex={selectedDocument.currentStepIndex}
                />
              </div>

              {/* Approval Actions Box for Authorized User */}
              {canUserApprove && (
                <div className="p-5 bg-blue-50/70 border-2 border-brand-blue/30 rounded-[3px] space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="h-7 w-7 rounded-[3px] bg-brand-blue text-white flex items-center justify-center font-bold text-xs">
                        ✓
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-brand-blue">
                          Xử Lý Ký Duyệt Bước {selectedDocument.currentStepIndex + 1}: {currentStep?.title}
                        </h4>
                        <p className="text-xs text-slate-600">
                          Bạn đang đăng nhập với tư cách <strong>{activeUser.name}</strong> ({activeUser.roleTitle})
                        </p>
                      </div>
                    </div>
                  </div>

                  {approvalAction === 'NONE' ? (
                    <div className="flex flex-wrap items-center gap-3 pt-2">
                      <button
                        onClick={() => setApprovalAction('APPROVE')}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase tracking-wider rounded-[3px] shadow transition-all flex items-center gap-2"
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        <span>Phê Duyệt & Ký Số</span>
                      </button>

                      <button
                        onClick={() => setApprovalAction('REQUEST_INFO')}
                        className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs uppercase tracking-wider rounded-[3px] shadow transition-all flex items-center gap-2"
                      >
                        <MessageSquare className="h-4 w-4" />
                        <span>Yêu Cầu Bổ Sung</span>
                      </button>

                      <button
                        onClick={() => setApprovalAction('REJECT')}
                        className="px-4 py-2 bg-brand-red hover:bg-brand-red-dark text-white font-bold text-xs uppercase tracking-wider rounded-[3px] shadow transition-all flex items-center gap-2"
                      >
                        <XCircle className="h-4 w-4" />
                        <span>Từ Chối Duyệt</span>
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-4 pt-2 animate-in fade-in duration-150">
                      {approvalAction === 'APPROVE' && (
                        <div>
                          <p className="text-xs font-bold text-slate-700 mb-2">
                            Xác thực chữ ký số điện tử của bạn:
                          </p>
                          <DigitalSignaturePad
                            approverName={activeUser.name}
                            approverTitle={activeUser.roleTitle}
                            onSaveSignature={setSignatureData}
                          />
                        </div>
                      )}

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          {approvalAction === 'APPROVE' ? 'Ý kiến phê duyệt / Ghi chú (Không bắt buộc):' :
                           approvalAction === 'REJECT' ? 'Lý do từ chối hồ sơ (Bắt buộc):' :
                           'Nội dung yêu cầu bổ sung hồ sơ/tài liệu (Bắt buộc):'}
                        </label>
                        <textarea
                          rows={3}
                          value={commentText}
                          onChange={(e) => setCommentText(e.target.value)}
                          placeholder={
                            approvalAction === 'APPROVE' ? 'Đã kiểm tra kỹ các điều khoản, đồng ý phê duyệt...' :
                            approvalAction === 'REJECT' ? 'Nhập lý do từ chối cụ thể để người lập hồ sơ nắm rõ...' :
                            'Nêu rõ cần bổ sung bảng báo giá, phụ lục hợp đồng, chứng từ...'
                          }
                          className="w-full p-2.5 text-xs border border-slate-300 rounded-[3px] focus:outline-none focus:ring-1 focus:ring-brand-blue"
                        />
                      </div>

                      <div className="flex items-center gap-2 pt-1">
                        {approvalAction === 'APPROVE' && (
                          <button
                            onClick={handleApproveSubmit}
                            disabled={isSubmitting}
                            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase tracking-wider rounded-[3px] shadow transition-all flex items-center gap-2"
                          >
                            <ShieldCheck className="h-4 w-4" />
                            <span>Xác Nhận Ký Số & Chuyển Bước Tiếp</span>
                          </button>
                        )}

                        {approvalAction === 'REJECT' && (
                          <button
                            onClick={handleRejectSubmit}
                            disabled={isSubmitting}
                            className="px-4 py-2 bg-brand-red hover:bg-brand-red-dark text-white font-bold text-xs uppercase tracking-wider rounded-[3px] shadow transition-all flex items-center gap-2"
                          >
                            <XCircle className="h-4 w-4" />
                            <span>Xác Nhận Từ Chối Hồ Sơ</span>
                          </button>
                        )}

                        {approvalAction === 'REQUEST_INFO' && (
                          <button
                            onClick={handleRequestInfoSubmit}
                            disabled={isSubmitting}
                            className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs uppercase tracking-wider rounded-[3px] shadow transition-all flex items-center gap-2"
                          >
                            <Send className="h-4 w-4" />
                            <span>Gửi Yêu Cầu Bổ Sung Cho Người Trình</span>
                          </button>
                        )}

                        <button
                          onClick={() => {
                            setApprovalAction('NONE');
                            setCommentText('');
                          }}
                          className="px-3 py-2 bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 text-xs font-semibold rounded-[3px]"
                        >
                          Hủy bỏ
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Status Banner when user is not the current approver */}
              {!canUserApprove && selectedDocument.status !== 'APPROVED' && selectedDocument.status !== 'REJECTED' && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-[3px] flex items-center gap-2 text-xs text-amber-900">
                  <Clock className="h-4 w-4 text-amber-600 shrink-0" />
                  <span>
                    Hồ sơ đang chờ xử lý tại <strong>Bước {selectedDocument.currentStepIndex + 1}: {currentStep?.approverTitle} ({currentStep?.approverName})</strong>.
                  </span>
                </div>
              )}

              {selectedDocument.status === 'APPROVED' && (
                <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-[3px] flex items-center gap-3">
                  <div className="h-10 w-10 rounded-[3px] bg-emerald-600 text-white flex items-center justify-center shrink-0">
                    <ShieldCheck className="h-6 w-6" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-emerald-900 uppercase">
                      Hồ Sơ Đã Hoàn Tất Toàn Bộ Quy Trình Ký Duyệt & Đóng Dấu Điện Tử
                    </h4>
                    <p className="text-[11px] text-emerald-700 mt-0.5">
                      Văn bản đã có đầy đủ giá trị pháp lý nội bộ theo quy định của Ban Giám đốc Công ty Trung Hải.
                    </p>
                  </div>
                </div>
              )}

            </div>
          )}

          {/* DMS Attachments Tab */}
          {activeTab === 'ATTACHMENTS' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-slate-800">
                    Danh Sách File Đính Kèm & Bản Scan Lưu Trữ (DMS)
                  </h4>
                  <p className="text-xs text-slate-500">
                    Tất cả tài liệu scan hợp đồng, báo giá, tờ trình được lưu trữ trên S3 / Supabase Storage
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {selectedDocument.attachments.map((att) => (
                  <div
                    key={att.id}
                    className="p-3.5 bg-white border border-slate-200 rounded-[3px] flex items-start justify-between gap-3 hover:border-brand-blue hover:shadow-sm transition-all group"
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="p-2 bg-slate-100 group-hover:bg-brand-blue-light rounded-[3px] text-brand-blue shrink-0">
                        <FileText className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-800 truncate" title={att.name}>
                          {att.name}
                        </p>
                        <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-500">
                          <span>{(att.size / (1024 * 1024)).toFixed(2)} MB</span>
                          <span>•</span>
                          <span>{formatDate(att.uploadedAt)}</span>
                          {att.isScan && (
                            <span className="px-1.5 py-0.2 bg-brand-red/10 text-brand-red font-bold rounded-[3px]">
                              Bản scan
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => setPreviewAttachment(att)}
                        title="Xem trước tài liệu"
                        className="p-1.5 text-slate-500 hover:text-brand-blue hover:bg-slate-100 rounded-[3px] transition-colors"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => {
                          if (att.url && att.url !== '#') {
                            const a = document.createElement('a');
                            a.href = att.url;
                            a.download = att.name;
                            document.body.appendChild(a);
                            a.click();
                            document.body.removeChild(a);
                          } else {
                            alert(`Đang tải tệp tài liệu: ${att.name}`);
                          }
                        }}
                        title="Tải về"
                        className="p-1.5 text-slate-500 hover:text-brand-blue hover:bg-slate-100 rounded-[3px] transition-colors"
                      >
                        <Download className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* PDF & Document Viewer Modal */}
              {previewAttachment && (
                <PDFViewerModal
                  attachment={previewAttachment}
                  documentCode={selectedDocument.code}
                  documentTitle={selectedDocument.title}
                  onClose={() => setPreviewAttachment(null)}
                />
              )}
            </div>
          )}

          {/* Audit History Tab */}
          {activeTab === 'AUDIT' && (
            <div className="space-y-4">
              <h4 className="text-xs font-bold text-slate-800">
                Toàn Bộ Lịch Sử Thao Tác & Trình Ký (Audit Trail)
              </h4>

              <div className="relative border-l-2 border-slate-200 ml-4 space-y-4 py-2">
                {selectedDocument.auditLogs.map((log) => (
                  <div key={log.id} className="relative pl-6">
                    {/* Dot on timeline */}
                    <div className="absolute -left-[9px] top-1 h-4 w-4 rounded-full bg-white border-2 border-brand-blue flex items-center justify-center">
                      <span className="h-1.5 w-1.5 rounded-full bg-brand-blue" />
                    </div>

                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-[3px]">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-bold text-slate-900">
                          {log.actorName} <span className="text-slate-500 font-normal">({log.actorTitle})</span>
                        </p>
                        <span className="text-[10px] text-slate-500 font-mono">
                          {formatDate(log.timestamp)}
                        </span>
                      </div>

                      <p className="text-xs text-brand-blue font-semibold mt-0.5">
                        {log.action === 'CREATE' ? 'Khởi tạo hồ sơ' :
                         log.action === 'APPROVE' ? 'Phê duyệt & Ký điện tử' :
                         log.action === 'REJECT' ? 'Từ chối hồ sơ' :
                         log.action === 'REQUEST_INFO' ? 'Yêu cầu bổ sung' : 'Cập nhật'}
                      </p>

                      {log.comment && (
                        <p className="text-[11px] text-slate-600 mt-1.5 bg-white p-2 border border-slate-200 rounded-[3px] italic">
                          "{log.comment}"
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          <div className="text-[11px] text-slate-500">
            Mã hệ thống: <span className="font-mono">{selectedDocument.id}</span>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-[3px] hover:bg-slate-100 transition-colors"
          >
            Đóng
          </button>
        </div>

      </div>
    </div>
  );
};
