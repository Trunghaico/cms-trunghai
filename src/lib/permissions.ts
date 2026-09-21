import { PermissionId, PermissionDefinition, PermissionCategory, UserRole, User } from '../types';

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
    'doc.view_all',
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
    'doc.view_all',
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
    'doc.view_all',
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
