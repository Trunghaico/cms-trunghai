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
  CheckCircle2,
  Flame,
  Check
} from 'lucide-react';
import { useDocument } from '../../context/DocumentContext';
import { ApprovalStep, DocumentStatus, Attachment, User, UserRole, OverdueAction, WorkflowTemplate, DocumentPriority } from '../../types';
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
  
  // 3. Dự án & Độ khẩn
  const [project, setProject] = useState('');
  const [priority, setPriority] = useState<DocumentPriority>('NORMAL');
  
  // 4. Phòng ban khởi tạo (Thẻ select)
  const [department, setDepartment] = useState(activeUser?.department || 'Phòng Kỹ thuật & Dự án');

  // Chính sách xử lý quá hạn mặc định
  const [docOverdueAction, setDocOverdueAction] = useState<OverdueAction>('WARN_AND_RETURN');
  
  // 5. Chuỗi người / phòng ban xét duyệt
  const [selectedApprovers, setSelectedApprovers] = useState<ApproverItem[]>([]);
  const [approverSearchQuery, setApproverSearchQuery] = useState('');
  const [isApproverDropdownOpen, setIsApproverDropdownOpen] = useState(false);
  const approverSearchRef = useRef<HTMLDivElement>(null);

  const isAdmin = activeUser?.role === 'ADMIN';

  // Helper lấy SLA mặc định của phòng ban
  const getDeptDefaultSla = useCallback((deptName: string): number => {
    const found = systemDepts?.find(d => d.name.toLowerCase() === deptName.toLowerCase());
    return found?.defaultSlaHours || 8;
  }, [systemDepts]);

  // Helper lấy chính sách quá hạn mặc định của phòng ban
  const getDeptDefaultOverdueAction = useCallback((deptName: string): OverdueAction => {
    const found = systemDepts?.find(d => d.name.toLowerCase() === deptName.toLowerCase());
    return found?.defaultOverdueAction || 'WARN_AND_RETURN';
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
    return fromUsers.map((name, idx) => ({ id: `dept-${idx}`, name, code: `PB${idx+1}`, defaultSlaHours: 8, defaultOverdueAction: 'WARN_AND_RETURN' as OverdueAction }));
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

  // Helper kiểm tra xem phòng ban đã được chọn trong chuỗi duyệt chưa (loại trừ bước hiện tại nếu đang sửa)
  const isDepartmentAlreadyChosen = useCallback((deptName: string, excludeIdx: number = -1): boolean => {
    return selectedApprovers.some((a, i) => 
      i !== excludeIdx && 
      a.type === 'DEPARTMENT' && 
      a.departmentName.trim().toLowerCase() === deptName.trim().toLowerCase()
    );
  }, [selectedApprovers]);

  // Helper kiểm tra xem cá nhân đã được chọn trong chuỗi duyệt chưa (loại trừ bước hiện tại nếu đang sửa)
  const isUserAlreadyChosen = useCallback((userId: string, excludeIdx: number = -1): boolean => {
    return selectedApprovers.some((a, i) => 
      i !== excludeIdx && 
      a.type === 'USER' && 
      a.user.id === userId
    );
  }, [selectedApprovers]);

  // Helper kiểm tra cá nhân đã nằm trong danh sách CC chưa
  const isUserInCc = useCallback((userId: string): boolean => {
    return selectedCcUsers.some(u => u.id === userId);
  }, [selectedCcUsers]);

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

    // Tự động điền chuỗi duyệt từ mẫu (Tự động lọc bỏ các phòng ban bị trùng lặp trong cấu hình mẫu)
    const seenDepts = new Set<string>();
    const mappedSteps: ApproverItem[] = [];

    for (const s of tpl.steps) {
      const dName = s.department;
      const dKey = dName.trim().toLowerCase();
      if (seenDepts.has(dKey)) continue;
      seenDepts.add(dKey);

      const deptObj = systemDepts?.find(d => d.name.toLowerCase() === dName.toLowerCase());
      const isBoard = dName.toLowerCase().startsWith('ban ') || 
                      dName.toLowerCase().includes('ban qlda') || 
                      dName.toLowerCase().includes('ban kiểm soát') ||
                      dName.toLowerCase().includes('ban điều hành');
      mappedSteps.push({
        type: 'DEPARTMENT',
        departmentName: dName,
        departmentCode: deptObj?.code || 'PB',
        title: s.title || (isBoard ? `Ban ${dName}` : `Phòng ${dName}`),
        slaHours: s.slaHours || deptObj?.defaultSlaHours || getDeptDefaultSla(dName),
        overdueAction: s.overdueAction || deptObj?.defaultOverdueAction || getDeptDefaultOverdueAction(dName),
        isInternalCheck: !!s.isInternalCheck,
        requiresInternalCheck: !!s.isInternalCheck
      });
    }

    setSelectedApprovers(mappedSteps);
  }, [workflowTemplates, systemDepts, getDeptDefaultSla, getDeptDefaultOverdueAction]);

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


  // Thêm người duyệt là CÁ NHÂN (Kiểm tra tránh chọn trùng người đã có trong chuỗi duyệt hoặc Cc)
  const handleAddUserApprover = (user: User) => {
    setErrorMsg('');
    if (isUserInCc(user.id)) {
      setErrorMsg(`"${user.name}" đang nằm trong danh sách Người theo dõi (Cc). Không thể chọn làm người phê duyệt.`);
      return;
    }

    if (isUserAlreadyChosen(user.id)) {
      setErrorMsg(`Người phê duyệt "${user.name}" đã có trong chuỗi phê duyệt. Không được chọn trùng lần nữa để tránh sai quy trình.`);
      return;
    }

    const sla = getDeptDefaultSla(user.department);
    const overdueAct = getDeptDefaultOverdueAction(user.department);
    setSelectedApprovers(prev => [
      ...prev,
      { type: 'USER', user, title: user.name, slaHours: sla, overdueAction: overdueAct }
    ]);
    setApproverSearchQuery('');
    setIsApproverDropdownOpen(false);
  };

  // Thêm người duyệt là PHÒNG BAN (Kiểm tra tránh chọn trùng phòng ban đã có trong chuỗi duyệt)
  const handleAddDeptApprover = (dept: { id: string; name: string; code: string; defaultSlaHours?: number; defaultOverdueAction?: OverdueAction }) => {
    setErrorMsg('');
    if (isDepartmentAlreadyChosen(dept.name)) {
      setErrorMsg(`Phòng ban "${dept.name}" đã có trong chuỗi phê duyệt. Không được chọn trùng lần nữa để tránh sai quy trình.`);
      return;
    }

    const sla = dept.defaultSlaHours || getDeptDefaultSla(dept.name);
    const overdueAct = dept.defaultOverdueAction || getDeptDefaultOverdueAction(dept.name);
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
        overdueAction: overdueAct,
        requiresInternalCheck: true
      }
    ]);
    setApproverSearchQuery('');
    setIsApproverDropdownOpen(false);
  };

  // Cập nhật SLA số giờ cho từng bước (Chỉ Admin)
  const handleUpdateStepSla = (idx: number, hours: number) => {
    if (!isAdmin) return;
    setSelectedApprovers(prev => prev.map((item, i) => i === idx ? { ...item, slaHours: Math.max(1, hours) } : item));
  };

  // Cập nhật hành vi quá hạn cho từng bước (Chỉ Admin)
  const handleUpdateStepOverdueAction = (idx: number, action: OverdueAction) => {
    if (!isAdmin) return;
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

  // Đổi lựa chọn trong bước (Kiểm tra tránh chọn trùng với các bước khác)
  const handleChangeStepTarget = (idx: number, value: string) => {
    setErrorMsg('');
    if (value.startsWith('USER:')) {
      const uId = value.replace('USER:', '');
      if (isUserAlreadyChosen(uId, idx)) {
        const found = users.find(u => u.id === uId);
        setErrorMsg(`Người phê duyệt "${found?.name || uId}" đã được chọn ở bước khác. Mỗi người chỉ tham gia duyệt 1 lần.`);
        return;
      }
      if (isUserInCc(uId)) {
        const found = users.find(u => u.id === uId);
        setErrorMsg(`"${found?.name || uId}" đang nằm trong danh sách Người theo dõi (Cc). Không thể chọn làm người phê duyệt.`);
        return;
      }
      const foundUser = users.find(u => u.id === uId);
      if (foundUser) {
        const sla = getDeptDefaultSla(foundUser.department);
        const overdueAct = getDeptDefaultOverdueAction(foundUser.department);
        setSelectedApprovers(prev => prev.map((item, i) => i === idx ? { 
          ...item, 
          type: 'USER', 
          user: foundUser, 
          title: foundUser.name,
          slaHours: isAdmin ? (item.slaHours || sla) : sla,
          overdueAction: isAdmin ? (item.overdueAction || overdueAct) : overdueAct
        } : item));
      }
    } else if (value.startsWith('DEPT:')) {
      const deptName = value.replace('DEPT:', '');
      if (isDepartmentAlreadyChosen(deptName, idx)) {
        setErrorMsg(`Phòng ban "${deptName}" đã được chọn ở bước khác. Mỗi phòng ban chỉ tham gia duyệt 1 lần.`);
        return;
      }
      const deptObj = allDepartments.find(d => d.name === deptName);
      const sla = (deptObj as any)?.defaultSlaHours || getDeptDefaultSla(deptName);
      const overdueAct = (deptObj as any)?.defaultOverdueAction || getDeptDefaultOverdueAction(deptName);
      setSelectedApprovers(prev => prev.map((item, i) => i === idx ? { 
        ...item,
        type: 'DEPARTMENT', 
        departmentName: deptName, 
        departmentCode: (deptObj as any)?.code || 'PB',
        title: `Phòng ${deptName}`,
        slaHours: isAdmin ? (item.slaHours || sla) : sla,
        overdueAction: isAdmin ? (item.overdueAction || overdueAct) : overdueAct
      } : item));
    }
  };

  // Thêm người theo dõi (Cc)
  const handleAddCcUser = (user: User) => {
    setErrorMsg('');
    if (isUserAlreadyChosen(user.id)) {
      setErrorMsg(`"${user.name}" đang là Người xét duyệt trong chuỗi phê duyệt.`);
      return;
    }

    if (selectedCcUsers.some(u => u.id === user.id)) {
      setErrorMsg(`"${user.name}" đã có trong danh sách Người theo dõi (Cc).`);
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

    // Kiểm tra tính toàn vẹn: Không cho phép chọn trùng phòng ban hoặc người duyệt
    const deptSet = new Set<string>();
    const userSet = new Set<string>();
    for (const item of selectedApprovers) {
      if (item.type === 'DEPARTMENT') {
        const d = item.departmentName.trim().toLowerCase();
        if (deptSet.has(d)) {
          setErrorMsg(`Phòng ban "${item.departmentName}" bị trùng lặp trong quy trình phê duyệt. Mỗi phòng ban chỉ tham gia duyệt 1 lần.`);
          return;
        }
        deptSet.add(d);
      } else if (item.type === 'USER') {
        if (userSet.has(item.user.id)) {
          setErrorMsg(`Người duyệt "${item.user.name}" bị trùng lặp trong quy trình phê duyệt. Mỗi cá nhân chỉ tham gia duyệt 1 lần.`);
          return;
        }
        userSet.add(item.user.id);
      }
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
      priority,
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
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/70 backdrop-blur-md p-0 sm:p-4 overflow-hidden pt-safe pb-safe">
      <div 
        className={`bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl border border-slate-200/90 w-full max-w-4xl h-[94vh] sm:max-h-[92vh] flex flex-col overflow-hidden transition-all duration-200 transform ${
          isClosing ? 'opacity-0 scale-95' : 'opacity-100 scale-100 animate-slide-down'
        }`}
      >
        
        {/* Modal Header */}
        <div className="px-4 sm:px-6 py-3.5 bg-gradient-to-r from-slate-900 via-indigo-950 to-brand-blue text-white flex items-center justify-between border-b border-indigo-900/60 shadow-xs shrink-0">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="p-2 bg-white/10 rounded-xl shadow-xs shrink-0">
              <FileText className="h-5 w-5 text-cyan-300" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold tracking-tight">Khởi Tạo Hồ Sơ Trình Ký</h2>
              <p className="text-[10.5px] sm:text-[11px] text-indigo-200">
                Thiết lập thông tin và cấu hình người / phòng ban phê duyệt
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="text-white/80 hover:text-white p-1.5 rounded-full hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body Form */}
        <form id="create-document-form" onSubmit={handleSubmit} className="p-3.5 sm:p-6 space-y-4 text-xs text-slate-800 flex-1 overflow-y-auto overflow-x-hidden max-w-full">
          
          {errorMsg && (
            <div className="p-3.5 bg-red-50 border border-red-200 text-red-700 flex items-center gap-2 rounded-xl text-xs">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span className="font-semibold">{errorMsg}</span>
            </div>
          )}

          {/* QUICK BPM WORKFLOW TEMPLATE SELECTOR (CHỌN NHANH QUY TRÌNH KÝ THEO LOẠI HỒ SƠ) */}
          <div className="bg-gradient-to-r from-slate-900 via-brand-navy to-indigo-950 p-5 rounded-2xl border border-indigo-500/30 text-white shadow-ai-card space-y-3">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                <div className="p-2 bg-white/10 rounded-xl text-amber-400 shrink-0">
                  <GitFork className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <div className="font-bold text-xs flex items-center gap-2 flex-wrap">
                    <span className="text-white">Mẫu Quy Trình Ký Chuẩn (BPM Engine)</span>
                    <span className="text-[10px] font-extrabold px-2 py-0.5 bg-amber-400 text-slate-950 rounded-full shadow-xs">
                      Tự Động Điền Form
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-300 mt-0.5 truncate">
                    Chọn mẫu quy trình tương ứng với Loại hồ sơ để nạp sẵn chuỗi phòng ban duyệt & SLA chuẩn
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 w-full md:w-auto md:min-w-[280px] shrink-0">
                <select
                  value={selectedTemplateId}
                  onChange={(e) => handleApplyTemplate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900/95 border border-blue-400/50 hover:border-amber-400 rounded-xl text-xs font-bold text-white focus:outline-none focus:ring-2 focus:ring-amber-400 cursor-pointer shadow-inner"
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
              <div className="pt-2.5 border-t border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-[11px] text-emerald-300 font-semibold">
                <span className="flex items-center gap-1.5 truncate">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                  <span>Đang áp dụng: <strong>{workflowTemplates.find(w => w.id === selectedTemplateId)?.name}</strong></span>
                </span>
                <span className="text-slate-300 bg-white/10 px-2.5 py-0.5 rounded-full shrink-0 text-center font-mono">
                  {selectedApprovers.length} cấp phê duyệt • Tổng SLA: {selectedApprovers.reduce((sum, s) => sum + (s.slaHours || 0), 0)}h
                </span>
              </div>
            )}
          </div>

          {/* SECTION 1: THÔNG TIN HỒ SƠ */}
          <div className="bg-slate-50/80 p-5 rounded-2xl border border-slate-200/80 space-y-3 shadow-2xs">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Loại hồ sơ <span className="text-brand-red">*</span>
                </label>
                <select
                  value={category}
                  onChange={(e) => handleCategoryChange(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue cursor-pointer transition-all"
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
                    className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-xl font-medium focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue transition-all"
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
                className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue transition-all"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {/* Phòng ban khởi tạo */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Phòng ban khởi tạo <span className="text-brand-red">*</span>
                </label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                  <select
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-xl font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue cursor-pointer transition-all"
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
                    className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-xl font-medium focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue transition-all"
                  />
                </div>
              </div>
            </div>

            {/* Độ khẩn / Mức độ ưu tiên */}
            <div className="pt-2 border-t border-slate-200">
              <label className="block font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                <span>Độ khẩn / Mức độ ưu tiên</span>
                <span className="text-slate-400 font-normal text-[11px]">(Phân loại để các ban ưu tiên xét duyệt đúng hạn)</span>
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <label 
                  className={`flex items-center justify-center gap-2 p-2.5 rounded-xl border cursor-pointer transition-all ${
                    priority === 'NORMAL' 
                      ? 'bg-slate-100 border-slate-400 text-slate-900 font-bold shadow-2xs ring-2 ring-slate-400/30' 
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <input 
                    type="radio" 
                    name="priority" 
                    value="NORMAL" 
                    checked={priority === 'NORMAL'} 
                    onChange={() => setPriority('NORMAL')}
                    className="sr-only" 
                  />
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
                  <span className="text-xs">Bình thường</span>
                </label>

                <label 
                  className={`flex items-center justify-center gap-2 p-2.5 rounded-xl border cursor-pointer transition-all ${
                    priority === 'URGENT' 
                      ? 'bg-amber-50 border-amber-400 text-amber-900 font-bold shadow-2xs ring-2 ring-amber-400/30' 
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-amber-50/50'
                  }`}
                >
                  <input 
                    type="radio" 
                    name="priority" 
                    value="URGENT" 
                    checked={priority === 'URGENT'} 
                    onChange={() => setPriority('URGENT')}
                    className="sr-only" 
                  />
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0" />
                  <span className="text-xs">Khẩn (Trong ngày)</span>
                </label>

                <label 
                  className={`flex items-center justify-center gap-2 p-2.5 rounded-xl border cursor-pointer transition-all ${
                    priority === 'VERY_URGENT' 
                      ? 'bg-red-50 border-brand-red text-brand-red font-bold shadow-2xs ring-2 ring-brand-red/30' 
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-red-50/50'
                  }`}
                >
                  <input 
                    type="radio" 
                    name="priority" 
                    value="VERY_URGENT" 
                    checked={priority === 'VERY_URGENT'} 
                    onChange={() => setPriority('VERY_URGENT')}
                    className="sr-only" 
                  />
                  <Flame className="w-3.5 h-3.5 text-brand-red shrink-0" />
                  <span className="text-xs font-bold text-brand-red">Hỏa tốc (Xử lý ngay)</span>
                </label>
              </div>
            </div>
          </div>

          {/* SECTION 2: NGƯỜI / PHÒNG BAN XÉT DUYỆT & SLA */}
          <div className="p-5 bg-blue-50/40 border border-brand-blue/30 rounded-2xl space-y-3 shadow-2xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-brand-blue" />
                <span className="font-bold text-brand-blue text-xs uppercase tracking-wider">
                  Người / Phòng ban xét duyệt & Thời gian SLA
                </span>
                <span className="text-[10px] font-bold px-2.5 py-0.5 bg-brand-blue text-white rounded-full">
                  {selectedApprovers.length} cấp duyệt
                </span>
              </div>
              {/* Cài đặt chính sách quá hạn */}
              {isAdmin ? (
                <div className="flex items-center gap-1.5 text-[11px] bg-white px-2.5 py-1 rounded-xl border border-blue-200 shadow-2xs">
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
              ) : (
                <div className="flex items-center gap-1.5 text-[11px] bg-white/80 px-2.5 py-1 rounded-xl border border-blue-200/80 shadow-2xs">
                  <span className="text-slate-500 font-medium">Chính sách xử lý quá hạn:</span>
                  <span className="font-bold text-brand-navy">Theo cấu hình của Ban Quản Trị</span>
                </div>
              )}
            </div>

            {/* Danh sách các bước duyệt với cấu hình SLA */}
            <div className="space-y-2.5">
              {selectedApprovers.length === 0 ? (
                <div className="p-5 border-2 border-dashed border-blue-200 bg-white/70 rounded-2xl text-center text-slate-400 text-xs">
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
                      className="p-3.5 bg-white border border-slate-200/90 hover:border-brand-blue/50 rounded-2xl shadow-xs transition-all space-y-3 max-w-full overflow-hidden"
                    >
                      {/* Dòng 1: STT, Nhãn loại duyệt, Nút di chuyển/xóa */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-[11px] text-white shrink-0 shadow-xs ${
                            isFirst ? 'bg-emerald-600' : isLast ? 'bg-brand-red' : 'bg-brand-blue'
                          }`}>
                            {idx + 1}
                          </span>
                          {item.type === 'DEPARTMENT' ? (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200/80 truncate">
                              🏢 Duyệt cấp Ban/Phòng
                            </span>
                          ) : (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200/80 truncate">
                              👤 Duyệt đích danh Cá nhân
                            </span>
                          )}
                        </div>

                        {/* Nút di chuyển lên/xuống và xóa */}
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            disabled={isFirst}
                            onClick={() => handleMoveApproverUp(idx)}
                            title="Đẩy lên trước"
                            className={`p-1.5 rounded-lg border ${
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
                            className={`p-1.5 rounded-lg border ${
                              isLast ? 'text-slate-200 border-slate-100 cursor-not-allowed' : 'text-slate-500 hover:text-brand-blue hover:bg-blue-50 border-slate-200 cursor-pointer'
                            }`}
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveApprover(idx)}
                            title="Xóa bước này"
                            className="p-1.5 text-slate-400 hover:text-brand-red hover:bg-red-50 border border-slate-200 rounded-lg transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Dòng 2: Dropdown Người/Phòng ban duyệt chiếm trọn bề ngang, không bị đè chữ */}
                      <div>
                        <select
                          value={currentValue}
                          onChange={(e) => handleChangeStepTarget(idx, e.target.value)}
                          className="w-full px-3 py-2 bg-slate-50 hover:bg-slate-100 focus:bg-white border border-slate-300 rounded-xl font-bold text-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-brand-blue/30 cursor-pointer truncate shadow-2xs"
                        >
                          <optgroup label="🏢 --- PHÒNG BAN XÉT DUYỆT ---">
                            {allDepartments.map(d => {
                              const isDuplicate = isDepartmentAlreadyChosen(d.name, idx);
                              return (
                                <option 
                                  key={`dept-${d.id}`} 
                                  value={`DEPT:${d.name}`}
                                  disabled={isDuplicate}
                                  className={isDuplicate ? 'text-slate-400 bg-slate-100' : ''}
                                >
                                  🏢 {d.name} ({d.code}) {isDuplicate ? ' — (⚠️ Đã chọn ở bước khác)' : (d.defaultSlaHours ? `— Chuẩn SLA: ${d.defaultSlaHours}h` : '')}
                                </option>
                              );
                            })}
                          </optgroup>
                          <optgroup label="👤 --- CÁ NHÂN CỤ THỂ ---">
                            {users.map(u => {
                              const isDuplicate = isUserAlreadyChosen(u.id, idx);
                              const isCc = isUserInCc(u.id);
                              const isDisabled = isDuplicate || isCc;
                              return (
                                <option 
                                  key={`user-${u.id}`} 
                                  value={`USER:${u.id}`}
                                  disabled={isDisabled}
                                  className={isDisabled ? 'text-slate-400 bg-slate-100' : ''}
                                >
                                  👤 {u.name} — {u.roleTitle} ({u.department}) {isDuplicate ? ' — (⚠️ Đã chọn ở bước khác)' : isCc ? ' — (⚠️ Đang là Cc)' : ''}
                                </option>
                              );
                            })}
                          </optgroup>
                        </select>
                      </div>

                      {/* Dòng 3: Cài đặt thời gian SLA và Hành vi quá hạn cho bước này */}
                      <div className="flex flex-wrap items-center justify-between gap-2 pt-2.5 border-t border-slate-100 text-[11px]">
                        {/* SLA Picker */}
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                          <span className="font-semibold text-slate-600">SLA cam kết:</span>
                          {isAdmin ? (
                            <>
                              <input
                                type="number"
                                min="1"
                                max="168"
                                value={item.slaHours || 8}
                                onChange={(e) => handleUpdateStepSla(idx, parseInt(e.target.value) || 8)}
                                className="w-12 px-1 py-0.5 bg-amber-50/60 border border-amber-300 rounded-lg font-bold text-amber-900 text-center text-xs focus:bg-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                              />
                              <span className="text-slate-500 font-medium">giờ</span>

                              {/* Quick buttons */}
                              <div className="flex items-center gap-1 ml-1 flex-wrap">
                                {[4, 8, 12, 24, 48].map((h) => (
                                  <button
                                    key={h}
                                    type="button"
                                    onClick={() => handleUpdateStepSla(idx, h)}
                                    className={`px-2 py-0.5 rounded-md text-[10px] font-bold border transition-colors cursor-pointer ${
                                      (item.slaHours || 8) === h
                                        ? 'bg-amber-600 text-white border-amber-600 shadow-2xs'
                                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-amber-50 hover:text-amber-700'
                                    }`}
                                  >
                                    {h}h
                                  </button>
                                ))}
                              </div>
                            </>
                          ) : (
                            <span className="px-2.5 py-0.5 bg-amber-50 text-amber-900 border border-amber-200 rounded-full font-bold text-[11px] flex items-center gap-1 shadow-2xs">
                              {item.slaHours || 8} giờ <span className="text-[9.5px] font-normal text-amber-700">(Quy định)</span>
                            </span>
                          )}
                        </div>

                        {/* Overdue Action per step */}
                        <div className="flex items-center gap-1.5">
                          {isAdmin ? (
                            <>
                              <span className="text-slate-500 font-medium">Quá hạn:</span>
                              <select
                                value={item.overdueAction || docOverdueAction}
                                onChange={(e) => handleUpdateStepOverdueAction(idx, e.target.value as OverdueAction)}
                                className={`px-2 py-1 border rounded-lg font-semibold text-[10px] cursor-pointer focus:outline-none ${
                                  (item.overdueAction || docOverdueAction) === 'AUTO_APPROVE'
                                    ? 'bg-purple-50 text-purple-700 border-purple-200'
                                    : 'bg-orange-50 text-orange-700 border-orange-200'
                                }`}
                              >
                                <option value="WARN_AND_RETURN">⚠️ Cảnh báo & Trả hồ sơ</option>
                                <option value="AUTO_APPROVE">⚡ Tự động phê duyệt</option>
                              </select>
                            </>
                          ) : (
                            <span className={`px-2.5 py-0.5 border rounded-full font-semibold text-[10px] shadow-2xs ${
                              (item.overdueAction || docOverdueAction) === 'AUTO_APPROVE'
                                ? 'bg-purple-50 text-purple-700 border-purple-200'
                                : 'bg-orange-50 text-orange-700 border-orange-200'
                            }`}>
                              {(item.overdueAction || docOverdueAction) === 'AUTO_APPROVE' 
                                ? '⚡ Quá hạn: Tự động duyệt' 
                                : '⚠️ Quá hạn: Cảnh báo & Trả'}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Ô tìm kiếm THÊM NHANH */}
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
                  className="w-full pl-9 pr-8 py-2 text-xs bg-white border border-blue-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue font-medium transition-all"
                />
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
              </div>

              {isApproverDropdownOpen && (
                <div className="absolute top-full left-0 right-0 mt-1 max-h-56 overflow-y-auto bg-white border border-slate-200 rounded-2xl shadow-xl z-50 divide-y divide-slate-100 animate-slide-down">
                  {matchedDepartments.length > 0 && (
                    <div className="p-2 bg-slate-50 text-[10px] font-bold text-slate-500 uppercase flex items-center justify-between">
                      <span>🏢 Chọn theo Phòng Ban:</span>
                      <span className="text-[9px] text-slate-400 font-normal">Mỗi phòng chỉ duyệt 1 lần</span>
                    </div>
                  )}
                  {matchedDepartments.map(dept => {
                    const isSelected = isDepartmentAlreadyChosen(dept.name);
                    return (
                      <div
                        key={`search-dept-${dept.id}`}
                        onClick={() => {
                          if (isSelected) {
                            setErrorMsg(`Phòng ban "${dept.name}" đã có trong chuỗi phê duyệt. Không được chọn trùng lần nữa.`);
                            return;
                          }
                          handleAddDeptApprover(dept);
                        }}
                        className={`p-2.5 flex items-center justify-between transition-colors ${
                          isSelected 
                            ? 'bg-slate-50/80 text-slate-400 cursor-not-allowed opacity-75' 
                            : 'hover:bg-blue-50 cursor-pointer'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <Building2 className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-slate-400' : 'text-brand-blue'}`} />
                          <span className={`text-xs ${isSelected ? 'font-medium text-slate-500' : 'font-bold text-slate-900'}`}>
                            {dept.name} ({dept.code})
                          </span>
                        </div>
                        {isSelected ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 bg-slate-200 text-slate-600 rounded-full flex items-center gap-1">
                            <Check className="w-3 h-3 text-emerald-600" /> Đã có trong chuỗi duyệt
                          </span>
                        ) : (
                          <span className="text-[10px] text-brand-blue font-semibold hover:underline">+ Thêm phòng</span>
                        )}
                      </div>
                    );
                  })}

                  {matchedUsers.length > 0 && (
                    <div className="p-2 bg-slate-50 text-[10px] font-bold text-slate-500 uppercase flex items-center justify-between">
                      <span>👤 Chọn theo Cá Nhân:</span>
                      <span className="text-[9px] text-slate-400 font-normal">Mỗi người chỉ duyệt 1 lần</span>
                    </div>
                  )}
                  {matchedUsers.map(u => {
                    const isSelected = isUserAlreadyChosen(u.id);
                    const isCc = isUserInCc(u.id);
                    const isDisabled = isSelected || isCc;

                    return (
                      <div
                        key={`search-user-${u.id}`}
                        onClick={() => {
                          if (isSelected) {
                            setErrorMsg(`Người phê duyệt "${u.name}" đã có trong chuỗi phê duyệt. Không được chọn trùng lần nữa.`);
                            return;
                          }
                          if (isCc) {
                            setErrorMsg(`"${u.name}" đang nằm trong danh sách Người theo dõi (Cc). Không thể chọn làm người phê duyệt.`);
                            return;
                          }
                          handleAddUserApprover(u);
                        }}
                        className={`p-2.5 flex items-center justify-between transition-colors ${
                          isDisabled 
                            ? 'bg-slate-50/80 text-slate-400 cursor-not-allowed opacity-75' 
                            : 'hover:bg-blue-50 cursor-pointer'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <UserIcon className={`w-3.5 h-3.5 shrink-0 ${isDisabled ? 'text-slate-400' : 'text-slate-500'}`} />
                          <div>
                            <span className={`text-xs ${isDisabled ? 'font-medium text-slate-500' : 'font-bold text-slate-900'}`}>{u.name}</span>
                            <span className="text-[11px] text-slate-400 ml-1.5">({u.roleTitle} - {u.department})</span>
                          </div>
                        </div>
                        {isSelected ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 bg-slate-200 text-slate-600 rounded-full flex items-center gap-1">
                            <Check className="w-3 h-3 text-emerald-600" /> Đã có trong chuỗi duyệt
                          </span>
                        ) : isCc ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full">
                            Đang là Cc
                          </span>
                        ) : (
                          <span className="text-[10px] text-brand-blue font-semibold hover:underline">+ Thêm cá nhân</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* SECTION 3: NGƯỜI THEO DÕI (CC) */}
          <div className="p-4 bg-slate-50/80 border border-slate-200/80 rounded-2xl space-y-2.5 shadow-2xs">
            <div className="flex items-center justify-between">
              <label className="block font-bold text-slate-700 text-xs">
                Người theo dõi (Cc)
              </label>
              <span className="text-[10px] font-bold px-2.5 py-0.5 bg-slate-200 text-slate-700 rounded-full">
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
                  className="w-full pl-9 pr-8 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue font-medium transition-all"
                />
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
              </div>

              {isCcDropdownOpen && (
                <div className="absolute top-full left-0 right-0 mt-1 max-h-48 overflow-y-auto bg-white border border-slate-200 rounded-2xl shadow-xl z-50 divide-y divide-slate-100 animate-slide-down">
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
                          className={`p-2.5 flex items-center justify-between transition-colors ${
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
                            <span className="text-[10px] text-blue-700 font-bold px-2 py-0.5 bg-blue-100 rounded-full">
                              Đang là Người duyệt
                            </span>
                          ) : isAlreadyCc ? (
                            <span className="text-[10px] text-slate-500 font-bold px-2 py-0.5 bg-slate-200 rounded-full">
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
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white border border-slate-300 rounded-full text-[11px] font-semibold text-slate-800 shadow-2xs"
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
          <div className="space-y-1.5">
            <label className="block font-bold text-slate-700 text-xs">
              Nội dung chi tiết (Rich Text)
            </label>
            <div className="rounded-2xl overflow-hidden border border-slate-200/80">
              <QuillEditor
                value={contentHtml}
                onChange={setContentHtml}
                placeholder="Nhập nội dung tờ trình, căn cứ, điều khoản..."
                minHeight="120px"
              />
            </div>
          </div>

          {/* SECTION 5: TỆP ĐÍNH KÈM & SCAN */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="font-bold text-slate-700 text-xs">
                Tệp đính kèm & File scan (DMS)
              </label>
              <label className={`cursor-pointer px-3.5 py-1.5 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all shadow-xs active:scale-98 ${
                isUploading ? 'bg-slate-400 cursor-not-allowed' : 'bg-brand-blue hover:bg-brand-blue-dark shadow-glow-blue'
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
              <div className="p-4 border-2 border-dashed border-slate-200 rounded-2xl text-center bg-slate-50/80">
                <p className="text-slate-500 text-[11px]">Chưa có tệp tải lên (Hệ thống sẽ đính kèm bản dự thảo mẫu)</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-32 overflow-y-auto">
                {attachments.map((att) => (
                  <div
                    key={att.id}
                    className="p-2 bg-slate-50 border border-slate-200/90 rounded-xl flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <FileText className="h-4 w-4 text-brand-blue shrink-0" />
                      <span className="font-semibold text-slate-800 truncate">{att.name}</span>
                      {att.url && att.url.startsWith('http') && (
                        <span className="px-1.5 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 text-[9px] font-bold rounded-full flex items-center gap-0.5">
                          <Cloud className="h-2.5 w-2.5" />
                          <span>Cloud</span>
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => setPreviewAttachment(att)}
                        className="text-slate-400 hover:text-brand-blue p-1 rounded-lg"
                        title="Xem tài liệu"
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => removeAttachment(att.id)}
                        className="text-slate-400 hover:text-brand-red p-1 rounded-lg"
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

        </form>

        {/* Fixed Form Actions Footer (Always visible) */}
        <div className="px-4 sm:px-6 py-3 bg-slate-50 border-t border-slate-200/80 flex items-center justify-end gap-3 shrink-0 pb-[max(env(safe-area-inset-bottom,0px),12px)]">
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-2 bg-white text-slate-700 border border-slate-300 rounded-xl font-semibold hover:bg-slate-100 transition-colors cursor-pointer"
          >
            Hủy
          </button>
          <button
            type="submit"
            form="create-document-form"
            disabled={isSubmitting}
            className="px-6 py-2 bg-gradient-to-r from-brand-red to-red-600 hover:from-red-600 hover:to-brand-red text-white font-bold uppercase tracking-wider rounded-xl shadow-glow-red transition-all cursor-pointer active:scale-98"
          >
            Gửi Trình Ký
          </button>
        </div>

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
