import React, { useState, useRef, useEffect } from 'react';
import { 
  X, 
  Trash2, 
  Upload, 
  FileText, 
  AlertCircle,
  Building2,
  Calendar,
  Search,
  FolderKanban,
  ChevronDown,
  Eye
} from 'lucide-react';
import { useDocument } from '../../context/DocumentContext';
import { ApprovalStep, DocumentStatus, Attachment, User } from '../../types';
import { QuillEditor } from '../common/QuillEditor';
import { PDFViewerModal } from '../common/PDFViewerModal';

export const CreateDocumentModal: React.FC = () => {
  const { isCreateModalOpen, setIsCreateModalOpen, createDocument, activeUser, users } = useDocument();

  // 1. Loại hồ sơ
  const [category, setCategory] = useState('Hợp đồng kinh tế');
  const [code, setCode] = useState(`HĐ-2026/TH-${Math.floor(100 + Math.random() * 900)}`);
  const [previewAttachment, setPreviewAttachment] = useState<Attachment | null>(null);
  
  // 2. Tên hồ sơ
  const [title, setTitle] = useState('');
  
  // 3. Dự án
  const [project, setProject] = useState('');
  
  // 4. Phòng ban
  const [department, setDepartment] = useState(activeUser?.department || 'Phòng Kỹ thuật & Dự án');
  
  // 5. Người xét duyệt (Approval Steps) - Mặc định rỗng, người dùng tự chọn
  const [selectedApprovers, setSelectedApprovers] = useState<{ user: User; title: string; slaHours: number }[]>([]);
  const [approverSearchQuery, setApproverSearchQuery] = useState('');
  const [isApproverDropdownOpen, setIsApproverDropdownOpen] = useState(false);
  const approverSearchRef = useRef<HTMLDivElement>(null);

  // 6. Người theo dõi (Cc) - Mặc định rỗng
  const [selectedCcUsers, setSelectedCcUsers] = useState<User[]>([]);
  const [ccSearchQuery, setCcSearchQuery] = useState('');
  const [isCcDropdownOpen, setIsCcDropdownOpen] = useState(false);
  const ccSearchRef = useRef<HTMLDivElement>(null);

  // 7. Thời hạn duyệt mong muốn
  const [desiredDeadline, setDesiredDeadline] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 3);
    return d.toISOString().split('T')[0];
  });

  // 8. Nội dung (Quill.js 2.0)
  const [contentHtml, setContentHtml] = useState('');

  // 9. Tệp đính kèm
  const [attachments, setAttachments] = useState<Attachment[]>([]);

  // State management
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Handle outside clicks for search dropdowns
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (approverSearchRef.current && !approverSearchRef.current.contains(e.target as Node)) {
        setIsApproverDropdownOpen(false);
      }
      if (ccSearchRef.current && !ccSearchRef.current.contains(e.target as Node)) {
        setIsCcDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!isCreateModalOpen || !activeUser) return null;

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      setIsClosing(false);
      setIsCreateModalOpen(false);
      setErrorMsg('');
    }, 200);
  };

  const handleCategoryChange = (newCat: string) => {
    setCategory(newCat);
    const prefix = newCat.includes('Hợp đồng') ? 'HĐ' :
                   newCat.includes('Tờ trình') ? 'TTr' :
                   newCat.includes('thanh toán') ? 'BB' : 'VB';
    setCode(`${prefix}-2026/TH-${Math.floor(100 + Math.random() * 900)}`);
  };

  // Add approver with conflict check
  const handleAddApprover = (user: User) => {
    setErrorMsg('');
    // Không cho phép trùng với người theo dõi (Cc)
    if (selectedCcUsers.some(u => u.id === user.id)) {
      setErrorMsg(`"${user.name}" đang nằm trong danh sách Người theo dõi (Cc). Không thể chọn làm Người xét duyệt.`);
      return;
    }

    // Không cho phép trùng lặp trong danh sách người duyệt
    if (selectedApprovers.some(a => a.user.id === user.id)) {
      setApproverSearchQuery('');
      setIsApproverDropdownOpen(false);
      return;
    }

    const newStepTitle = user.role === 'DIRECTOR' ? 'Phê duyệt & Ký số' :
                         user.role === 'CHIEF_ACCOUNTANT' ? 'Kiểm soát tài chính' :
                         user.role === 'LEGAL_DEPT' ? 'Thẩm định pháp lý' :
                         user.role === 'DEPT_HEAD' ? 'Kiểm tra nghiệp vụ' : 'Xét duyệt hồ sơ';

    setSelectedApprovers(prev => [
      ...prev,
      { user, title: newStepTitle, slaHours: 8 }
    ]);
    setApproverSearchQuery('');
    setIsApproverDropdownOpen(false);
  };

  const handleRemoveApprover = (userId: string) => {
    setSelectedApprovers(prev => prev.filter(a => a.user.id !== userId));
  };

  // Add CC follower with conflict check
  const handleAddCcUser = (user: User) => {
    setErrorMsg('');
    // Không cho phép trùng với người xét duyệt
    if (selectedApprovers.some(a => a.user.id === user.id)) {
      setErrorMsg(`"${user.name}" đang nằm trong danh sách Người xét duyệt. Không thể chọn làm Người theo dõi (Cc).`);
      return;
    }

    // Không cho phép trùng lặp trong danh sách Cc
    if (selectedCcUsers.some(u => u.id === user.id)) {
      setCcSearchQuery('');
      setIsCcDropdownOpen(false);
      return;
    }

    setSelectedCcUsers(prev => [...prev, user]);
    setCcSearchQuery('');
    setIsCcDropdownOpen(false);
  };

  const handleRemoveCcUser = (userId: string) => {
    setSelectedCcUsers(prev => prev.filter(u => u.id !== userId));
  };

  // Attachments handler
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;

    const filesArray = Array.from(fileList);
    filesArray.forEach((file, idx) => {
      const isPdf = file.name.toLowerCase().endsWith('.pdf') || file.type.includes('pdf');
      const isImage = file.type.startsWith('image/') || /\.(png|jpe?g|webp|gif|svg)$/i.test(file.name);

      const reader = new FileReader();
      reader.onload = (event) => {
        const resultUrl = (event.target?.result as string) || URL.createObjectURL(file);
        const newAtt: Attachment = {
          id: `att-upload-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 6)}`,
          name: file.name,
          size: file.size,
          type: file.type || (isPdf ? 'application/pdf' : isImage ? 'image/png' : 'application/octet-stream'),
          url: resultUrl,
          uploadedAt: new Date().toISOString(),
          uploadedBy: activeUser.name,
          isScan: file.name.toLowerCase().includes('scan') || isPdf,
        };
        setAttachments(prev => [...prev, newAtt]);
      };
      reader.readAsDataURL(file);
    });

    e.target.value = '';
  };

  const removeAttachment = (id: string) => {
    setAttachments(prev => prev.filter(a => a.id !== id));
  };

  // Submit Handler
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!title.trim()) {
      setErrorMsg('Vui lòng nhập tên / trích yếu hồ sơ.');
      return;
    }

    if (selectedApprovers.length === 0) {
      setErrorMsg('Vui lòng chọn ít nhất 01 người xét duyệt.');
      return;
    }

    // Build approval steps
    const steps: ApprovalStep[] = selectedApprovers.map((item, idx) => ({
      id: `step-${Date.now()}-${idx}`,
      stepOrder: idx + 1,
      title: item.title,
      approverRole: item.user.role,
      approverId: item.user.id,
      approverName: item.user.name,
      approverTitle: item.user.roleTitle,
      department: item.user.department,
      status: idx === 0 ? 'CURRENT' : 'PENDING',
      slaHours: item.slaHours,
    }));

    setIsSubmitting(true);

    createDocument({
      code,
      title: title.trim(),
      category,
      project: project.trim() || undefined,
      department: department.trim(),
      creatorId: activeUser.id,
      creatorName: activeUser.name,
      creatorTitle: activeUser.roleTitle,
      priority: 'NORMAL',
      status: 'PENDING' as DocumentStatus,
      description: contentHtml.replace(/<[^>]*>?/gm, '').trim().substring(0, 200),
      contentHtml: contentHtml || undefined,
      desiredDeadline: desiredDeadline ? new Date(desiredDeadline).toISOString() : undefined,
      deadline: desiredDeadline ? new Date(desiredDeadline).toISOString() : undefined,
      ccUsers: selectedCcUsers.map(u => ({
        id: u.id,
        name: u.name,
        roleTitle: u.roleTitle,
        department: u.department,
        avatar: u.avatar
      })),
      attachments: attachments.length > 0 ? attachments : [
        {
          id: `att-default-${Date.now()}`,
          name: `${code}_Du_thao_ho_so.pdf`,
          size: 1520000,
          type: 'application/pdf',
          url: '#',
          uploadedAt: new Date().toISOString(),
          uploadedBy: activeUser.name,
          isScan: true,
        }
      ],
      steps,
      currentStepIndex: 0,
    });

    setIsSubmitting(false);
    handleClose();
  };

  // Filtered users for Approver Search
  const filteredApproverCandidates = users.filter(u => {
    if (!approverSearchQuery) return true;
    const q = approverSearchQuery.toLowerCase();
    return (
      u.name.toLowerCase().includes(q) ||
      u.username.toLowerCase().includes(q)
    );
  });

  // Filtered users for CC Search
  const filteredCcCandidates = users.filter(u => {
    if (!ccSearchQuery) return true;
    const q = ccSearchQuery.toLowerCase();
    return (
      u.name.toLowerCase().includes(q) ||
      u.username.toLowerCase().includes(q)
    );
  });

  return (
    <div 
      className={`fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 md:p-6 overflow-y-auto ${
        isClosing ? 'animate-backdrop-out pointer-events-none' : 'animate-backdrop-in'
      }`}
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      {/* Expanded Modal Box: max-w-6xl */}
      <div 
        className={`bg-white rounded-[3px] max-w-6xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[95vh] ${
          isClosing ? 'animate-modal-out' : 'animate-modal-in'
        }`}
      >
        
        {/* Modal Header */}
        <div className="px-6 py-3.5 bg-brand-blue text-white flex items-center justify-between shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono font-bold text-xs bg-brand-red px-2 py-0.5 rounded-[3px] text-white">
                {code}
              </span>
              <h3 className="font-bold text-base">Khởi Tạo Hồ Sơ Trình Ký Mới</h3>
            </div>
            <p className="text-[11px] text-blue-100 mt-0.5">
              Nhập các thông tin luân chuyển, người duyệt, người theo dõi và soạn thảo nội dung
            </p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="text-white/80 hover:text-white p-1 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5 flex-1 text-xs">
          
          {errorMsg && (
            <div className="p-3 bg-red-50 border border-brand-red/30 rounded-[3px] text-xs text-brand-red flex items-start gap-2 animate-shake">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* SECTION 1: CÁC TRƯỜNG THÔNG TIN CƠ BẢN */}
          <div className="space-y-4">
            {/* ROW 1: Loại hồ sơ (1/4), Tên hồ sơ (2/4), Dự án (1/4) */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  1. Loại hồ sơ <span className="text-brand-red">*</span>
                </label>
                <select
                  value={category}
                  onChange={(e) => handleCategoryChange(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-[3px] font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-brand-blue"
                >
                  <option value="Hợp đồng kinh tế">Hợp đồng kinh tế (Mua bán, Dịch vụ)</option>
                  <option value="Tờ trình phê duyệt">Tờ trình phê duyệt (Ngân sách, Kế hoạch)</option>
                  <option value="Hồ sơ thanh toán">Hồ sơ thanh toán (Nghiệm thu, Tạm ứng)</option>
                  <option value="Đề xuất mua sắm">Đề xuất mua sắm vật tư thiết bị</option>
                  <option value="Văn bản nội bộ khác">Văn bản nội bộ khác</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block font-bold text-slate-700 mb-1">
                  2. Tên hồ sơ (Trích yếu) <span className="text-brand-red">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="VD: Hợp đồng cung cấp & tích hợp hệ thống đo lường tự động..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-[3px] font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-brand-blue"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  3. Dự án
                </label>
                <div className="relative">
                  <FolderKanban className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    value={project}
                    onChange={(e) => setProject(e.target.value)}
                    placeholder="VD: Dự án Xi măng Nghi Sơn..."
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-[3px] font-medium focus:bg-white focus:outline-none focus:ring-1 focus:ring-brand-blue"
                  />
                </div>
              </div>
            </div>

            {/* ROW 2: Phòng ban (1/2), Thời hạn duyệt mong muốn (1/2) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  4. Phòng ban <span className="text-brand-red">*</span>
                </label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    placeholder="VD: Phòng Kỹ thuật & Dự án"
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-[3px] font-medium focus:bg-white focus:outline-none focus:ring-1 focus:ring-brand-blue"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  7. Thời hạn duyệt mong muốn <span className="text-brand-red">*</span>
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="date"
                    required
                    value={desiredDeadline}
                    onChange={(e) => setDesiredDeadline(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-[3px] font-medium focus:bg-white focus:outline-none focus:ring-1 focus:ring-brand-blue"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 2: 2 CỘT SONG SONG: NGƯỜI XÉT DUYỆT (Trái) & NGƯỜI THEO DÕI (Phải) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            
            {/* CỘT TRÁI: 5. NGƯỜI XÉT DUYỆT */}
            <div className="p-4 bg-blue-50/40 border border-brand-blue/20 rounded-[3px] space-y-3 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="block font-bold text-brand-blue">
                      5. Người xét duyệt <span className="text-brand-red">*</span>
                    </label>
                    <p className="text-[11px] text-slate-500">
                      Gõ tìm kiếm họ và tên người duyệt theo thứ tự từng bước
                    </p>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 bg-brand-blue text-white rounded-[3px]">
                    {selectedApprovers.length} cấp duyệt
                  </span>
                </div>

                {/* Input Search Autocomplete for Approvers */}
                <div className="relative" ref={approverSearchRef}>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      value={approverSearchQuery}
                      onFocus={() => setIsApproverDropdownOpen(true)}
                      onChange={(e) => {
                        setApproverSearchQuery(e.target.value);
                        setIsApproverDropdownOpen(true);
                      }}
                      placeholder="Gõ để tìm nhanh họ và tên người duyệt..."
                      className="w-full pl-9 pr-8 py-2 text-xs bg-white border border-slate-300 rounded-[3px] focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue font-medium"
                    />
                    <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                  </div>

                  {/* Autocomplete Dropdown: Display ONLY Full Name + Conflict Warnings */}
                  {isApproverDropdownOpen && (
                    <div className="absolute top-full left-0 right-0 mt-1 max-h-48 overflow-y-auto bg-white border border-slate-200 rounded-[3px] shadow-xl z-50 divide-y divide-slate-100 animate-slide-down">
                      {filteredApproverCandidates.length === 0 ? (
                        <div className="p-3 text-center text-slate-400 text-xs">
                          Không tìm thấy người dùng phù hợp
                        </div>
                      ) : (
                        filteredApproverCandidates.map((user) => {
                          const isAlreadyApprover = selectedApprovers.some(a => a.user.id === user.id);
                          const isAlreadyCc = selectedCcUsers.some(u => u.id === user.id);

                          return (
                            <div
                              key={user.id}
                              onClick={() => {
                                if (!isAlreadyApprover && !isAlreadyCc) {
                                  handleAddApprover(user);
                                }
                              }}
                              className={`p-2.5 flex items-center justify-between transition-colors ${
                                isAlreadyApprover || isAlreadyCc 
                                  ? 'bg-slate-50 cursor-not-allowed opacity-60' 
                                  : 'hover:bg-blue-50 cursor-pointer'
                              }`}
                            >
                              <span className="font-bold text-slate-800 text-xs">{user.name}</span>
                              
                              {isAlreadyApprover ? (
                                <span className="text-[10px] text-emerald-700 font-bold px-1.5 py-0.5 bg-emerald-100 rounded-[3px]">
                                  ✓ Đã thêm
                                </span>
                              ) : isAlreadyCc ? (
                                <span className="text-[10px] text-amber-800 font-bold px-1.5 py-0.5 bg-amber-100 rounded-[3px]" title="Đã có trong Người theo dõi (Cc)">
                                  Đang là Cc
                                </span>
                              ) : (
                                <span className="text-[10px] text-brand-blue font-bold px-1.5 py-0.5 bg-blue-50 border border-brand-blue/20 rounded-[3px]">
                                  + Thêm
                                </span>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>

                {/* Selected Approvers List: Display ONLY Full Name */}
                <div className="space-y-1.5 max-h-52 overflow-y-auto">
                  {selectedApprovers.length > 0 ? (
                    selectedApprovers.map((item, idx) => (
                      <div
                        key={item.user.id}
                        className="p-2 bg-white border border-slate-200 rounded-[3px] flex items-center justify-between gap-2 shadow-2xs hover:border-brand-blue transition-all"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="h-5 w-5 rounded-[3px] bg-brand-blue text-white flex items-center justify-center font-bold text-[11px] shrink-0">
                            {idx + 1}
                          </span>
                          <span className="font-bold text-slate-900 text-xs truncate">
                            {item.user.name}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleRemoveApprover(item.user.id)}
                            className="text-slate-400 hover:text-brand-red p-1 transition-colors"
                            title="Xóa người duyệt này"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-4 border border-dashed border-blue-200 bg-white/60 rounded-[3px] text-center text-slate-400 text-xs">
                      Chưa chọn người xét duyệt. Vui lòng gõ tên ở ô trên để thêm từng bước duyệt.
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* CỘT PHẢI: 6. NGƯỜI THEO DÕI (Cc) */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-[3px] space-y-3 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="block font-bold text-slate-700">
                      6. Người theo dõi (Cc)
                    </label>
                    <p className="text-[11px] text-slate-500">
                      Gõ tìm kiếm họ và tên người nhận thông báo tiến độ
                    </p>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 bg-slate-200 text-slate-700 rounded-[3px]">
                    {selectedCcUsers.length} người theo dõi
                  </span>
                </div>

                {/* Input Search Autocomplete for CC */}
                <div className="relative" ref={ccSearchRef}>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      value={ccSearchQuery}
                      onFocus={() => setIsCcDropdownOpen(true)}
                      onChange={(e) => {
                        setCcSearchQuery(e.target.value);
                        setIsCcDropdownOpen(true);
                      }}
                      placeholder="Gõ để tìm nhanh họ và tên người theo dõi..."
                      className="w-full pl-9 pr-8 py-2 text-xs bg-white border border-slate-300 rounded-[3px] focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue font-medium"
                    />
                    <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                  </div>

                  {/* Autocomplete Dropdown: Display ONLY Full Name + Conflict Warnings */}
                  {isCcDropdownOpen && (
                    <div className="absolute top-full left-0 right-0 mt-1 max-h-48 overflow-y-auto bg-white border border-slate-200 rounded-[3px] shadow-xl z-50 divide-y divide-slate-100 animate-slide-down">
                      {filteredCcCandidates.length === 0 ? (
                        <div className="p-3 text-center text-slate-400 text-xs">
                          Không tìm thấy người dùng phù hợp
                        </div>
                      ) : (
                        filteredCcCandidates.map((user) => {
                          const isAlreadyCc = selectedCcUsers.some(u => u.id === user.id);
                          const isAlreadyApprover = selectedApprovers.some(a => a.user.id === user.id);

                          return (
                            <div
                              key={user.id}
                              onClick={() => {
                                if (!isAlreadyCc && !isAlreadyApprover) {
                                  handleAddCcUser(user);
                                }
                              }}
                              className={`p-2.5 flex items-center justify-between transition-colors ${
                                isAlreadyCc || isAlreadyApprover
                                  ? 'bg-slate-50 cursor-not-allowed opacity-60' 
                                  : 'hover:bg-slate-100 cursor-pointer'
                              }`}
                            >
                              <span className="font-bold text-slate-800 text-xs">{user.name}</span>
                              
                              {isAlreadyCc ? (
                                <span className="text-[10px] text-slate-500 font-bold px-1.5 py-0.5 bg-slate-100 rounded-[3px]">
                                  ✓ Đã chọn
                                </span>
                              ) : isAlreadyApprover ? (
                                <span className="text-[10px] text-blue-800 font-bold px-1.5 py-0.5 bg-blue-100 rounded-[3px]" title="Đang là Người xét duyệt">
                                  Đang là Người duyệt
                                </span>
                              ) : (
                                <span className="text-[10px] text-slate-700 font-bold px-1.5 py-0.5 bg-white border border-slate-300 rounded-[3px]">
                                  + Thêm
                                </span>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>

                {/* Selected CC Tags: Display ONLY Full Name */}
                <div className="max-h-52 overflow-y-auto">
                  {selectedCcUsers.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {selectedCcUsers.map((user) => (
                        <div
                          key={user.id}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white border border-slate-300 rounded-[3px] shadow-2xs text-xs font-semibold text-slate-800 hover:border-slate-400 transition-colors"
                        >
                          <span>{user.name}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveCcUser(user.id)}
                            className="text-slate-400 hover:text-brand-red ml-0.5"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-4 border border-dashed border-slate-200 rounded-[3px] text-center text-slate-400 text-xs">
                      Chưa có người theo dõi nào được chọn
                    </div>
                  )}
                </div>
              </div>
            </div>

          </div>

          {/* SECTION 3: 8. NỘI DUNG TỜ TRÌNH (Quill.js 2.0 Editor) */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block font-bold text-slate-700">
                8. Nội dung (Soạn thảo Rich Text Quill.js 2.0)
              </label>
              <span className="text-[10px] text-slate-400">Đầy đủ định dạng văn bản chuẩn</span>
            </div>
            
            <QuillEditor
              value={contentHtml}
              onChange={setContentHtml}
              placeholder="Nhập chi tiết nội dung tờ trình, các căn cứ pháp lý, điều khoản hợp đồng..."
              minHeight="140px"
            />
          </div>

          {/* SECTION 4: 9. TỆP ĐÍNH KÈM & SCAN (DMS) */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="font-bold text-slate-700">
                9. Tệp đính kèm & Bản scan tài liệu (DMS)
              </label>
              <label className="cursor-pointer px-3 py-1 bg-brand-blue hover:bg-brand-blue-dark text-white font-bold rounded-[3px] flex items-center gap-1.5 transition-colors shadow-xs">
                <Upload className="h-3.5 w-3.5" />
                <span>Tải File / Scan Lên</span>
                <input
                  type="file"
                  multiple
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </div>

            {attachments.length === 0 ? (
              <div className="p-3.5 border-2 border-dashed border-slate-200 rounded-[3px] text-center bg-slate-50">
                <FileText className="h-6 w-6 text-slate-400 mx-auto mb-1" />
                <p className="text-slate-500 font-medium text-[11px]">
                  Chưa có tệp tải lên (Hệ thống sẽ tự động khởi tạo bản thảo chuẩn kèm theo)
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-36 overflow-y-auto">
                {attachments.map((att) => (
                  <div
                    key={att.id}
                    className="p-2 bg-slate-50 border border-slate-200 rounded-[3px] flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <FileText className="h-4 w-4 text-brand-blue shrink-0" />
                      <span className="font-semibold text-slate-800 truncate">{att.name}</span>
                      <span className="text-slate-400 text-[10px] shrink-0">
                        ({(att.size / 1024).toFixed(1)} KB)
                      </span>
                      {att.isScan && (
                        <span className="px-1.5 py-0.2 bg-brand-red/10 text-brand-red text-[9px] font-bold rounded-[3px] shrink-0">
                          Scan
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => setPreviewAttachment(att)}
                        className="text-slate-400 hover:text-brand-blue p-1 transition-colors"
                        title="Xem trước tài liệu"
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => removeAttachment(att.id)}
                        className="text-slate-400 hover:text-brand-red p-1 transition-colors"
                        title="Xóa tệp này"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Form Actions */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 bg-white text-slate-700 border border-slate-300 rounded-[3px] font-semibold hover:bg-slate-50 transition-colors"
            >
              Hủy Bỏ
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2 bg-brand-red hover:bg-brand-red-dark text-white font-bold uppercase tracking-wider rounded-[3px] shadow-md hover:shadow-glow-red transition-all duration-150 transform hover:-translate-y-0.5 active:translate-y-0"
            >
              Gửi Trình Ký Ngay
            </button>
          </div>

        </form>

        {/* PDF & Document Viewer Modal */}
        {previewAttachment && (
          <PDFViewerModal
            attachment={previewAttachment}
            onClose={() => setPreviewAttachment(null)}
          />
        )}

      </div>
    </div>
  );
};
