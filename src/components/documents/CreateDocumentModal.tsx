import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
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
  Eye,
  Loader2,
  Cloud,
  ArrowUp,
  ArrowDown,
  Sparkles,
  Plus,
  ShieldCheck,
  User as UserIcon,
  Clock,
  GitFork,
  CheckCircle2
} from 'lucide-react';
import { useDocument } from '../../context/DocumentContext';
import { ApprovalStep, DocumentStatus, Attachment, User, UserRole, OverdueAction, WorkflowTemplate } from '../../types';
import { QuillEditor } from '../common/QuillEditor';
import { PDFViewerModal } from '../common/PDFViewerModal';
import { uploadFileToNAS } from '../../lib/nasStorageService';

export type ApproverItem = 
  | { type: 'USER'; user: User; title?: string; slaHours?: number; overdueAction?: OverdueAction }
  | { type: 'DEPARTMENT'; departmentName: string; departmentCode: string; title?: string; slaHours?: number; overdueAction?: OverdueAction; isInternalCheck?: boolean; requiresInternalCheck?: boolean };

export const CreateDocumentModal: React.FC = () => {
  const { 
    isCreateModalOpen, 
    setIsCreateModalOpen, 
    createDocument, 
    activeUser, 
    users, 
    departments: systemDepts,
    workflowTemplates = []
  } = useDocument();

  // 1. Loại hồ sơ & Mẫu quy trình BPM
  const [category, setCategory] = useState('Hợp đồng kinh tế');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [code, setCode] = useState(`HĐ-2026/TH-${Math.floor(100 + Math.random() * 900)}`);
  const [previewAttachment, setPreviewAttachment] = useState<Attachment | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  
  // 2. Tên hồ sơ
  const [title, setTitle] = useState('');
  
  // 3. Dự án
  const [project, setProject] = useState('');
  
  // 4. Phòng ban khởi tạo (Thẻ select)
  const [department, setDepartment] = useState(activeUser?.department || 'Phòng Kỹ thuật & Dự án');

  // Chính sách xử lý quá hạn mặc định
  const [docOverdueAction, setDocOverdueAction] = useState<OverdueAction>('WARN_AND_RETURN');
  
  // 5. Chuỗi người / phòng ban xét duyệt
  const [selectedApprovers, setSelectedApprovers] = useState<ApproverItem[]>([]);
  const [approverSearchQuery, setApproverSearchQuery] = useState('');
  const [isApproverDropdownOpen, setIsApproverDropdownOpen] = useState(false);
  const approverSearchRef = useRef<HTMLDivElement>(null);

  // Helper lấy SLA mặc định của phòng ban
  const getDeptDefaultSla = useCallback((deptName: string): number => {
    const found = systemDepts?.find(d => d.name.toLowerCase() === deptName.toLowerCase());
    return found?.defaultSlaHours || 8;
  }, [systemDepts]);

  // 6. Người theo dõi (Cc)
  const [selectedCcUsers, setSelectedCcUsers] = useState<User[]>([]);
  const [ccSearchQuery, setCcSearchQuery] = useState('');
  const [isCcDropdownOpen, setIsCcDropdownOpen] = useState(false);
  const ccSearchRef = useRef<HTMLDivElement>(null);

  // 7. Thời hạn duyệt mong muốn (Ngày & Giờ)
  const [desiredDeadline, setDesiredDeadline] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 3);
    d.setHours(17, 0, 0, 0);
    const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
    const year = d.getFullYear();
    const month = pad(d.getMonth() + 1);
    const date = pad(d.getDate());
    const hours = pad(d.getHours());
    const mins = pad(d.getMinutes());
    return `${year}-${month}-${date}T${hours}:${mins}`;
  });

  // 8. Nội dung (Quill.js 2.0)
  const [contentHtml, setContentHtml] = useState('');

  // 9. Tệp đính kèm
  const [attachments, setAttachments] = useState<Attachment[]>([]);

  // State management
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Danh sách các phòng ban khả dụng
  const allDepartments = useMemo(() => {
    if (systemDepts && systemDepts.length > 0) return systemDepts;
    const fromUsers = Array.from(new Set(users.map(u => u.department)));
    return fromUsers.map((name, idx) => ({ id: `dept-${idx}`, name, code: `PB${idx+1}`, defaultSlaHours: 8 }));
  }, [systemDepts, users]);

  // Danh sách các loại hồ sơ khả dụng (Bao gồm các mẫu mới được thêm vào)
  const availableCategories = useMemo(() => {
    const defaultList = [
      'Hợp đồng kinh tế',
      'Tờ trình phê duyệt',
      'Đề xuất thanh toán',
      'Biên bản nghiệm thu',
      'Văn bản nội bộ'
    ];
    const fromWf = workflowTemplates.map(w => w.category).filter(Boolean);
    return Array.from(new Set([...defaultList, ...fromWf]));
  }, [workflowTemplates]);

  // Áp dụng Mẫu quy trình BPM
  const handleApplyTemplate = useCallback((templateId: string) => {
    setSelectedTemplateId(templateId);
    if (!templateId) return;
    const tpl = workflowTemplates.find(w => w.id === templateId);
    if (!tpl) return;

    // Cập nhật loại hồ sơ theo mẫu
    setCategory(tpl.category);
    const prefix = tpl.category.includes('Hợp đồng') ? 'HĐ' :
                   tpl.category.includes('Tờ trình') ? 'TTr' :
                   tpl.category.includes('thanh toán') ? 'BB' : 'VB';
    setCode(`${prefix}-2026/TH-${Math.floor(100 + Math.random() * 900)}`);

    // Tự động điền chuỗi duyệt từ mẫu
    const mappedSteps: ApproverItem[] = tpl.steps.map(s => {
      const deptObj = systemDepts?.find(d => d.name.toLowerCase() === s.department.toLowerCase());
      const dName = s.department;
      const isBoard = dName.toLowerCase().startsWith('ban ') || 
                      dName.toLowerCase().includes('ban qlda') || 
                      dName.toLowerCase().includes('ban kiểm soát') ||
                      dName.toLowerCase().includes('ban điều hành');
      return {
        type: 'DEPARTMENT',
        departmentName: dName,
        departmentCode: deptObj?.code || 'PB',
        title: s.title || (isBoard ? `Ban ${dName}` : `Phòng ${dName}`),
        slaHours: s.slaHours || deptObj?.defaultSlaHours || getDeptDefaultSla(dName),
        overdueAction: docOverdueAction,
        isInternalCheck: !!s.isInternalCheck,
        requiresInternalCheck: !!s.isInternalCheck
      };
    });

    setSelectedApprovers(mappedSteps);
  }, [workflowTemplates, systemDepts, docOverdueAction, getDeptDefaultSla]);

  // Tự động áp dụng mẫu quy trình đầu tiên khi mở modal nếu chưa có cấp duyệt
  useEffect(() => {
    if (isCreateModalOpen && selectedApprovers.length === 0 && workflowTemplates.length > 0) {
      const defaultTpl = workflowTemplates.find(w => w.category.toLowerCase() === category.toLowerCase()) || workflowTemplates[0];
      if (defaultTpl) {
        handleApplyTemplate(defaultTpl.id);
      }
    }
  }, [isCreateModalOpen, workflowTemplates, category, selectedApprovers.length, handleApplyTemplate]);

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

    // Tự động tìm quy trình phù hợp với loại hồ sơ này
    const matchingTpl = workflowTemplates.find(w => w.category.toLowerCase() === newCat.toLowerCase());
    if (matchingTpl) {
      handleApplyTemplate(matchingTpl.id);
    } else {
      setSelectedTemplateId('');
    }
  };


  // Thêm người duyệt là CÁ NHÂN
  const handleAddUserApprover = (user: User) => {
    setErrorMsg('');
    if (selectedCcUsers.some(u => u.id === user.id)) {
      setErrorMsg(`"${user.name}" đang nằm trong danh sách Người theo dõi (Cc).`);
      return;
    }

    if (selectedApprovers.some(a => a.type === 'USER' && a.user.id === user.id)) {
      setApproverSearchQuery('');
      setIsApproverDropdownOpen(false);
      return;
    }

    const sla = getDeptDefaultSla(user.department);
    setSelectedApprovers(prev => [
      ...prev,
      { type: 'USER', user, title: user.name, slaHours: sla, overdueAction: docOverdueAction }
    ]);
    setApproverSearchQuery('');
    setIsApproverDropdownOpen(false);
  };

  // Thêm người duyệt là PHÒNG BAN (Gộp chung 1 bước: Kiểm tra nội bộ + Phê duyệt quản lý)
  const handleAddDeptApprover = (dept: { id: string; name: string; code: string; defaultSlaHours?: number }) => {
    setErrorMsg('');
    const sla = dept.defaultSlaHours || getDeptDefaultSla(dept.name);
    const dName = dept.name;
    const isBoard = dName.toLowerCase().startsWith('ban ') || 
                    dName.toLowerCase().includes('ban qlda') || 
                    dName.toLowerCase().includes('ban kiểm soát') ||
                    dName.toLowerCase().includes('ban điều hành');
    setSelectedApprovers(prev => [
      ...prev,
      { 
        type: 'DEPARTMENT', 
        departmentName: dName, 
        departmentCode: dept.code, 
        title: isBoard ? `Ban ${dName}` : `Phòng ${dName}`, 
        slaHours: sla, 
        overdueAction: docOverdueAction,
        requiresInternalCheck: true
      }
    ]);
    setApproverSearchQuery('');
    setIsApproverDropdownOpen(false);
  };

  // Cập nhật SLA số giờ cho từng bước
  const handleUpdateStepSla = (idx: number, hours: number) => {
    setSelectedApprovers(prev => prev.map((item, i) => i === idx ? { ...item, slaHours: Math.max(1, hours) } : item));
  };

  // Cập nhật hành vi quá hạn cho từng bước
  const handleUpdateStepOverdueAction = (idx: number, action: OverdueAction) => {
    setSelectedApprovers(prev => prev.map((item, i) => i === idx ? { ...item, overdueAction: action } : item));
  };

  // Xóa bước duyệt
  const handleRemoveApprover = (index: number) => {
    setSelectedApprovers(prev => prev.filter((_, idx) => idx !== index));
  };

  // Di chuyển bước LÊN
  const handleMoveApproverUp = (idx: number) => {
    if (idx === 0) return;
    setSelectedApprovers(prev => {
      const arr = [...prev];
      const temp = arr[idx - 1];
      arr[idx - 1] = arr[idx];
      arr[idx] = temp;
      return arr;
    });
  };

  // Di chuyển bước XUỐNG
  const handleMoveApproverDown = (idx: number) => {
    if (idx >= selectedApprovers.length - 1) return;
    setSelectedApprovers(prev => {
      const arr = [...prev];
      const temp = arr[idx + 1];
      arr[idx + 1] = arr[idx];
      arr[idx] = temp;
      return arr;
    });
  };

  // Đổi lựa chọn trong bước (từ select box của từng bước)
  const handleChangeStepTarget = (idx: number, value: string) => {
    if (value.startsWith('USER:')) {
      const uId = value.replace('USER:', '');
      const foundUser = users.find(u => u.id === uId);
      if (foundUser) {
        const sla = getDeptDefaultSla(foundUser.department);
        setSelectedApprovers(prev => prev.map((item, i) => i === idx ? { 
          ...item, 
          type: 'USER', 
          user: foundUser, 
          title: foundUser.name,
          slaHours: item.slaHours || sla
        } : item));
      }
    } else if (value.startsWith('DEPT:')) {
      const deptName = value.replace('DEPT:', '');
      const deptObj = allDepartments.find(d => d.name === deptName);
      const sla = (deptObj as any)?.defaultSlaHours || getDeptDefaultSla(deptName);
      setSelectedApprovers(prev => prev.map((item, i) => i === idx ? { 
        ...item,
        type: 'DEPARTMENT', 
        departmentName: deptName, 
        departmentCode: deptObj?.code || 'PB',
        title: `Phòng ${deptName}`,
        slaHours: item.slaHours || sla
      } : item));
    }
  };

  // Thêm người theo dõi (Cc)
  const handleAddCcUser = (user: User) => {
    setErrorMsg('');
    if (selectedApprovers.some(a => a.type === 'USER' && a.user.id === user.id)) {
      setErrorMsg(`"${user.name}" đang là Người xét duyệt.`);
      return;
    }

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

  // File upload
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
        id: `att-upload-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 6)}`,
        name: file.name,
        size: file.size,
        type: file.type || (isPdf ? 'application/pdf' : isImage ? 'image/png' : 'application/octet-stream'),
        url: finalUrl,
        uploadedAt: new Date().toISOString(),
        uploadedBy: activeUser.name,
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

  // Submit Handler
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!title.trim()) {
      setErrorMsg('Vui lòng nhập tên / trích yếu hồ sơ.');
      return;
    }

    if (selectedApprovers.length === 0) {
      setErrorMsg('Vui lòng chọn ít nhất 01 người hoặc phòng ban xét duyệt.');
      return;
    }

    const now = new Date();
    const nowIso = now.toISOString();

    // Build approval steps with SLA & Overdue Policies
    const steps: ApprovalStep[] = selectedApprovers.map((item, idx) => {
      const sla = item.slaHours || 8;
      const act = item.overdueAction || docOverdueAction;
      const isFirst = idx === 0;
      const stepDeadline = isFirst 
        ? new Date(now.getTime() + sla * 3600 * 1000).toISOString()
        : undefined;

      if (item.type === 'USER') {
        return {
          id: `step-${Date.now()}-${idx}`,
          stepOrder: idx + 1,
          title: item.user.roleTitle || 'Xét duyệt',
          approverRole: item.user.role,
          approverId: item.user.id,
          approverName: item.user.name,
          approverTitle: item.user.roleTitle,
          department: item.user.department,
          status: isFirst ? 'CURRENT' : 'PENDING',
          slaHours: sla,
          overdueAction: act,
          startedAt: isFirst ? nowIso : undefined,
          deadline: stepDeadline,
          isOverdue: false,
          stepType: 'APPROVAL',
          isInternalCheck: false,
        };
      } else {
        const dName = item.departmentName;
        const isBoard = dName.toLowerCase().startsWith('ban ') || 
                        dName.toLowerCase().includes('ban qlda') || 
                        dName.toLowerCase().includes('ban kiểm soát') ||
                        dName.toLowerCase().includes('ban điều hành');
        const role: UserRole = dName.includes('Giám Đốc') ? 'DIRECTOR' :
                               dName.includes('Kế toán') ? 'CHIEF_ACCOUNTANT' :
                               dName.includes('Pháp chế') ? 'LEGAL_DEPT' : 
                               isBoard ? 'BOARD_HEAD' : 'DEPT_HEAD';
        return {
          id: `step-${Date.now()}-${idx}`,
          stepOrder: idx + 1,
          title: item.title || (isBoard ? `Ban ${dName}` : `Phòng ${dName}`),
          approverRole: role,
          approverName: dName,
          approverTitle: isBoard ? 'Đại diện Ban' : 'Đại diện phòng ban',
          department: dName,
          status: isFirst ? 'CURRENT' : 'PENDING',
          slaHours: sla,
          overdueAction: act,
          startedAt: isFirst ? nowIso : undefined,
          deadline: stepDeadline,
          isOverdue: false,
          requiresInternalCheck: true,
          isInternalChecked: false,
          stepType: 'APPROVAL',
        };
      }
    });

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
      deadline: steps[0]?.deadline || (desiredDeadline ? new Date(desiredDeadline).toISOString() : undefined),
      overdueAction: docOverdueAction,
      isOverdue: false,
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

  // Filtered Candidates for Search (both Users & Departments)
  const searchFilterText = approverSearchQuery.toLowerCase().trim();
  
  const matchedDepartments = allDepartments.filter(d => 
    !searchFilterText || 
    d.name.toLowerCase().includes(searchFilterText) || 
    d.code.toLowerCase().includes(searchFilterText)
  );

  const matchedUsers = users.filter(u => {
    if (!searchFilterText) return true;
    const matchMain = 
      u.name.toLowerCase().includes(searchFilterText) || 
      u.username.toLowerCase().includes(searchFilterText) ||
      u.roleTitle.toLowerCase().includes(searchFilterText) ||
      u.department.toLowerCase().includes(searchFilterText);
    const matchSecondary = u.secondaryPositions?.some(p => 
      p.roleTitle.toLowerCase().includes(searchFilterText) ||
      p.department.toLowerCase().includes(searchFilterText)
    );
    return matchMain || matchSecondary;
  });

  const filteredCcCandidates = users.filter(u => {
    if (!ccSearchQuery) return true;
    const q = ccSearchQuery.toLowerCase();
    const matchMain = u.name.toLowerCase().includes(q) || u.department.toLowerCase().includes(q);
    const matchSecondary = u.secondaryPositions?.some(p => p.department.toLowerCase().includes(q) || p.roleTitle.toLowerCase().includes(q));
    return matchMain || matchSecondary;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
      <div 
        className={`bg-white rounded-[4px] shadow-2xl border border-slate-200 w-full max-w-4xl my-auto overflow-hidden transition-all duration-200 transform ${
          isClosing ? 'opacity-0 scale-95' : 'opacity-100 scale-100 animate-slide-down'
        }`}
      >
        
        {/* Modal Header */}
        <div className="px-5 py-3.5 bg-brand-blue text-white flex items-center justify-between border-b border-blue-900 shadow-xs">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-white/10 rounded">
              <FileText className="h-5 w-5 text-amber-300" />
            </div>
            <div>
              <h2 className="text-base font-bold tracking-tight">Khởi Tạo Hồ Sơ Trình Ký</h2>
              <p className="text-[11px] text-blue-100">
                Thiết lập thông tin và cấu hình người / phòng ban phê duyệt
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="text-white/80 hover:text-white p-1 rounded hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body Form */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4 text-xs text-slate-800 max-h-[85vh] overflow-y-auto">
          
          {errorMsg && (
            <div className="p-3 bg-red-50 border-l-4 border-brand-red text-red-700 flex items-center gap-2 rounded-r-[3px] text-xs">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span className="font-semibold">{errorMsg}</span>
            </div>
          )}

          {/* QUICK BPM WORKFLOW TEMPLATE SELECTOR (CHỌN NHANH QUY TRÌNH KÝ THEO LOẠI HỒ SƠ) */}
          <div className="bg-gradient-to-r from-slate-900 via-brand-navy to-blue-950 p-4 rounded-[4px] border border-blue-800 text-white shadow-sm space-y-2.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-white/10 rounded-[3px] text-amber-400">
                  <GitFork className="h-4 w-4" />
                </div>
                <div>
                  <div className="font-bold text-xs flex items-center gap-2">
                    <span className="text-white">Mẫu Quy Trình Ký Chuẩn (BPM Engine)</span>
                    <span className="text-[10px] font-extrabold px-1.5 py-0.2 bg-amber-400 text-slate-950 rounded">
                      Tự Động Điền Form
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-300 mt-0.5">
                    Chọn mẫu quy trình tương ứng với Loại hồ sơ để nạp sẵn chuỗi phòng ban duyệt & SLA chuẩn
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 min-w-[260px]">
                <select
                  value={selectedTemplateId}
                  onChange={(e) => handleApplyTemplate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900/90 border border-blue-400/50 hover:border-amber-400 rounded text-xs font-bold text-white focus:outline-none focus:ring-1 focus:ring-amber-400 cursor-pointer shadow-inner"
                >
                  <option value="">-- Chọn Mẫu Quy Trình Ký Nhanh --</option>
                  {workflowTemplates.map((tpl) => (
                    <option key={tpl.id} value={tpl.id}>
                      ⚡ [{tpl.category}] {tpl.name} ({tpl.steps.length} bước)
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {selectedTemplateId && (
              <div className="pt-2 border-t border-white/10 flex items-center justify-between text-[11px] text-emerald-300 font-semibold">
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                  Đang áp dụng mẫu: <strong>{workflowTemplates.find(w => w.id === selectedTemplateId)?.name}</strong>
                </span>
                <span className="text-slate-300">
                  {selectedApprovers.length} cấp phê duyệt • Tổng SLA: {selectedApprovers.reduce((sum, s) => sum + (s.slaHours || 0), 0)}h
                </span>
              </div>
            )}
          </div>

          {/* SECTION 1: THÔNG TIN HỒ SƠ */}
          <div className="bg-slate-50/80 p-4 rounded-[4px] border border-slate-200 space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Loại hồ sơ <span className="text-brand-red">*</span>
                </label>
                <select
                  value={category}
                  onChange={(e) => handleCategoryChange(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-[3px] font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-brand-blue cursor-pointer"
                >
                  {availableCategories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>


              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Dự án / Công trình
                </label>
                <div className="relative">
                  <FolderKanban className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    value={project}
                    onChange={(e) => setProject(e.target.value)}
                    placeholder="VD: Dự án Xi măng Nghi Sơn..."
                    className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-[3px] font-medium focus:outline-none focus:ring-1 focus:ring-brand-blue"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Tên / Trích yếu hồ sơ <span className="text-brand-red">*</span>
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="VD: Tờ trình phê duyệt phương án thi công gói thầu số 02..."
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-[3px] font-semibold text-slate-900 focus:outline-none focus:ring-1 focus:ring-brand-blue"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {/* Phòng ban khởi tạo dạng THẺ SELECT */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Phòng ban khởi tạo <span className="text-brand-red">*</span>
                </label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                  <select
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-[3px] font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-brand-blue cursor-pointer"
                  >
                    {allDepartments.map(d => (
                      <option key={d.id} value={d.name}>{d.name} ({d.code})</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Hạn duyệt mong muốn (Ngày & Giờ) <span className="text-brand-red">*</span>
                </label>
                <div className="relative">
                  <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                  <input
                    type="datetime-local"
                    required
                    value={desiredDeadline}
                    onChange={(e) => setDesiredDeadline(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-[3px] font-medium focus:outline-none focus:ring-1 focus:ring-brand-blue"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 2: NGƯỜI / PHÒNG BAN XÉT DUYỆT & SLA */}
          <div className="p-4 bg-blue-50/40 border border-brand-blue/30 rounded-[4px] space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-brand-blue" />
                <span className="font-bold text-brand-blue text-xs uppercase tracking-wider">
                  Người / Phòng ban xét duyệt & Thời gian SLA
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 bg-brand-blue text-white rounded-[3px]">
                  {selectedApprovers.length} cấp duyệt
                </span>
              </div>
              {/* Cài đặt chính sách quá hạn mặc định */}
              <div className="flex items-center gap-1.5 text-[11px] bg-white px-2 py-1 rounded border border-blue-200 shadow-2xs">
                <span className="text-slate-600 font-semibold">Khi quá hạn:</span>
                <select
                  value={docOverdueAction}
                  onChange={(e) => {
                    const act = e.target.value as OverdueAction;
                    setDocOverdueAction(act);
                    setSelectedApprovers(prev => prev.map(p => ({ ...p, overdueAction: act })));
                  }}
                  className="font-bold text-slate-800 text-[11px] bg-transparent focus:outline-none cursor-pointer"
                >
                  <option value="WARN_AND_RETURN">⚠️ Cảnh báo & Trả hồ sơ</option>
                  <option value="AUTO_APPROVE">⚡ Tự động phê duyệt bởi hệ thống</option>
                </select>
              </div>
            </div>

            {/* Danh sách các bước duyệt với cấu hình SLA */}
            <div className="space-y-2">
              {selectedApprovers.length === 0 ? (
                <div className="p-4 border-2 border-dashed border-blue-200 bg-white/70 rounded-[3px] text-center text-slate-400 text-xs">
                  Chưa có cấp duyệt nào. Vui lòng tìm kiếm hoặc chọn ở ô bên dưới để thêm vào chuỗi duyệt.
                </div>
              ) : (
                selectedApprovers.map((item, idx) => {
                  const isFirst = idx === 0;
                  const isLast = idx === selectedApprovers.length - 1;
                  const currentValue = item.type === 'USER' ? `USER:${item.user.id}` : `DEPT:${item.departmentName}`;

                  return (
                    <div 
                      key={idx}
                      className="p-2.5 bg-white border border-slate-200 hover:border-brand-blue/50 rounded-[4px] shadow-2xs transition-all space-y-2"
                    >
                      {/* Dòng 1: STT, Dropdown Người/Phòng ban duyệt, Nút di chuyển/xóa */}
                      <div className="flex items-center justify-between gap-2">
                        <span className={`w-5 h-5 rounded-[2px] flex items-center justify-center font-bold text-[11px] text-white shrink-0 ${
                          isFirst ? 'bg-emerald-600' : isLast ? 'bg-brand-red' : 'bg-brand-blue'
                        }`}>
                          {idx + 1}
                        </span>

                        <div className="flex-1 min-w-0 space-y-1">
                          <div className="flex items-center gap-2">
                            {item.type === 'DEPARTMENT' && (
                              <span className="px-1.5 py-0.2 rounded text-[9.5px] font-bold shrink-0 bg-indigo-50 text-indigo-700 border border-indigo-200">
                                🏢 Duyệt cấp Ban/Phòng (Gồm khâu Kiểm tra nội bộ + Quản lý duyệt)
                              </span>
                            )}
                          </div>
                          <select
                            value={currentValue}
                            onChange={(e) => handleChangeStepTarget(idx, e.target.value)}
                            className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-[2px] font-bold text-slate-800 text-xs focus:bg-white focus:outline-none focus:ring-1 focus:ring-brand-blue cursor-pointer truncate"
                          >
                            <optgroup label="🏢 --- PHÒNG BAN XÉT DUYỆT ---">
                              {allDepartments.map(d => (
                                <option key={`dept-${d.id}`} value={`DEPT:${d.name}`}>
                                  🏢 {d.name} ({d.code}) {d.defaultSlaHours ? `— Chuẩn SLA: ${d.defaultSlaHours}h` : ''}
                                </option>
                              ))}
                            </optgroup>
                            <optgroup label="👤 --- CÁ NHÂN CỤ THỂ ---">
                              {users.map(u => (
                                <option key={`user-${u.id}`} value={`USER:${u.id}`}>
                                  👤 {u.name} — {u.roleTitle} ({u.department})
                                </option>
                              ))}
                            </optgroup>
                          </select>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            disabled={isFirst}
                            onClick={() => handleMoveApproverUp(idx)}
                            title="Đẩy lên trước"
                            className={`p-1 rounded-[2px] border ${
                              isFirst ? 'text-slate-200 border-slate-100 cursor-not-allowed' : 'text-slate-500 hover:text-brand-blue hover:bg-blue-50 border-slate-200 cursor-pointer'
                            }`}
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            disabled={isLast}
                            onClick={() => handleMoveApproverDown(idx)}
                            title="Đẩy xuống sau"
                            className={`p-1 rounded-[2px] border ${
                              isLast ? 'text-slate-200 border-slate-100 cursor-not-allowed' : 'text-slate-500 hover:text-brand-blue hover:bg-blue-50 border-slate-200 cursor-pointer'
                            }`}
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveApprover(idx)}
                            title="Xóa bước này"
                            className="p-1 text-slate-400 hover:text-brand-red hover:bg-red-50 border border-slate-200 rounded-[2px] transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Dòng 2: Cài đặt thời gian SLA và Hành vi quá hạn cho bước này */}
                      <div className="flex flex-wrap items-center justify-between gap-2 pt-1.5 border-t border-slate-100 text-[11px]">
                        {/* SLA Picker */}
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                          <span className="font-semibold text-slate-600">SLA cam kết:</span>
                          <input
                            type="number"
                            min="1"
                            max="168"
                            value={item.slaHours || 8}
                            onChange={(e) => handleUpdateStepSla(idx, parseInt(e.target.value) || 8)}
                            className="w-12 px-1 py-0.5 bg-amber-50/60 border border-amber-300 rounded font-bold text-amber-900 text-center text-xs focus:bg-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                          />
                          <span className="text-slate-500 font-medium">giờ</span>

                          {/* Quick buttons */}
                          <div className="flex items-center gap-1 ml-1">
                            {[4, 8, 12, 24, 48].map((h) => (
                              <button
                                key={h}
                                type="button"
                                onClick={() => handleUpdateStepSla(idx, h)}
                                className={`px-1.5 py-0.5 rounded text-[10px] font-bold border transition-colors cursor-pointer ${
                                  (item.slaHours || 8) === h
                                    ? 'bg-amber-600 text-white border-amber-600'
                                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-amber-50 hover:text-amber-700'
                                }`}
                              >
                                {h}h
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Overdue Action per step */}
                        <div className="flex items-center gap-1.5 ml-auto">
                          <span className="text-slate-500 font-medium">Quá hạn:</span>
                          <select
                            value={item.overdueAction || docOverdueAction}
                            onChange={(e) => handleUpdateStepOverdueAction(idx, e.target.value as OverdueAction)}
                            className={`px-2 py-0.5 border rounded font-semibold text-[10px] cursor-pointer focus:outline-none ${
                              (item.overdueAction || docOverdueAction) === 'AUTO_APPROVE'
                                ? 'bg-purple-50 text-purple-700 border-purple-200'
                                : 'bg-orange-50 text-orange-700 border-orange-200'
                            }`}
                          >
                            <option value="WARN_AND_RETURN">⚠️ Cảnh báo & Trả hồ sơ</option>
                            <option value="AUTO_APPROVE">⚡ Tự động phê duyệt</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Ô tìm kiếm THÊM NHANH (Phòng ban hoặc Cá nhân) */}
            <div className="relative pt-1" ref={approverSearchRef}>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  value={approverSearchQuery}
                  onFocus={() => setIsApproverDropdownOpen(true)}
                  onChange={(e) => {
                    setApproverSearchQuery(e.target.value);
                    setIsApproverDropdownOpen(true);
                  }}
                  placeholder="+ Thêm người hoặc phòng ban duyệt tiếp theo..."
                  className="w-full pl-8 pr-8 py-1.5 text-xs bg-white border border-blue-200 rounded-[3px] focus:outline-none focus:ring-1 focus:ring-brand-blue font-medium"
                />
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
              </div>

              {isApproverDropdownOpen && (
                <div className="absolute top-full left-0 right-0 mt-1 max-h-48 overflow-y-auto bg-white border border-slate-200 rounded-[3px] shadow-xl z-50 divide-y divide-slate-100 animate-slide-down">
                  {/* Danh sách phòng ban gợi ý */}
                  {matchedDepartments.length > 0 && (
                    <div className="p-1.5 bg-slate-50 text-[10px] font-bold text-slate-500 uppercase">
                      🏢 Chọn theo Phòng Ban:
                    </div>
                  )}
                  {matchedDepartments.map(dept => (
                    <div
                      key={`search-dept-${dept.id}`}
                      onClick={() => handleAddDeptApprover(dept)}
                      className="p-2 hover:bg-blue-50 flex items-center justify-between cursor-pointer transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <Building2 className="w-3.5 h-3.5 text-brand-blue shrink-0" />
                        <span className="font-bold text-slate-900 text-xs">{dept.name} ({dept.code})</span>
                      </div>
                      <span className="text-[10px] text-brand-blue font-semibold">+ Thêm phòng</span>
                    </div>
                  ))}

                  {/* Danh sách cá nhân gợi ý */}
                  {matchedUsers.length > 0 && (
                    <div className="p-1.5 bg-slate-50 text-[10px] font-bold text-slate-500 uppercase">
                      👤 Chọn theo Cá Nhân:
                    </div>
                  )}
                  {matchedUsers.map(u => (
                    <div
                      key={`search-user-${u.id}`}
                      onClick={() => handleAddUserApprover(u)}
                      className="p-2 hover:bg-blue-50 flex items-center justify-between cursor-pointer transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <UserIcon className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                        <div>
                          <span className="font-bold text-slate-900 text-xs">{u.name}</span>
                          <span className="text-[11px] text-slate-400 ml-1.5">({u.roleTitle} - {u.department})</span>
                        </div>
                      </div>
                      <span className="text-[10px] text-brand-blue font-semibold">+ Thêm cá nhân</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* SECTION 3: NGƯỜI THEO DÕI (CC) */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-[4px] space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="block font-bold text-slate-700 text-xs">
                Người theo dõi (Cc)
              </label>
              <span className="text-[10px] font-bold px-2 py-0.5 bg-slate-200 text-slate-700 rounded-[3px]">
                {selectedCcUsers.length} người
              </span>
            </div>

            <div className="relative" ref={ccSearchRef}>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  value={ccSearchQuery}
                  onFocus={() => setIsCcDropdownOpen(true)}
                  onChange={(e) => {
                    setCcSearchQuery(e.target.value);
                    setIsCcDropdownOpen(true);
                  }}
                  placeholder="Gõ tìm nhanh người nhận thông báo tiến độ..."
                  className="w-full pl-8 pr-8 py-1.5 text-xs bg-white border border-slate-300 rounded-[3px] focus:outline-none focus:ring-1 focus:ring-brand-blue font-medium"
                />
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
              </div>

              {isCcDropdownOpen && (
                <div className="absolute top-full left-0 right-0 mt-1 max-h-48 overflow-y-auto bg-white border border-slate-200 rounded-[3px] shadow-xl z-50 divide-y divide-slate-100 animate-slide-down">
                  {filteredCcCandidates.length === 0 ? (
                    <div className="p-3 text-center text-slate-400 text-xs">
                      Không tìm thấy người dùng phù hợp
                    </div>
                  ) : (
                    filteredCcCandidates.map(u => {
                      const isAlreadyApprover = selectedApprovers.some(
                        a => a.type === 'USER' && (a.user.id === u.id || a.user.name.trim().toLowerCase() === u.name.trim().toLowerCase())
                      );
                      const isAlreadyCc = selectedCcUsers.some(
                        cc => cc.id === u.id || cc.name.trim().toLowerCase() === u.name.trim().toLowerCase()
                      );
                      const isDisabled = isAlreadyApprover || isAlreadyCc;

                      return (
                        <div
                          key={`cc-${u.id}`}
                          onClick={() => {
                            if (!isDisabled) {
                              handleAddCcUser(u);
                            }
                          }}
                          className={`p-2 flex items-center justify-between transition-colors ${
                            isDisabled 
                              ? 'bg-slate-50 opacity-40 cursor-not-allowed select-none' 
                              : 'hover:bg-blue-50 cursor-pointer'
                          }`}
                        >
                          <div>
                            <span className={`font-bold text-xs ${isDisabled ? 'text-slate-400' : 'text-slate-800'}`}>
                              {u.name}
                            </span>
                            <span className="text-[11px] text-slate-400 ml-1.5">
                              ({u.roleTitle} - {u.department})
                            </span>
                          </div>

                          {isAlreadyApprover ? (
                            <span className="text-[10px] text-blue-700 font-bold px-1.5 py-0.5 bg-blue-100 rounded-[2px]">
                              Đang là Người duyệt
                            </span>
                          ) : isAlreadyCc ? (
                            <span className="text-[10px] text-slate-500 font-bold px-1.5 py-0.5 bg-slate-200 rounded-[2px]">
                              Đã chọn Cc
                            </span>
                          ) : (
                            <span className="text-[10px] text-brand-blue font-semibold">
                              + Thêm Cc
                            </span>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>

            {selectedCcUsers.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {selectedCcUsers.map(u => (
                  <span
                    key={u.id}
                    className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-white border border-slate-300 rounded-[2px] text-[11px] font-semibold text-slate-800"
                  >
                    <span>{u.name}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveCcUser(u.id)}
                      className="text-slate-400 hover:text-red-500 cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* SECTION 4: NỘI DUNG TỜ TRÌNH */}
          <div className="space-y-1">
            <label className="block font-bold text-slate-700 text-xs">
              Nội dung chi tiết (Rich Text)
            </label>
            <QuillEditor
              value={contentHtml}
              onChange={setContentHtml}
              placeholder="Nhập nội dung tờ trình, căn cứ, điều khoản..."
              minHeight="120px"
            />
          </div>

          {/* SECTION 5: TỆP ĐÍNH KÈM & SCAN */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="font-bold text-slate-700 text-xs">
                Tệp đính kèm & File scan (DMS)
              </label>
              <label className={`cursor-pointer px-3 py-1 text-white font-bold text-xs rounded-[3px] flex items-center gap-1.5 transition-colors shadow-xs ${
                isUploading ? 'bg-slate-400 cursor-not-allowed' : 'bg-brand-blue hover:bg-brand-blue-dark'
              }`}>
                {isUploading ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Đang tải lên Cloud...</span>
                  </>
                ) : (
                  <>
                    <Upload className="h-3.5 w-3.5" />
                    <span>Tải File Lên Cloud</span>
                  </>
                )}
                <input
                  type="file"
                  multiple
                  disabled={isUploading}
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </div>

            {attachments.length === 0 ? (
              <div className="p-3 border-2 border-dashed border-slate-200 rounded-[3px] text-center bg-slate-50">
                <p className="text-slate-500 text-[11px]">Chưa có tệp tải lên (Hệ thống sẽ đính kèm bản dự thảo mẫu)</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-32 overflow-y-auto">
                {attachments.map((att) => (
                  <div
                    key={att.id}
                    className="p-1.5 bg-slate-50 border border-slate-200 rounded-[2px] flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-1.5 min-w-0">
                      <FileText className="h-3.5 w-3.5 text-brand-blue shrink-0" />
                      <span className="font-semibold text-slate-800 truncate">{att.name}</span>
                      {att.url && att.url.startsWith('http') && (
                        <span className="px-1 py-0.2 bg-emerald-50 text-emerald-700 border border-emerald-200 text-[9px] font-bold rounded-[2px] flex items-center gap-0.5">
                          <Cloud className="h-2.5 w-2.5" />
                          <span>Cloud</span>
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => setPreviewAttachment(att)}
                        className="text-slate-400 hover:text-brand-blue p-0.5"
                        title="Xem tài liệu"
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => removeAttachment(att.id)}
                        className="text-slate-400 hover:text-brand-red p-0.5"
                        title="Xóa tệp"
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
          <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-1.5 bg-white text-slate-700 border border-slate-300 rounded-[3px] font-semibold hover:bg-slate-50 transition-colors cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-1.5 bg-brand-red hover:bg-brand-red-dark text-white font-bold uppercase tracking-wider rounded-[3px] shadow-sm transition-all cursor-pointer"
            >
              Gửi Trình Ký
            </button>
          </div>

        </form>

        {/* PDF Viewer Modal */}
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
