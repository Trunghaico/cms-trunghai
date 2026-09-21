import { PermissionId, PermissionDefinition, PermissionCategory, UserRole, User, ApprovalStep, DocumentItem, NotificationItem } from '../types';

export const PERMISSION_CATEGORIES: { id: PermissionCategory; name: string; iconName: string; description: string }[] = [
  {
    id: 'DOCUMENT',
    name: 'Hồ Sơ & Trình Ký',
    iconName: 'FileText',
    description: 'Quyền khởi tạo, xem, chỉnh sửa và quản lý các loại hồ sơ, hợp đồng điện tử'
  },
  {
    id: 'APPROVAL',
    name: 'Ký Số & Phê Duyệt',
    iconName: 'CheckSquare',
    description: 'Quyền tham gia quy trình xét duyệt, ký số và từ chối hồ sơ'
  },
  {
    id: 'WORKFLOW',
    name: 'Quy Trình BPM',
    iconName: 'GitFork',
    description: 'Quyền xem và cấu hình lưu đồ quy trình xét duyệt tự động'
  },
  {
    id: 'DMS',
    name: 'Kho Lưu Trữ DMS',
    iconName: 'Archive',
    description: 'Quyền truy cập và xuất dữ liệu lưu trữ tài liệu đã số hóa'
  },
  {
    id: 'USER_ADMIN',
    name: 'Người Dùng & Phân Quyền',
    iconName: 'Users',
    description: 'Quyền quản lý tài khoản nhân sự và phân bổ ma trận quyền'
  },
  {
    id: 'SYSTEM',
    name: 'Hệ Thống & Báo Cáo',
    iconName: 'BarChart3',
    description: 'Quyền xem Dashboard KPI thống kê và nhật ký hoạt động (Audit Logs)'
  }
];

export const ALL_PERMISSIONS: PermissionDefinition[] = [
  // Nhóm Hồ Sơ & Trình Ký
  {
    id: 'doc.view',
    name: 'Xem danh sách hồ sơ',
    code: 'DOC_VIEW',
    description: 'Xem các hồ sơ cá nhân tạo hoặc được chia sẻ theo dõi (Cc)',
    category: 'DOCUMENT',
  },
  {
    id: 'doc.view_all',
    name: 'Xem toàn bộ hồ sơ công ty',
    code: 'DOC_VIEW_ALL',
    description: 'Xem được hồ sơ của tất cả các phòng ban trong toàn hệ thống',
    category: 'DOCUMENT',
  },
  {
    id: 'doc.create',
    name: 'Tạo mới & Trình ký',
    code: 'DOC_CREATE',
    description: 'Khởi tạo hồ sơ, hợp đồng mới và gửi luồng phê duyệt',
    category: 'DOCUMENT',
  },
  {
    id: 'doc.edit',
    name: 'Chỉnh sửa hồ sơ',
    code: 'DOC_EDIT',
    description: 'Sửa nội dung khi hồ sơ ở dạng nháp hoặc được yêu cầu bổ sung',
    category: 'DOCUMENT',
  },
  {
    id: 'doc.delete',
    name: 'Xóa hồ sơ',
    code: 'DOC_DELETE',
    description: 'Xóa hồ sơ bản nháp hoặc hủy bỏ hồ sơ không hợp lệ',
    category: 'DOCUMENT',
  },
  {
    id: 'doc.print_export',
    name: 'In & Xuất file PDF',
    code: 'DOC_EXPORT',
    description: 'In phiếu trình ký và tải xuống tài liệu PDF đính kèm',
    category: 'DOCUMENT',
  },

  // Nhóm Phê Duyệt & Ký Số
  {
    id: 'approval.approve',
    name: 'Ký số & Phê duyệt',
    code: 'APP_APPROVE',
    description: 'Thực hiện ký điện tử và chấp thuận bước duyệt được phân công',
    category: 'APPROVAL',
  },
  {
    id: 'approval.reject',
    name: 'Từ chối phê duyệt',
    code: 'APP_REJECT',
    description: 'Từ chối hồ sơ kèm lý do phản hồi cho người lập',
    category: 'APPROVAL',
  },
  {
    id: 'approval.request_info',
    name: 'Yêu cầu bổ sung',
    code: 'APP_REQ_INFO',
    description: 'Gửi yêu cầu người lập cập nhật tài liệu hoặc chỉnh sửa tờ trình',
    category: 'APPROVAL',
  },
  {
    id: 'approval.override',
    name: 'Phê duyệt vượt cấp / Đặc cách',
    code: 'APP_OVERRIDE',
    description: 'Thẩm quyền duyệt khẩn cấp hoặc xử lý thay khi người phụ trách vắng mặt',
    category: 'APPROVAL',
  },

  // Nhóm Quy Trình BPM
  {
    id: 'workflow.view',
    name: 'Xem lưu đồ quy trình',
    code: 'WF_VIEW',
    description: 'Xem các mẫu quy trình luồng duyệt tiêu chuẩn của công ty',
    category: 'WORKFLOW',
  },
  {
    id: 'workflow.manage',
    name: 'Cấu hình quy trình BPM',
    code: 'WF_MANAGE',
    description: 'Thêm, sửa, xóa hoặc thay đổi thứ tự các bước duyệt trong quy trình',
    category: 'WORKFLOW',
  },

  // Nhóm Kho DMS
  {
    id: 'dms.view',
    name: 'Truy cập Kho DMS',
    code: 'DMS_VIEW',
    description: 'Tra cứu tài liệu lưu trữ, hợp đồng đã hoàn tất phê duyệt',
    category: 'DMS',
  },
  {
    id: 'dms.export',
    name: 'Tải dữ liệu kho số',
    code: 'DMS_EXPORT',
    description: 'Tải tài liệu lưu trữ và file scan đính kèm',
    category: 'DMS',
  },

  // Nhóm Quản Trị Người Dùng
  {
    id: 'user.view',
    name: 'Xem danh sách tài khoản',
    code: 'USER_VIEW',
    description: 'Xem danh sách nhân sự và thông tin phòng ban',
    category: 'USER_ADMIN',
  },
  {
    id: 'user.create',
    name: 'Thêm người dùng mới',
    code: 'USER_CREATE',
    description: 'Tạo tài khoản và cấp mật khẩu ban đầu',
    category: 'USER_ADMIN',
  },
  {
    id: 'user.edit',
    name: 'Sửa & Phân quyền chi tiết',
    code: 'USER_EDIT_PERM',
    description: 'Điều chỉnh thông tin và tích chọn ma trận quyền cho nhân viên',
    category: 'USER_ADMIN',
  },
  {
    id: 'user.delete',
    name: 'Xóa tài khoản',
    code: 'USER_DELETE',
    description: 'Xóa hoặc thu hồi tài khoản nhân viên khỏi hệ thống',
    category: 'USER_ADMIN',
  },

  // Nhóm Hệ Thống & Báo Cáo
  {
    id: 'system.dashboard',
    name: 'Xem Dashboard tổng quan',
    code: 'SYS_DASHBOARD',
    description: 'Xem biểu đồ thống kê KPI, tình trạng xử lý hồ sơ toàn công ty',
    category: 'SYSTEM',
  },
  {
    id: 'system.audit_log',
    name: 'Xem nhật ký hệ thống',
    code: 'SYS_AUDIT',
    description: 'Tra cứu Audit Trail lịch sử ký duyệt và thời gian thao tác',
    category: 'SYSTEM',
  }
];

// Danh sách các mẫu quyền gán sẵn (Role Presets) giúp Admin gán nhanh
export const ROLE_PRESET_PERMISSIONS: Record<UserRole, PermissionId[]> = {
  STAFF: [
    'doc.view',
    'doc.create',
    'doc.edit',
    'doc.print_export',
    'workflow.view',
    'dms.view',
    'system.dashboard',
    'system.audit_log'
  ],
  DEPT_HEAD: [
    'doc.view',
    'doc.create',
    'doc.edit',
    'doc.print_export',
    'approval.approve',
    'approval.reject',
    'approval.request_info',
    'workflow.view',
    'dms.view',
    'system.dashboard',
    'system.audit_log'
  ],
  CHIEF_ACCOUNTANT: [
    'doc.view',
    'doc.create',
    'doc.edit',
    'doc.print_export',
    'approval.approve',
    'approval.reject',
    'approval.request_info',
    'workflow.view',
    'dms.view',
    'dms.export',
    'system.dashboard',
    'system.audit_log'
  ],
  LEGAL_DEPT: [
    'doc.view',
    'doc.create',
    'doc.edit',
    'doc.print_export',
    'approval.approve',
    'approval.reject',
    'approval.request_info',
    'workflow.view',
    'workflow.manage',
    'dms.view',
    'dms.export',
    'system.dashboard',
    'system.audit_log'
  ],
  DIRECTOR: [
    'doc.view',
    'doc.view_all',
    'doc.create',
    'doc.edit',
    'doc.delete',
    'doc.print_export',
    'approval.approve',
    'approval.reject',
    'approval.request_info',
    'approval.override',
    'workflow.view',
    'workflow.manage',
    'dms.view',
    'dms.export',
    'user.view',
    'system.dashboard',
    'system.audit_log'
  ],
  ADMIN: [
    'doc.view',
    'doc.view_all',
    'doc.create',
    'doc.edit',
    'doc.delete',
    'doc.print_export',
    'approval.approve',
    'approval.reject',
    'approval.request_info',
    'approval.override',
    'workflow.view',
    'workflow.manage',
    'dms.view',
    'dms.export',
    'user.view',
    'user.create',
    'user.edit',
    'user.delete',
    'system.dashboard',
    'system.audit_log'
  ]
};

// Hàm kiểm tra quyền độc lập
export function hasPermission(user: User | null | undefined, permissionId: PermissionId): boolean {
  if (!user) return false;
  // Nếu là Admin hệ thống thì có toàn quyền mặc định
  if (user.role === 'ADMIN') return true;
  // Kiểm tra mảng permissions của user
  if (!user.permissions || !Array.isArray(user.permissions)) return false;
  return user.permissions.includes(permissionId);
}

// Kiểm tra user có ít nhất một trong các quyền
export function hasAnyPermission(user: User | null | undefined, permissionIds: PermissionId[]): boolean {
  if (!user) return false;
  if (user.role === 'ADMIN') return true;
  if (!user.permissions || !Array.isArray(user.permissions)) return false;
  return permissionIds.some(p => user.permissions.includes(p));
}

// Kiểm tra user có tất cả các quyền được yêu cầu
export function hasAllPermissions(user: User | null | undefined, permissionIds: PermissionId[]): boolean {
  if (!user) return false;
  if (user.role === 'ADMIN') return true;
  if (!user.permissions || !Array.isArray(user.permissions)) return false;
  return permissionIds.every(p => user.permissions.includes(p));
}

// 1. Kiểm tra người dùng có quyền theo dõi toàn bộ hồ sơ công ty (Ban Giám Đốc, Quản Trị Viên)
export function canUserOverseeAllDocuments(user: User | null | undefined): boolean {
  if (!user) return false;
  return user.role === 'ADMIN' || user.role === 'DIRECTOR' || (Array.isArray(user.permissions) && user.permissions.includes('doc.view_all'));
}

/**
 * Chuẩn hóa tên phòng ban để so khớp chính xác và linh hoạt
 */
export function normalizeDepartmentName(dept: string | null | undefined): string {
  if (!dept) return '';
  return dept
    .toLowerCase()
    .replace(/[–—\-]/g, ' ')
    .replace(/&/g, ' và ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * So khớp xem 2 tên phòng ban có đại diện cho cùng một phòng ban không
 */
export function isSameDepartment(dept1?: string, dept2?: string): boolean {
  if (!dept1 || !dept2) return false;
  const n1 = normalizeDepartmentName(dept1);
  const n2 = normalizeDepartmentName(dept2);
  if (n1 === n2) return true;

  // Kế toán / Tài chính
  const isFinance = (n: string) => 
    (n.includes('tài chính') && n.includes('kế toán')) || 
    n === 'tckt' || 
    n.includes('phòng kế toán') || 
    n.includes('phòng tài chính');
  if (isFinance(n1) && isFinance(n2)) return true;

  // Pháp chế / Kiểm soát
  const isLegal = (n: string) => 
    n.includes('pháp chế') || 
    n === 'pcks';
  if (isLegal(n1) && isLegal(n2)) return true;

  // Ban Giám Đốc
  const isDirector = (n: string) => 
    n.includes('giám đốc') || 
    n === 'bgd';
  if (isDirector(n1) && isDirector(n2)) return true;

  // Kỹ thuật & Dự án
  const isTech = (n: string) => 
    (n.includes('kỹ thuật') && n.includes('dự án')) || 
    n === 'ktda' ||
    n.includes('kỹ thuật và dự án');
  if (isTech(n1) && isTech(n2)) return true;

  // CNTT / Hạ tầng / Công nghệ thông tin
  const isIT = (n: string) => 
    n.includes('cntt') || 
    n.includes('công nghệ thông tin') || 
    n.includes('hạ tầng');
  if (isIT(n1) && isIT(n2)) return true;

  // Cung ứng & Vật tư
  const isSupply = (n: string) => 
    n.includes('cung ứng') || 
    n.includes('vật tư') || 
    n === 'cuvt';
  if (isSupply(n1) && isSupply(n2)) return true;

  // Hành chính / Nhân sự
  const isHR = (n: string) => 
    n.includes('hành chính') || 
    n.includes('nhân sự') || 
    n === 'hcns';
  if (isHR(n1) && isHR(n2)) return true;

  return false;
}

// 2. Kiểm tra xem người dùng có phải là người duyệt của một bước cụ thể
// NGUYÊN TẮC: Hồ sơ trình cho phòng ban nào thì chỉ phòng ban đó mới được duyệt.
// Không phải ai có quyền duyệt hồ sơ cũng duyệt được.
export function isUserApproverForStep(user: User | null | undefined, step: ApprovalStep): boolean {
  if (!user || !step) return false;

  // Trường hợp 1: Chỉ định đích danh cá nhân duyệt
  if (step.approverId) {
    return step.approverId === user.id;
  }

  // Trường hợp 2: Trình cho PHÒNG BAN (step.department)
  // Thu thập toàn bộ vị trí & phòng ban của người dùng (chức vụ chính + kiêm nhiệm)
  const userPositions = [
    { department: user.department, role: user.role, roleTitle: user.roleTitle },
    ...(user.secondaryPositions || [])
  ];

  // BẮT BUỘC: Người dùng phải thuộc đúng phòng ban được trình
  const matchingPositions = userPositions.filter(pos => 
    isSameDepartment(pos.department, step.department)
  );

  // Không thuộc phòng ban được trình tới -> TUYỆT ĐỐI KHÔNG ĐƯỢC DUYỆT
  if (matchingPositions.length === 0) {
    return false;
  }

  // Thuộc phòng ban được trình tới -> Xét tiếp thẩm quyền ký duyệt
  const canApprove = hasPermission(user, 'approval.approve');
  if (!canApprove) return false;

  return matchingPositions.some(pos => {
    const isLeadershipRole = 
      pos.role === 'DEPT_HEAD' || 
      pos.role === 'CHIEF_ACCOUNTANT' || 
      pos.role === 'LEGAL_DEPT' || 
      pos.role === 'DIRECTOR' || 
      pos.role === 'ADMIN' ||
      pos.role === step.approverRole;

    const titleLower = pos.roleTitle?.toLowerCase() || '';
    const isLeadershipTitle = 
      titleLower.includes('trưởng') ||
      titleLower.includes('phó') ||
      titleLower.includes('giám đốc') ||
      titleLower.includes('kế toán trưởng') ||
      titleLower.includes('chủ quản') ||
      titleLower.includes('phụ trách');

    return isLeadershipRole || isLeadershipTitle || pos.role !== 'STAFF';
  });
}

// 3. Kiểm tra xem người dùng có phải là người duyệt trong bất kỳ bước nào của hồ sơ
export function isUserApproverForDoc(user: User | null | undefined, doc: DocumentItem): boolean {
  if (!user || !doc || !doc.steps) return false;
  return doc.steps.some(step => isUserApproverForStep(user, step));
}

// 4. Kiểm tra quyền xem hồ sơ:
// "Hồ sơ của ai lập thì chỉ có người lập và người phê duyệt với người theo dõi được thấy thôi. Còn lại các tài khoản khác sẽ không thấy của nhau."
export function canUserAccessDocument(user: User | null | undefined, doc: DocumentItem): boolean {
  if (!user || !doc) return false;

  // Người có quyền theo dõi toàn bộ hồ sơ (Ban Giám Đốc, Admin)
  if (canUserOverseeAllDocuments(user)) {
    return true;
  }

  // Người lập hồ sơ (Creator)
  if (doc.creatorId === user.id) {
    return true;
  }

  // Người theo dõi (Cc)
  if (doc.ccUsers && doc.ccUsers.some(cc => cc.id === user.id)) {
    return true;
  }

  // Người phê duyệt trong quy trình
  if (isUserApproverForDoc(user, doc)) {
    return true;
  }

  // Tất cả các tài khoản khác: Không thấy hồ sơ của nhau
  return false;
}

// 5. Kiểm tra quyền nhận thông báo:
// - Người thực hiện hành động (actor) KHÔNG tự nhận thông báo của chính mình ("người duyệt không cần nhận thông báo")
// - Người được yêu cầu phê duyệt nhận được thông báo trước khi/khi hồ sơ được gửi đến bước của họ
// - Sau khi duyệt xong, chỉ người lập hồ sơ (và người theo dõi Cc nếu có) nhận được thông báo
// - Người có quyền theo dõi toàn bộ hồ sơ (Admin, Director, doc.view_all) nhận được toàn bộ thông báo (trừ chính hành động của họ)
export function canUserReceiveNotification(
  user: User | null | undefined, 
  notif: NotificationItem, 
  doc?: DocumentItem
): boolean {
  if (!user) return false;

  // 1. Người thực hiện hành động KHÔNG tự nhận thông báo của chính mình:
  // "Sau khi duyệt thì chỉ người lập hồ sơ nhận được thông báo chứ người duyệt không cần nhận thông báo"
  if (notif.actorId && notif.actorId === user.id) {
    return false;
  }

  // 2. Người được phân quyền theo dõi toàn bộ hồ sơ (Ban Giám Đốc, Admin) nhận được thông báo
  if (canUserOverseeAllDocuments(user)) {
    return true;
  }

  // 3. Thông báo đích danh cho người nhận cụ thể (VD: người lập hồ sơ nhận kết quả duyệt, yêu cầu bổ sung)
  if (notif.recipientId && notif.recipientId === user.id) {
    return true;
  }
  if (notif.recipientIds && notif.recipientIds.includes(user.id)) {
    return true;
  }

  // 4. Thông báo chờ phê duyệt bước cụ thể (gửi đến người có trách nhiệm trước khi/khi duyệt bước đó)
  // "Tôi muốn nhận thông báo trước khi hồ sơ được gửi đến người có trách nhiệm"
  if (doc && doc.steps) {
    // Nếu thông báo có chỉ định rõ bước duyệt mục tiêu
    if (notif.targetStepIndex !== undefined && doc.steps[notif.targetStepIndex]) {
      const targetStep = doc.steps[notif.targetStepIndex];
      if (isUserApproverForStep(user, targetStep)) {
        return true;
      }
    }
    // Nếu là thông báo ACTION_REQUIRED nhưng không set targetStepIndex, xét bước hiện tại
    else if (notif.type === 'ACTION_REQUIRED') {
      const currentStep = doc.steps[doc.currentStepIndex];
      if (currentStep && currentStep.status === 'CURRENT' && isUserApproverForStep(user, currentStep)) {
        return true;
      }
    }
  }

  // 5. Khớp theo vai trò & phòng ban người nhận
  if (notif.recipientRole) {
    const userPositions = [
      { department: user.department, role: user.role, roleTitle: user.roleTitle },
      ...(user.secondaryPositions || [])
    ];
    const roleMatches = userPositions.some(pos => {
      if (pos.role !== notif.recipientRole) return false;
      if (notif.targetDepartment) {
        return pos.department && isSameDepartment(pos.department, notif.targetDepartment);
      }
      return true;
    });
    if (roleMatches) {
      return true;
    }
  }

  // TUYỆT ĐỐI KHÔNG FALLBACK TỰ DO: Hồ sơ của ai thì chỉ đúng đối tượng quy định mới nhận thông báo
  return false;
}

