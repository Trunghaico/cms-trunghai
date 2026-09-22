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
  Share2,
  RotateCcw,
  Edit3,
  Undo2,
  Zap,
  UserCheck,
  Trash2
} from 'lucide-react';
import { useDocument } from '../../context/DocumentContext';
import { ApprovalTimeline } from './ApprovalTimeline';
import { DigitalSignaturePad } from './DigitalSignaturePad';
import { formatCurrency, formatDate } from '../../lib/storage';
import { PDFViewerModal } from '../common/PDFViewerModal';
import { ResubmitDocumentModal } from './ResubmitDocumentModal';
import { Attachment } from '../../types';
import { getSecureFileUrl } from '../../lib/nasStorageService';
import { isUserApproverForStep, canUserOverseeAllDocuments, canUserPerformInternalCheck, canUserPerformManagerApproval } from '../../lib/permissions';

export const DocumentDetailModal: React.FC = () => {
  const { 
    selectedDocument, 
    setSelectedDocument, 
    activeUser, 
    performInternalCheck,
    approveStep, 
    rejectDocument, 
    requestAdditionalInfo,
    returnOverdueDocument,
    deleteDocument,
    hasPermission 
  } = useDocument();

  const [activeTab, setActiveTab] = useState<'DETAILS' | 'ATTACHMENTS' | 'AUDIT'>('DETAILS');
  const [approvalAction, setApprovalAction] = useState<'NONE' | 'APPROVE' | 'INTERNAL_CHECK' | 'REJECT' | 'REQUEST_INFO'>('NONE');
  const [commentText, setCommentText] = useState('');
  const [signatureData, setSignatureData] = useState<string>('STAMP_OFFICIAL');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [previewAttachment, setPreviewAttachment] = useState<Attachment | null>(null);
  const [isResubmitModalOpen, setIsResubmitModalOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [returnOverdueReason, setReturnOverdueReason] = useState('');
  const [isReturningOverdue, setIsReturningOverdue] = useState(false);

  if (!selectedDocument || !activeUser) return null;

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      setIsClosing(false);
      setSelectedDocument(null);
    }, 200);
  };

  const currentStep = selectedDocument.steps[selectedDocument.currentStepIndex];
  
  const canPrint = hasPermission('doc.print_export');
  const isCreator = selectedDocument ? selectedDocument.creatorId === activeUser.id : false;
  const canUserResubmit = selectedDocument?.status === 'ADDITIONAL_REQ' && (isCreator || activeUser.role === 'ADMIN');
  const canDelete = hasPermission('doc.delete') && (isCreator || activeUser.role === 'ADMIN' || hasPermission('approval.override'));

  const latestRequestInfoLog = selectedDocument 
    ? [...selectedDocument.auditLogs].reverse().find(l => l.action === 'REQUEST_INFO') 
    : null;

  // Kiểm tra xem người dùng hiện tại có thẩm quyền duyệt bước này không
  const isApproverForCurrentStep = currentStep ? isUserApproverForStep(activeUser, currentStep) : false;

  const isDeptStep = Boolean(currentStep?.requiresInternalCheck || (!currentStep?.approverId && currentStep?.department));
  const isNeedingInternalCheck = Boolean(isDeptStep && !currentStep?.isInternalChecked);
  const isInternalChecked = Boolean(currentStep?.isInternalChecked);

  const canUserDoInternalCheck = currentStep ? canUserPerformInternalCheck(activeUser, currentStep) : false;
  const canUserDoManagerApprove = currentStep ? canUserPerformManagerApproval(activeUser, currentStep) : false;

  const previousStep = (selectedDocument && selectedDocument.currentStepIndex > 0) 
    ? selectedDocument.steps[selectedDocument.currentStepIndex - 1] 
    : null;

  const isPreviousStepInternalCheck = Boolean(
    previousStep && 
    previousStep.status === 'APPROVED' && 
    (previousStep.isInternalCheck || previousStep.stepType === 'INTERNAL_CHECK' || previousStep.title?.toLowerCase().includes('kiểm tra nội bộ'))
  );

  const canUserApprove = 
    selectedDocument.status !== 'APPROVED' &&
    selectedDocument.status !== 'REJECTED' &&
    selectedDocument.status !== 'ADDITIONAL_REQ' &&
    currentStep &&
    currentStep.status === 'CURRENT' &&
    isApproverForCurrentStep;

  // 1. Phê duyệt chính thức & ký số (Hoàn tất bước và chuyển tiếp)
  const handleApproveSubmit = () => {
    setIsSubmitting(true);
    approveStep(selectedDocument.id, commentText, signatureData);
    setIsSubmitting(false);
    setApprovalAction('NONE');
    setCommentText('');
  };

  // 2. Kiểm tra nội bộ ban (Chuyên viên thẩm tra và ghi chú)
  const handleInternalCheckSubmit = () => {
    setIsSubmitting(true);
    performInternalCheck(selectedDocument.id, commentText, signatureData);
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

  const isCurrentStepOverdue = Boolean(
    selectedDocument.status !== 'APPROVED' &&
    selectedDocument.status !== 'REJECTED' &&
    selectedDocument.status !== 'ADDITIONAL_REQ' &&
    currentStep &&
    currentStep.status === 'CURRENT' &&
    (selectedDocument.isOverdue || currentStep.isOverdue || (currentStep.deadline && new Date().getTime() > new Date(currentStep.deadline).getTime()))
  );

  const canReturnOverdue = isCurrentStepOverdue && (
    activeUser.role === 'ADMIN' ||
    activeUser.role === 'DIRECTOR' ||
    selectedDocument.creatorId === activeUser.id ||
    canUserOverseeAllDocuments(activeUser)
  );

  const handleReturnOverdueSubmit = () => {
    const reason = returnOverdueReason.trim() || `Phòng ${currentStep?.department || ''} xử lý quá hạn cam kết SLA.`;
    returnOverdueDocument(selectedDocument.id, reason);
    setIsReturningOverdue(false);
    setReturnOverdueReason('');
  };

  return (
    <div 
      className={`fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto ${
        isClosing ? 'animate-backdrop-out pointer-events-none' : 'animate-backdrop-in'
      }`}
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <div 
        className={`bg-white/95 backdrop-blur-xl rounded-3xl max-w-5xl w-full shadow-2xl border border-slate-200/80 flex flex-col max-h-[92vh] overflow-hidden ${
          isClosing ? 'animate-modal-out' : 'animate-modal-in'
        }`}
      >
        
        {/* Header Bar */}
        <div className="px-6 py-5 bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-950 text-white flex items-center justify-between shrink-0 relative overflow-hidden">
          <div className="absolute top-0 right-1/4 w-36 h-36 bg-cyan-500/10 rounded-full blur-2xl pointer-events-none" />
          <div className="flex items-center gap-3.5 relative z-10">
            <div className="h-10 w-10 rounded-2xl bg-gradient-to-tr from-brand-blue to-cyan-500 flex items-center justify-center shadow-glow-blue border border-white/20">
              <FileCheck2 className="h-5 w-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono font-black text-xs bg-brand-red px-2.5 py-0.5 rounded-full text-white shadow-xs">
                  {selectedDocument.code}
                </span>
                <span className="text-xs text-blue-200/90 font-semibold px-2 py-0.5 bg-white/10 rounded-full">
                  {selectedDocument.category}
                </span>
                {selectedDocument.priority === 'VERY_URGENT' && (
                  <span className="text-[10px] font-bold bg-amber-400 text-slate-950 px-2 py-0.5 rounded-full flex items-center gap-1 shadow-glow-amber">
                    <Flame className="h-3 w-3" />
                    Hỏa tốc
                  </span>
                )}
                {isCurrentStepOverdue && (
                  <span className="text-[10px] font-bold bg-red-500 text-white px-2 py-0.5 rounded-full flex items-center gap-1 shadow-glow-red animate-pulse">
                    <AlertTriangle className="h-3 w-3" />
                    Quá hạn SLA ({currentStep?.department})
                  </span>
                )}
              </div>
              <h2 className="text-sm sm:text-base font-bold text-white mt-1.5 line-clamp-1">
                {selectedDocument.title}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2 relative z-10">
            <button
              type="button"
              onClick={handlePrint}
              title="In phiếu trình ký"
              className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-colors cursor-pointer"
            >
              <Printer className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={handleClose}
              className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-colors cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Navigation Sub-Tabs */}
        <div className="flex items-center justify-between px-6 bg-slate-50/90 border-b border-slate-200/80 text-xs font-semibold shrink-0 gap-2 flex-wrap pt-2">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('DETAILS')}
              className={`px-4 py-2.5 rounded-t-xl border-b-2 transition-all cursor-pointer ${
                activeTab === 'DETAILS'
                  ? 'border-brand-blue text-brand-blue font-bold bg-white shadow-xs'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              Thông tin & Luồng phê duyệt (BPM)
            </button>
            <button
              onClick={() => setActiveTab('ATTACHMENTS')}
              className={`px-4 py-2.5 rounded-t-xl border-b-2 flex items-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'ATTACHMENTS'
                  ? 'border-brand-blue text-brand-blue font-bold bg-white shadow-xs'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>Hồ sơ scan & Đính kèm (DMS)</span>
              <span className="px-2 py-0.5 text-[10px] bg-slate-200 text-slate-700 rounded-full font-bold">
                {selectedDocument.attachments.length}
              </span>
            </button>
            <button
              onClick={() => setActiveTab('AUDIT')}
              className={`px-4 py-2.5 rounded-t-xl border-b-2 flex items-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'AUDIT'
                  ? 'border-brand-blue text-brand-blue font-bold bg-white shadow-xs'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              <History className="h-3.5 w-3.5" />
              <span>Nhật ký xử lý</span>
            </button>
          </div>

          <div className="flex items-center gap-2 pb-2">
            <span className="text-[11px] text-slate-500">Trạng thái:</span>
            <span className={`px-2.5 py-1 text-xs font-bold rounded-full ${
              selectedDocument.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-800' :
              selectedDocument.status === 'REJECTED' ? 'bg-red-100 text-red-800' :
              selectedDocument.status === 'ADDITIONAL_REQ' ? 'bg-amber-100 text-amber-900' :
              selectedDocument.status === 'IN_PROGRESS' ? 'bg-blue-100 text-brand-blue' :
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
        <div className="p-6 overflow-y-auto space-y-6 flex-1 custom-scrollbar text-xs text-slate-800">
          
          {activeTab === 'DETAILS' && (
            <div className="space-y-6">

              {/* Alert Banner: CẢNH BÁO QUÁ HẠN SLA */}
              {isCurrentStepOverdue && (
                <div className="p-5 bg-gradient-to-r from-red-50 to-rose-50/70 border border-red-300 rounded-2xl shadow-sm space-y-3 animate-fade-in">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-red-200/80 pb-2.5">
                    <div className="flex items-center gap-2.5 text-red-950 font-bold text-xs uppercase tracking-wider">
                      <div className="h-7 w-7 rounded-xl bg-red-600 text-white flex items-center justify-center shrink-0 shadow-glow-red animate-pulse">
                        <AlertTriangle className="h-4 w-4" />
                      </div>
                      <span>Cảnh Báo Vi Phạm Thời Gian Phê Duyệt (SLA)</span>
                    </div>
                    <span className="text-[11px] font-bold text-red-800 bg-red-100 px-2.5 py-0.5 rounded-full border border-red-300">
                      Phòng: {currentStep?.department} • SLA: {currentStep?.slaHours || 8}h
                    </span>
                  </div>

                  <p className="text-xs text-red-900 leading-relaxed font-medium">
                    Hồ sơ đang bị tắc nghẽn tại <strong>Bước {selectedDocument.currentStepIndex + 1} ({currentStep?.title})</strong> do <strong>Phòng {currentStep?.department}</strong> chưa xử lý đúng thời hạn cam kết.
                    {currentStep?.overdueAction === 'AUTO_APPROVE' ? ' Hệ thống sẽ tự động duyệt vượt cấp theo chính sách định sẵn.' : ' Ban Lãnh đạo hoặc Người lập có thể chỉ đạo hoặc Trả hồ sơ.'}
                  </p>

                  {canReturnOverdue && (
                    <div className="pt-2 border-t border-red-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="text-[11px] text-red-800 font-semibold">
                        Bạn có thẩm quyền Ban Lãnh đạo / Người lập để Trả hồ sơ ngay.
                      </div>
                      {!isReturningOverdue ? (
                        <button
                          type="button"
                          onClick={() => setIsReturningOverdue(true)}
                          className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold text-xs uppercase rounded-xl shadow transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
                        >
                          <Undo2 className="w-4 h-4" />
                          <span>Trả Hồ Sơ Do Quá Hạn</span>
                        </button>
                      ) : (
                        <div className="w-full space-y-2 bg-white p-3.5 rounded-2xl border border-red-300 shadow-2xs">
                          <label className="block text-xs font-bold text-red-900">
                            Lý do trả hồ sơ vi phạm SLA:
                          </label>
                          <input
                            type="text"
                            value={returnOverdueReason}
                            onChange={(e) => setReturnOverdueReason(e.target.value)}
                            placeholder={`Phòng ${currentStep?.department} xử lý quá hạn SLA cam kết...`}
                            className="w-full px-3 py-2 text-xs border border-red-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/30"
                          />
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={handleReturnOverdueSubmit}
                              className="px-3.5 py-1.5 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl cursor-pointer"
                            >
                              Xác Nhận Trả Hồ Sơ
                            </button>
                            <button
                              type="button"
                              onClick={() => setIsReturningOverdue(false)}
                              className="px-3.5 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs rounded-xl cursor-pointer"
                            >
                              Hủy
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
              
              {/* Alert Banner: Yêu cầu bổ sung thông tin */}
              {selectedDocument.status === 'ADDITIONAL_REQ' && (
                <div className="p-5 bg-gradient-to-r from-amber-50 to-yellow-50/70 border border-amber-300/80 rounded-2xl shadow-xs space-y-3.5 animate-fade-in">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-amber-200/80 pb-2.5">
                    <div className="flex items-center gap-2.5 text-amber-950 font-bold text-xs uppercase tracking-wider">
                      <div className="h-7 w-7 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-glow-amber">
                        <AlertTriangle className="h-4 w-4" />
                      </div>
                      <span>Hồ Sơ Đang Có Yêu Cầu Bổ Sung Thông Tin / Tài Liệu</span>
                    </div>
                    {latestRequestInfoLog && (
                      <span className="text-[11px] text-amber-800 font-medium">
                        Thời gian: {formatDate(latestRequestInfoLog.timestamp)}
                      </span>
                    )}
                  </div>

                  {latestRequestInfoLog && (
                    <div className="text-xs text-slate-800 space-y-1.5">
                      <p className="font-semibold text-slate-700">
                        Cấp yêu cầu: <span className="text-brand-blue font-bold">{latestRequestInfoLog.actorName}</span> ({latestRequestInfoLog.actorTitle})
                      </p>
                      <div className="bg-white p-3.5 rounded-xl border border-amber-200 text-slate-800 italic leading-relaxed shadow-2xs font-medium">
                        "{latestRequestInfoLog.comment?.replace(/^Yêu cầu bổ sung tài liệu\/thông tin:\s*/i, '') || selectedDocument.description}"
                      </div>
                    </div>
                  )}

                  {canUserResubmit ? (
                    <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-amber-100/70 p-3.5 rounded-2xl border border-amber-200/80">
                      <div className="text-xs text-amber-950">
                        <p className="font-bold">Bạn là người lập hồ sơ / quản trị viên.</p>
                        <p className="text-[11px] text-amber-800">
                          Vui lòng cập nhật thông tin, đính kèm thêm tài liệu bổ sung và gửi lại để tiếp tục quy trình xét duyệt.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsResubmitModalOpen(true)}
                        className="px-4 py-2.5 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow transition-all flex items-center justify-center gap-2 shrink-0 cursor-pointer"
                      >
                        <RotateCcw className="h-4 w-4" />
                        <span>Bổ Sung Hồ Sơ & Gửi Lại</span>
                      </button>
                    </div>
                  ) : (
                    <div className="text-[11px] text-amber-800 italic">
                      Hồ sơ đã được trả về cho người lập ({selectedDocument.creatorName}) để bổ sung theo yêu cầu trên.
                    </div>
                  )}
                </div>
              )}

              {/* Document Metadata Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-5 bg-gradient-to-br from-slate-50 to-indigo-50/20 border border-slate-200/80 rounded-2xl shadow-2xs">
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
                <div className="p-3.5 bg-slate-50/80 border border-slate-200/80 rounded-2xl flex items-center gap-3">
                  <span className="text-[11px] font-bold text-slate-600 shrink-0">Người theo dõi (Cc):</span>
                  <div className="flex flex-wrap gap-2">
                    {selectedDocument.ccUsers.map((cc) => (
                      <span
                        key={cc.id}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white border border-slate-200 rounded-full text-[11px] text-slate-700 font-semibold shadow-2xs"
                      >
                        {cc.avatar && <img src={cc.avatar} alt={cc.name} className="h-4 w-4 rounded-full object-cover" />}
                        <span>{cc.name}</span>
                        <span className="text-slate-400 text-[10px] font-normal">({cc.roleTitle})</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Description / Quill Content Box */}
              <div>
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <FileText className="h-3.5 w-3.5 text-brand-blue" />
                  <span>Nội dung tờ trình / Căn cứ phê duyệt</span>
                </h4>
                <div className="p-5 bg-white border border-slate-200/80 rounded-2xl text-xs text-slate-800 leading-relaxed max-h-72 overflow-y-auto shadow-2xs">
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
              <div className="bg-slate-50/50 p-4 border border-slate-200/70 rounded-2xl">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <ShieldCheck className="h-3.5 w-3.5 text-brand-blue" />
                    <span>Tiến trình luân chuyển & Chữ ký số các cấp (BPM Routing)</span>
                  </h4>
                  <span className="text-xs font-bold text-brand-blue bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200">
                    Bước {selectedDocument.currentStepIndex + 1} / {selectedDocument.steps.length}
                  </span>
                </div>
                <ApprovalTimeline
                  steps={selectedDocument.steps}
                  currentStepIndex={selectedDocument.currentStepIndex}
                  documentStatus={selectedDocument.status}
                />
              </div>

              {/* Internal Check Verification Banner for Manager */}
              {isInternalChecked && selectedDocument.status !== 'APPROVED' && (
                <div className="p-4 bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-200/90 rounded-2xl flex items-center gap-3.5 text-xs text-indigo-950 shadow-2xs">
                  <div className="h-8 w-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-glow-blue">
                    <CheckCircle2 className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="font-bold text-indigo-900">
                      ✓ Hồ sơ đã qua kiểm tra nội bộ: <span className="text-indigo-700 underline font-semibold">{currentStep?.checkedByName || previousStep?.checkedByName || 'Đã kiểm tra'}</span>
                      {currentStep?.checkedAt ? ` (${formatDate(currentStep.checkedAt)})` : ''}
                    </p>
                    <p className="text-[11px] text-indigo-700 mt-0.5 leading-relaxed">
                      {currentStep?.checkedComment ? (
                        <>Ghi chú kiểm tra: <em>"{currentStep.checkedComment}"</em> • Chuyển cấp Quản lý ({currentStep?.approverTitle || currentStep?.department}) phê duyệt.</>
                      ) : (
                        `Nội bộ phòng ban đã xác nhận hồ sơ đầy đủ căn cứ, hồ sơ hợp lệ và chuyển cấp quản lý (${currentStep?.department || currentStep?.approverName}) xem xét phê duyệt.`
                      )}
                    </p>
                  </div>
                </div>
              )}

              {/* Approval Actions Box for Authorized User */}
              {canUserApprove && (
                <div className={`p-5 rounded-2xl space-y-4 border ${
                  !canUserDoManagerApprove && canUserDoInternalCheck 
                    ? 'bg-gradient-to-br from-indigo-50/90 to-blue-50/70 border-indigo-300 shadow-sm' 
                    : 'bg-gradient-to-br from-blue-50/90 to-indigo-50/70 border-brand-blue/40 shadow-sm'
                }`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`h-9 w-9 rounded-2xl text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs ${
                        !canUserDoManagerApprove && canUserDoInternalCheck ? 'bg-indigo-600 shadow-glow-blue' : 'bg-brand-blue shadow-glow-blue'
                      }`}>
                        {!canUserDoManagerApprove && canUserDoInternalCheck ? <UserCheck className="h-5 w-5" /> : '✓'}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className={`text-sm font-bold ${
                            !canUserDoManagerApprove && canUserDoInternalCheck ? 'text-indigo-950' : 'text-brand-blue'
                          }`}>
                            {canUserDoManagerApprove
                              ? `Phê Duyệt & Ký Số - Bước ${selectedDocument.currentStepIndex + 1}: ${currentStep?.title}`
                              : `Kiểm Tra Nội Bộ Ban - Bước ${selectedDocument.currentStepIndex + 1}: ${currentStep?.title}`}
                          </h4>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            !canUserDoManagerApprove && canUserDoInternalCheck 
                              ? 'bg-indigo-200/80 text-indigo-900' 
                              : 'bg-blue-200/80 text-brand-blue'
                          }`}>
                            {canUserDoManagerApprove ? `Quản lý ${currentStep?.department}` : `Nội bộ ${currentStep?.department}`}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 mt-0.5">
                          {canUserDoManagerApprove
                            ? 'Bạn đang đăng nhập với thẩm quyền Quản lý phê duyệt: '
                            : 'Bạn đang đăng nhập với tư cách nhân sự thẩm tra: '}
                          <strong>{activeUser.name}</strong> ({activeUser.roleTitle} - {activeUser.department})
                        </p>
                      </div>
                    </div>
                  </div>

                  {approvalAction === 'NONE' ? (
                    <div className="flex flex-wrap items-center gap-3 pt-2">
                      {/* Nút Phê duyệt & Ký số (Dành cho Quản lý / Lãnh đạo có quyền approve) */}
                      {canUserDoManagerApprove && (
                        <button
                          onClick={() => setApprovalAction('APPROVE')}
                          className="px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-glow-emerald transition-all flex items-center gap-2 cursor-pointer"
                        >
                          <CheckCircle2 className="h-4 w-4" />
                          <span>Phê Duyệt & Ký Số</span>
                        </button>
                      )}

                      {/* Nút Kiểm tra nội bộ (Dành cho nhân sự có quyền internal_check khi bước chưa qua kiểm tra) */}
                      {isNeedingInternalCheck && canUserDoInternalCheck && (
                        <button
                          onClick={() => setApprovalAction('INTERNAL_CHECK')}
                          className="px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-glow-blue transition-all flex items-center gap-2 cursor-pointer"
                        >
                          <UserCheck className="h-4 w-4" />
                          <span>{canUserDoManagerApprove ? 'Ghi Nhận Đã Kiểm Tra (Nội Bộ)' : '✓ Xác Nhận Đã Kiểm Tra (Chuyển Quản Lý Duyệt)'}</span>
                        </button>
                      )}

                      <button
                        onClick={() => setApprovalAction('REQUEST_INFO')}
                        className="px-4 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow transition-all flex items-center gap-2 cursor-pointer"
                      >
                        <MessageSquare className="h-4 w-4" />
                        <span>Yêu Cầu Bổ Sung</span>
                      </button>

                      <button
                        onClick={() => setApprovalAction('REJECT')}
                        className="px-4 py-2.5 bg-gradient-to-r from-brand-red to-red-700 hover:from-brand-red-dark hover:to-red-800 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow transition-all flex items-center gap-2 cursor-pointer"
                      >
                        <XCircle className="h-4 w-4" />
                        <span>{canUserDoManagerApprove ? 'Từ Chối Duyệt' : 'Yêu Cầu Sửa / Từ Chối'}</span>
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-4 pt-2 animate-in fade-in duration-150">
                      {(approvalAction === 'APPROVE' || approvalAction === 'INTERNAL_CHECK') && (
                        <div>
                          <p className="text-xs font-bold text-slate-700 mb-2">
                            {approvalAction === 'INTERNAL_CHECK'
                              ? 'Xác nhận chữ ký kiểm tra nội bộ ban của bạn:'
                              : 'Xác thực chữ ký số điện tử của bạn:'}
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
                          {approvalAction === 'INTERNAL_CHECK' ? (
                            'Ý kiến kiểm tra nội bộ / Ghi chú cho Quản lý ban duyệt (Không bắt buộc):'
                          ) : approvalAction === 'APPROVE' ? (
                            'Ý kiến phê duyệt / Ghi chú (Không bắt buộc):'
                          ) : approvalAction === 'REJECT' ? (
                            'Lý do từ chối hồ sơ (Bắt buộc):'
                          ) : (
                            'Nội dung yêu cầu bổ sung hồ sơ/tài liệu (Bắt buộc):'
                          )}
                        </label>
                        <textarea
                          rows={3}
                          value={commentText}
                          onChange={(e) => setCommentText(e.target.value)}
                          placeholder={
                            approvalAction === 'INTERNAL_CHECK' ? (
                              'Đã kiểm tra đầy đủ danh mục hồ sơ, số liệu và các tài liệu đính kèm, kính chuyển Quản lý ban phê duyệt...'
                            ) : approvalAction === 'APPROVE' ? (
                              'Đã kiểm tra kỹ các điều khoản, đồng ý phê duyệt...'
                            ) : approvalAction === 'REJECT' ? (
                              'Nhập lý do từ chối cụ thể để người lập hồ sơ nắm rõ...'
                            ) : (
                              'Nêu rõ cần bổ sung bảng báo giá, phụ lục hợp đồng, chứng từ...'
                            )
                          }
                          className="w-full p-3 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue bg-white"
                        />
                      </div>

                      <div className="flex items-center gap-2.5 pt-1">
                        {approvalAction === 'APPROVE' && (
                          <button
                            onClick={handleApproveSubmit}
                            disabled={isSubmitting}
                            className="px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-glow-emerald transition-all flex items-center gap-2 cursor-pointer"
                          >
                            <ShieldCheck className="h-4 w-4" />
                            <span>Xác Nhận Ký Số & Chuyển Bước Tiếp</span>
                          </button>
                        )}

                        {approvalAction === 'INTERNAL_CHECK' && (
                          <button
                            onClick={handleInternalCheckSubmit}
                            disabled={isSubmitting}
                            className="px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-glow-blue transition-all flex items-center gap-2 cursor-pointer"
                          >
                            <UserCheck className="h-4 w-4" />
                            <span>Xác Nhận Đã Kiểm Tra & Chuyển Quản Lý</span>
                          </button>
                        )}

                        {approvalAction === 'REJECT' && (
                          <button
                            onClick={handleRejectSubmit}
                            disabled={isSubmitting}
                            className="px-4 py-2.5 bg-gradient-to-r from-brand-red to-red-700 hover:from-brand-red-dark hover:to-red-800 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow transition-all flex items-center gap-2 cursor-pointer"
                          >
                            <XCircle className="h-4 w-4" />
                            <span>Xác Nhận Từ Chối Hồ Sơ</span>
                          </button>
                        )}

                        {approvalAction === 'REQUEST_INFO' && (
                          <button
                            onClick={handleRequestInfoSubmit}
                            disabled={isSubmitting}
                            className="px-4 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow transition-all flex items-center gap-2 cursor-pointer"
                          >
                            <MessageSquare className="h-4 w-4" />
                            <span>Gửi Yêu Cầu Bổ Sung Cho Người Trình</span>
                          </button>
                        )}

                        <button
                          onClick={() => {
                            setApprovalAction('NONE');
                            setCommentText('');
                          }}
                          className="px-3.5 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs rounded-xl transition-colors cursor-pointer"
                        >
                          Hủy
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Status Banner when user is not the current approver */}
              {!canUserApprove && selectedDocument.status !== 'APPROVED' && selectedDocument.status !== 'REJECTED' && selectedDocument.status !== 'ADDITIONAL_REQ' && (
                <div className="p-4 bg-gradient-to-r from-amber-50 to-yellow-50/60 border border-amber-200 rounded-2xl flex items-center gap-2.5 text-xs text-amber-900">
                  <Clock className="h-4 w-4 text-amber-600 shrink-0" />
                  <span>
                    Hồ sơ đang chờ xử lý tại <strong>Bước {selectedDocument.currentStepIndex + 1}: {currentStep?.title || currentStep?.approverTitle} ({currentStep?.department || currentStep?.approverName})</strong>.
                    {currentStep?.department ? (
                      isNeedingInternalCheck
                        ? ` Mọi nhân sự có quyền kiểm tra nội bộ hoặc Cấp Quản lý thuộc ${currentStep.department} đều có thể vào xử lý.`
                        : ` Cấp Quản lý có thẩm quyền thuộc ${currentStep.department} đang xem xét ký số phê duyệt.`
                    ) : ''}
                  </span>
                </div>
              )}

              {selectedDocument.status === 'APPROVED' && (
                <div className="p-5 bg-gradient-to-r from-emerald-50 to-teal-50/60 border border-emerald-300 rounded-2xl flex items-center gap-3.5 shadow-2xs">
                  <div className="h-10 w-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-glow-emerald">
                    <ShieldCheck className="h-6 w-6" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-emerald-900 uppercase">
                      Hồ Sơ Đã Hoàn Tất Toàn Bộ Quy Trình Ký Duyệt & Đóng Dấu Điện Tử
                    </h4>
                    <p className="text-[11px] text-emerald-700 mt-0.5 leading-relaxed">
                      Văn bản đã có đầy đủ giá trị pháp lý nội bộ theo quy định của Ban Giám đốc Công ty Trung Hải.
                    </p>
                  </div>
                </div>
              )}

            </div>
          )}

          {/* Attachments Tab */}
          {activeTab === 'ATTACHMENTS' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-800 flex items-center gap-2">
                  <Paperclip className="h-4 w-4 text-brand-blue" />
                  <span>Danh Sách Tệp Đính Kèm & Bản Scan ({selectedDocument.attachments.length})</span>
                </h4>
                {canUserResubmit && (
                  <button
                    type="button"
                    onClick={() => setIsResubmitModalOpen(true)}
                    className="px-3.5 py-1.5 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    <span>Bổ Sung Thêm Tệp</span>
                  </button>
                )}
              </div>

              {selectedDocument.attachments.length === 0 ? (
                <div className="p-10 border-2 border-dashed border-slate-300/80 rounded-2xl text-center text-xs text-slate-500 bg-slate-50/50">
                  Không có tài liệu đính kèm.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {selectedDocument.attachments.map((att) => (
                    <div
                      key={att.id}
                      className="p-3.5 bg-slate-50 hover:bg-blue-50/50 border border-slate-200/80 rounded-2xl flex items-center justify-between gap-3 transition-all hover:shadow-sm"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="h-9 w-9 rounded-xl bg-brand-blue/10 text-brand-blue flex items-center justify-center shrink-0">
                          <FileText className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-800 truncate" title={att.name}>
                            {att.name}
                          </p>
                          <p className="text-[10px] text-slate-500 mt-0.5">
                            {(att.size / 1024).toFixed(1)} KB • {formatDate(att.uploadedAt)}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => setPreviewAttachment(att)}
                          className="p-2 text-slate-600 hover:text-brand-blue hover:bg-white rounded-xl border border-transparent hover:border-slate-200 transition-colors shadow-2xs"
                          title="Xem tài liệu"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <a
                          href={getSecureFileUrl(att.url)}
                          download={att.name}
                          target="_blank"
                          rel="noreferrer"
                          className="p-2 text-slate-600 hover:text-brand-blue hover:bg-white rounded-xl border border-transparent hover:border-slate-200 transition-colors shadow-2xs"
                          title="Tải xuống"
                        >
                          <Download className="h-4 w-4" />
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              )}

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
              <h4 className="text-xs font-bold text-slate-800 flex items-center gap-2">
                <History className="h-4 w-4 text-brand-blue" />
                <span>Toàn Bộ Lịch Sử Thao Tác & Trình Ký (Audit Trail)</span>
              </h4>

              <div className="relative border-l-2 border-slate-200 ml-4 space-y-4 py-2">
                {selectedDocument.auditLogs.map((log) => (
                  <div key={log.id} className="relative pl-6">
                    {/* Dot on timeline */}
                    <div className="absolute -left-[9px] top-1 h-4 w-4 rounded-full bg-white border-2 border-brand-blue flex items-center justify-center shadow-xs">
                      <span className="h-1.5 w-1.5 rounded-full bg-brand-blue" />
                    </div>

                    <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl shadow-2xs space-y-1">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-bold text-slate-900">
                          {log.actorName} <span className="text-slate-500 font-normal">({log.actorTitle})</span>
                        </p>
                        <span className="text-[10px] text-slate-500 font-mono">
                          {formatDate(log.timestamp)}
                        </span>
                      </div>

                      <p className={`text-xs font-semibold ${
                        log.action === 'APPROVE' ? 'text-emerald-700' :
                        log.action === 'REJECT' ? 'text-brand-red' :
                        log.action === 'REQUEST_INFO' ? 'text-amber-700' :
                        log.action === 'RESUBMIT' ? 'text-purple-700' :
                        'text-brand-blue'
                      }`}>
                        {log.action === 'CREATE' ? 'Khởi tạo hồ sơ' :
                         log.action === 'APPROVE' ? 'Phê duyệt & Ký điện tử' :
                         log.action === 'REJECT' ? 'Từ chối hồ sơ' :
                         log.action === 'REQUEST_INFO' ? 'Yêu cầu bổ sung' :
                         log.action === 'RESUBMIT' ? 'Bổ sung & Gửi lại phê duyệt' : 'Cập nhật'}
                      </p>

                      {log.comment && (
                        <p className="text-[11px] text-slate-600 mt-1.5 bg-white p-2.5 border border-slate-200 rounded-xl italic">
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
        <div className="px-6 py-3.5 bg-slate-50/90 border-t border-slate-200/80 flex items-center justify-between shrink-0 rounded-b-3xl">
          <div className="text-[11px] text-slate-500 flex items-center gap-2">
            <span>Mã hệ thống: <span className="font-mono font-bold text-slate-700">{selectedDocument.id}</span></span>
            {canUserResubmit && (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-100 px-2.5 py-0.5 rounded-full">
                <AlertTriangle className="h-3 w-3" />
                Cần bạn bổ sung hồ sơ
              </span>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            {canDelete && (
              <button
                type="button"
                onClick={() => {
                  if (confirm(`Xác nhận xóa vĩnh viễn hồ sơ ${selectedDocument.code}? Hồ sơ sau khi xóa sẽ mất hoàn toàn và không khôi phục lại khi tải lại trang/build dữ liệu.`)) {
                    deleteDocument(selectedDocument.id);
                  }
                }}
                className="px-3.5 py-2 text-xs font-bold text-red-700 bg-red-50 border border-red-200 hover:bg-red-100 hover:text-red-800 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Xóa Hồ Sơ</span>
              </button>
            )}
            {canUserResubmit && (
              <button
                type="button"
                onClick={() => setIsResubmitModalOpen(true)}
                className="px-4 py-2 text-xs font-bold text-white bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 rounded-xl shadow transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Bổ Sung & Gửi Lại</span>
              </button>
            )}
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Đóng
            </button>
          </div>
        </div>

      </div>

      {/* Resubmit Document Modal */}
      {isResubmitModalOpen && (
        <ResubmitDocumentModal
          isOpen={isResubmitModalOpen}
          onClose={() => setIsResubmitModalOpen(false)}
          document={selectedDocument}
        />
      )}
    </div>
  );
};
