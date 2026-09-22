export type DocumentPriority = 'NORMAL' | 'URGENT' | 'VERY_URGENT';

export type DocumentStatus = 
  | 'DRAFT'           // Bản nháp
  | 'PENDING'         // Đang chờ duyệt
  | 'IN_PROGRESS'     // Đang xử lý (đã qua 1 số cấp duyệt)
  | 'APPROVED'        // Đã hoàn tất phê duyệt
  | 'REJECTED'        // Bị từ chối
  | 'ADDITIONAL_REQ'; // Yêu cầu bổ sung thông tin

export type StepStatus = 
  | 'PENDING'         // Chưa tới lượt
  | 'CURRENT'         // Đang chờ duyệt
  | 'APPROVED'        // Đã duyệt
  | 'REJECTED'        // Đã từ chối
  | 'SKIPPED';        // Bỏ qua

export type UserRole = 
  | 'STAFF'           // Chuyên viên / Nhân viên lập hồ sơ
  | 'DEPT_HEAD'       // Trưởng phòng
  | 'BOARD_HEAD'      // Trưởng ban (Duyệt cấp Ban)
  | 'CHIEF_ACCOUNTANT'// Kế toán trưởng
  | 'LEGAL_DEPT'      // Phòng Pháp chế
  | 'DIRECTOR'        // Ban Giám đốc / Tổng Giám đốc
  | 'ADMIN';          // Quản trị viên hệ thống

// FINE-GRAINED PERMISSION TYPES
export type PermissionCategory = 
  | 'DOCUMENT'
  | 'APPROVAL'
  | 'WORKFLOW'
  | 'DMS'
  | 'USER_ADMIN'
  | 'SYSTEM';

export type PermissionId = 
  // Documents
  | 'doc.view'
  | 'doc.view_all'
  | 'doc.create'
  | 'doc.edit'
  | 'doc.delete'
  | 'doc.print_export'
  // Approval
  | 'approval.internal_check'
  | 'approval.approve'
  | 'approval.reject'
  | 'approval.request_info'
  | 'approval.override'
  // Workflow
  | 'workflow.view'
  | 'workflow.manage'
  // DMS
  | 'dms.view'
  | 'dms.export'
  // Users & Permissions
  | 'user.view'
  | 'user.create'
  | 'user.edit'
  | 'user.delete'
  // Categories & Settings
  | 'category.view'
  | 'category.manage'
  // Reports & Analytics
  | 'report.sla'
  | 'report.analytics'
  // System & Analytics
  | 'system.dashboard'
  | 'system.audit_log';

export interface PermissionDefinition {
  id: PermissionId;
  name: string;
  code: string;
  description: string;
  category: PermissionCategory;
}

export interface PermissionPreset {
  id: string;                  // Định danh mẫu, e.g. 'preset-staff', 'preset-custom-123'
  name: string;                // Tên hiển thị mẫu: Chuyên viên, Kế toán viên, Thủ kho...
  role: UserRole;              // Nhóm vai trò thẩm quyền duyệt ký liên quan
  roleTitle?: string;          // Chức vụ gợi ý mặc định
  permissions: PermissionId[]; // Danh sách các ID quyền được tick chọn trong mẫu
  isSystem?: boolean;          // true nếu là mẫu mặc định ban đầu của hệ thống
  description?: string;        // Ghi chú / mô tả mục đích sử dụng mẫu
  createdAt?: string;
  updatedAt?: string;
}

export interface UserPosition {
  roleTitle: string;     // Chức vụ kiêm nhiệm
  department: string;    // Phòng ban kiêm nhiệm
  role: UserRole;        // Nhóm vai trò thẩm quyền của vị trí kiêm nhiệm
}

export interface User {
  id: string;
  name: string;          // Họ và tên
  username: string;      // Tên đăng nhập (username)
  pass: string;          // Mật khẩu (pass)
  email?: string;
  role: UserRole;        // Vai trò nhóm thẩm quyền (Preset)
  roleTitle: string;     // Chức vụ hiển thị
  department: string;    // Phòng ban
  avatar: string;
  signatureUrl?: string;
  permissions: PermissionId[]; // Danh sách các quyền chi tiết (Permission Matrix)
  secondaryPositions?: UserPosition[]; // Vị trí & phòng ban kiêm nhiệm (nếu có)
}

export interface Attachment {
  id: string;
  name: string;
  size: number;
  type: string;
  url: string;
  uploadedAt: string;
  uploadedBy: string;
  isScan?: boolean;
}

export type OverdueAction = 'WARN_AND_RETURN' | 'AUTO_APPROVE';

export interface ApprovalStep {
  id: string;
  stepOrder: number;
  title: string;
  approverRole: UserRole;
  approverId?: string;
  approverName: string;
  approverTitle: string;
  department: string;
  status: StepStatus;
  comment?: string;
  decisionDate?: string;
  signatureImage?: string;
  slaHours?: number; // SLA thời gian duyệt tính theo giờ
  overdueAction?: OverdueAction; // Hành vi khi quá hạn SLA
  startedAt?: string; // Thời điểm bước chuyển sang CURRENT
  deadline?: string; // Thời hạn duyệt cụ thể tính theo SLA
  isOverdue?: boolean; // Cờ đánh dấu bước đã bị quá hạn
  autoApprovedBySystem?: boolean; // Được duyệt tự động bởi hệ thống
  // Tích hợp khâu kiểm tra nội bộ ban trong cùng 1 bước
  requiresInternalCheck?: boolean; // true nếu bước này yêu cầu nhân sự ban kiểm tra trước khi quản lý duyệt
  isInternalChecked?: boolean; // true khi đã hoàn tất kiểm tra nội bộ ban
  checkedByName?: string; // Tên nhân sự nội bộ ban đã thực hiện kiểm tra
  checkedAt?: string; // Thời điểm hoàn thành kiểm tra nội bộ
  checkedComment?: string; // Ý kiến kiểm tra nội bộ
  checkedSignature?: string; // Chữ ký xác nhận kiểm tra
  stepType?: 'INTERNAL_CHECK' | 'APPROVAL';
  isInternalCheck?: boolean;
}

export type ResubmitMode = 'CONTINUE_FROM_CURRENT' | 'RESTART_FROM_BEGINNING';

export interface AuditLog {
  id: string;
  documentId: string;
  action: 'CREATE' | 'SUBMIT' | 'APPROVE' | 'REJECT' | 'REQUEST_INFO' | 'FORWARD' | 'UPDATE' | 'RESUBMIT';
  actorId: string;
  actorName: string;
  actorTitle: string;
  timestamp: string;
  comment?: string;
  previousStatus?: DocumentStatus;
  newStatus?: DocumentStatus;
}

export interface DocumentItem {
  id: string;
  code: string;                 // Số hiệu: e.g. HD-2026/TH-089, TTr-042/KT
  title: string;                // Trích yếu / Tên hồ sơ
  category: string;             // Loại hồ sơ: Hợp đồng kinh tế, Tờ trình phê duyệt, Đề xuất thanh toán...
  project?: string;             // Tên dự án
  department: string;           // Phòng ban khởi tạo
  creatorId: string;
  creatorName: string;
  creatorTitle: string;
  createdAt: string;
  updatedAt: string;
  deadline?: string;            // Hạn xử lý SLA
  desiredDeadline?: string;     // Thời hạn duyệt mong muốn
  priority: DocumentPriority;
  status: DocumentStatus;
  amount?: number;              // Giá trị hợp đồng / số tiền nếu có (VNĐ)
  description?: string;
  contentHtml?: string;         // Nội dung chi tiết định dạng Rich Text (Quill 2.0)
  attachments: Attachment[];
  steps: ApprovalStep[];        // Danh sách người xét duyệt các bước
  ccUsers?: { id: string; name: string; roleTitle: string; department?: string; avatar?: string }[]; // Người theo dõi (Cc)
  currentStepIndex: number;
  auditLogs: AuditLog[];
  signedPdfUrl?: string;
  overdueAction?: OverdueAction; // Chính sách xử lý khi quá hạn
  isOverdue?: boolean;          // Đang có bước bị quá hạn
  overdueDepartment?: string;   // Tên phòng ban đang làm trễ hạn
  overdueHours?: number;        // Số giờ đã quá hạn
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  documentId: string;
  documentCode: string;
  type: 'INFO' | 'ACTION_REQUIRED' | 'APPROVED' | 'REJECTED' | 'SLA_WARNING' | 'SLA_VIOLATION';
  read: boolean;
  createdAt: string;
  actorId?: string;           // ID người thực hiện hành động (để người thực hiện không tự nhận thông báo của chính mình)
  recipientId?: string;       // ID người nhận cụ thể (VD: người lập hồ sơ khi trả về, người duyệt ở bước kế tiếp)
  recipientIds?: string[];    // Danh sách các ID người nhận
  recipientRole?: UserRole;   // Vai trò người nhận
  targetStepIndex?: number;   // Bước duyệt mục tiêu (người chịu trách nhiệm duyệt bước này sẽ nhận thông báo)
  targetDepartment?: string;  // Phòng ban duyệt mục tiêu
  overdueHours?: number;      // Số giờ quá hạn (nếu có)
}

export interface WorkflowStep {
  order: number;
  title: string;
  role: UserRole;
  roleTitle: string;
  department: string;
  slaHours: number;
  isInternalCheck?: boolean;
  overdueAction?: OverdueAction;
}

export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  steps: WorkflowStep[];
  createdAt?: string;
  updatedAt?: string;
}


export interface DepartmentItem {
  id: string;
  name: string;
  code: string;
  description?: string;
  defaultSlaHours?: number; // SLA duyệt mặc định theo giờ của phòng ban
  defaultOverdueAction?: OverdueAction; // Chính sách xử lý khi quá hạn mặc định của ban/phòng
  createdAt: string;
}


export interface JobTitleItem {
  id: string;
  name: string;
  code: string;
  department: string;
  defaultRole?: UserRole;
  description?: string;
  createdAt: string;
}

