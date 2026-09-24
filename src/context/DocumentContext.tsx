import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { DocumentItem, ApprovalStep, NotificationItem, User, DocumentStatus, StepStatus, UserRole, PermissionId, PermissionPreset, DepartmentItem, JobTitleItem, UserPosition, ResubmitMode, AuditLog, WorkflowTemplate, WorkflowStep, OverdueAction } from '../types';
import { 
  loadDocuments, 
  saveDocuments, 
  loadNotifications, 
  saveNotifications, 
  loadActiveUser, 
  saveActiveUser,
  loadUsers, 
  saveUsers,
  loadDepartments,
  saveDepartments,
  loadJobTitles,
  saveJobTitles,
  loadPermissionPresets,
  savePermissionPresets,
  loadWorkflowTemplates,
  saveWorkflowTemplates,
  loadDeletedUserIds,
  addDeletedUserId,
  removeDeletedUserId,
  loadDeletedDeptIds,
  addDeletedDeptId,
  removeDeletedDeptId,
  loadDeletedJobIds,
  addDeletedJobId,
  removeDeletedJobId,
  loadDeletedPresetIds,
  addDeletedPresetId,
  removeDeletedPresetId,
  loadDeletedWorkflowTemplateIds,
  addDeletedWorkflowTemplateId,
  removeDeletedWorkflowTemplateId,
  loadDeletedDocumentIds,
  addDeletedDocumentId,
  removeDeletedDocumentId,
  deduplicateDocuments,
  deduplicateUsers,
  deduplicateDepartments,
  deduplicateJobTitles,
  deduplicatePresets,
  deduplicateWorkflowTemplates
} from '../lib/storage';
import {
  saveDatabaseToNAS,
  fetchDatabaseFromNAS,
  testNASConnection,
  listNASBackups,
  getLatestNASDatabaseInfo,
  loadAutoBackupConfig,
  saveAutoBackupConfig,
  AutoBackupConfig,
  DEFAULT_AUTO_BACKUP_CONFIG,
  NASBackupItem,
  DatabaseSnapshot
} from '../lib/nasStorageService';
import { USERS, WORKFLOW_TEMPLATES } from '../lib/initialData';
import { 
  hasPermission as checkHasPermission, 
  hasAnyPermission as checkHasAnyPermission,
  hasAllPermissions as checkHasAllPermissions,
  ROLE_PRESET_PERMISSIONS,
  DEFAULT_PERMISSION_PRESETS,
  canUserAccessDocument,
  canUserReceiveNotification,
  canUserOverseeAllDocuments,
  isUserApproverForStep,
  canUserPerformInternalCheck,
  canUserPerformManagerApproval,
  isSameDepartment
} from '../lib/permissions';
import { sendDeviceNotification, updateAppBadge } from '../lib/pwaService';


interface DocumentContextType {
  users: User[];
  activeUser: User | null;
  isAuthenticated: boolean;
  login: (username: string, pass: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => void;
  hasPermission: (permissionId: PermissionId) => boolean;
  hasAnyPermission: (permissionIds: PermissionId[]) => boolean;
  hasAllPermissions: (permissionIds: PermissionId[]) => boolean;
  createUser: (userData: { name: string; username: string; pass: string; roleTitle: string; department: string; role?: UserRole; permissions?: PermissionId[]; secondaryPositions?: UserPosition[] }) => { success: boolean; message?: string };
  updateUser: (userId: string, userData: Partial<User>) => { success: boolean; message?: string };
  deleteUser: (userId: string) => { success: boolean; message?: string };
  registerUser?: (userData: { name: string; username: string; pass: string; roleTitle: string; department: string; role?: UserRole; permissions?: PermissionId[]; secondaryPositions?: UserPosition[] }) => { success: boolean; message?: string };
  
  // User Profile & Password Management
  isProfileModalOpen: boolean;
  setIsProfileModalOpen: (open: boolean) => void;
  profileInitialTab: 'PROFILE' | 'PASSWORD' | 'SIGNATURE';
  setProfileInitialTab: (tab: 'PROFILE' | 'PASSWORD' | 'SIGNATURE') => void;
  openProfileModal: (initialTab?: 'PROFILE' | 'PASSWORD' | 'SIGNATURE') => void;
  changePassword: (currentPass: string, newPass: string) => { success: boolean; message?: string };
  updateMyProfile: (data: { name?: string; email?: string; avatar?: string; signatureUrl?: string }) => { success: boolean; message?: string };

  // NAS Synology MinIO Storage & Database Sync & Auto-Backup
  isNASSyncing: boolean;
  lastNASSyncTime: string | null;
  nasSyncStatus: 'idle' | 'syncing' | 'synced' | 'error';
  autoBackupConfig: AutoBackupConfig;
  autoBackupCountdown: number;
  updateAutoBackupConfig: (config: Partial<AutoBackupConfig>) => void;
  syncToNAS: (isAuto?: boolean) => Promise<{ success: boolean; message: string; path?: string }>;
  syncFromNAS: (backupKey?: string) => Promise<{ success: boolean; message: string }>;
  testNAS: () => Promise<{ success: boolean; message: string; latencyMs?: number; bucket?: string }>;
  listBackups: () => Promise<NASBackupItem[]>;
  persistStateToDatabase?: (overrides?: any) => Promise<any>;

  // Settings: Departments, Job Titles & Permission Presets
  departments: DepartmentItem[];
  jobTitles: JobTitleItem[];
  createDepartment: (deptData: { name: string; code: string; description?: string; defaultSlaHours?: number; defaultOverdueAction?: OverdueAction }) => { success: boolean; message?: string };
  updateDepartment: (id: string, deptData: Partial<DepartmentItem>) => { success: boolean; message?: string };
  deleteDepartment: (id: string) => { success: boolean; message?: string };

  createJobTitle: (titleData: { name: string; code: string; department: string; defaultRole?: UserRole; description?: string }) => { success: boolean; message?: string };
  updateJobTitle: (id: string, titleData: Partial<JobTitleItem>) => { success: boolean; message?: string };
  deleteJobTitle: (id: string) => { success: boolean; message?: string };

  permissionPresets: PermissionPreset[];
  createPermissionPreset: (presetData: { name: string; role: UserRole; roleTitle?: string; permissions: PermissionId[]; description?: string }) => { success: boolean; message?: string; preset?: PermissionPreset };
  updatePermissionPreset: (id: string, presetData: Partial<PermissionPreset>) => { success: boolean; message?: string };
  deletePermissionPreset: (id: string) => { success: boolean; message?: string };
  resetPermissionPresetsToDefault: () => void;

  workflowTemplates: WorkflowTemplate[];
  createWorkflowTemplate: (templateData: { name: string; description: string; category: string; steps: WorkflowStep[] }) => { success: boolean; message?: string; template?: WorkflowTemplate };
  updateWorkflowTemplate: (id: string, templateData: Partial<WorkflowTemplate>) => { success: boolean; message?: string };
  deleteWorkflowTemplate: (id: string) => { success: boolean; message?: string };
  resetWorkflowTemplatesToDefault: () => void;


  documents: DocumentItem[];
  notifications: NotificationItem[];
  unreadNotificationCount: number;
  markNotificationAsRead: (id: string) => void;
  markAllNotificationsAsRead: () => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  selectedDocument: DocumentItem | null;
  setSelectedDocument: (doc: DocumentItem | null) => void;
  isCreateModalOpen: boolean;
  setIsCreateModalOpen: (open: boolean) => void;
  
  // Actions
  createDocument: (docData: Omit<DocumentItem, 'id' | 'createdAt' | 'updatedAt' | 'auditLogs'>) => DocumentItem;
  performInternalCheck: (documentId: string, comment: string, signatureImage?: string) => void;
  approveStep: (documentId: string, comment: string, signatureImage?: string) => void;
  rejectDocument: (documentId: string, reason: string) => void;
  requestAdditionalInfo: (documentId: string, note: string) => void;
  returnOverdueDocument: (documentId: string, reason: string) => { success: boolean; message?: string };
  resubmitDocument: (
    documentId: string, 
    data: {
      title?: string;
      amount?: number;
      description?: string;
      contentHtml?: string;
      attachments: DocumentItem['attachments'];
      supplementNote: string;
      resubmitMode: ResubmitMode;
    }
  ) => { success: boolean; message?: string };
  deleteDocument: (documentId: string) => void;
  resetToSampleData: () => void;
  
  // Computed stats
  stats: {
    total: number;
    pending: number;
    inProgress: number;
    approved: number;
    rejected: number;
    additionalReq: number;
    urgentCount: number;
    overdueCount: number;
    myPendingApprovalsCount: number;
    myCreatedCount: number;
  };
}

// Kênh BroadcastChannel đồng bộ tức thì giữa các tab trình duyệt và PWA trên cùng thiết bị
const syncBroadcastChannel = typeof window !== 'undefined' && 'BroadcastChannel' in window
  ? new BroadcastChannel('trunghai_cms_sync_channel')
  : null;

const DocumentContext = createContext<DocumentContextType | undefined>(undefined);

export const DocumentProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [users, setUsers] = useState<User[]>(() => loadUsers());
  const [departments, setDepartments] = useState<DepartmentItem[]>(() => loadDepartments());
  const [jobTitles, setJobTitles] = useState<JobTitleItem[]>(() => loadJobTitles());
  const [permissionPresets, setPermissionPresets] = useState<PermissionPreset[]>(() => loadPermissionPresets());
  const [workflowTemplates, setWorkflowTemplates] = useState<WorkflowTemplate[]>(() => loadWorkflowTemplates());
  const [activeUser, setActiveUserState] = useState<User | null>(() => loadActiveUser());
  const [documents, setDocuments] = useState<DocumentItem[]>(() => loadDocuments());
  const [notifications, setNotifications] = useState<NotificationItem[]>(() => loadNotifications());
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedDocument, setSelectedDocument] = useState<DocumentItem | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const [isNASSyncing, setIsNASSyncing] = useState(false);
  const [nasSyncStatus, setNasSyncStatus] = useState<'idle' | 'syncing' | 'synced' | 'error'>('idle');
  const [lastNASSyncTime, setLastNASSyncTime] = useState<string | null>(() => localStorage.getItem('trunghai_last_nas_sync'));

  // ETag và Server Time Ref để phát hiện thay đổi tức thì giữa các máy mà không phụ thuộc đồng hồ lệch
  const lastSyncETagRef = React.useRef<string | null>(localStorage.getItem('trunghai_last_nas_etag'));
  const lastSyncServerTimeRef = React.useRef<string | null>(localStorage.getItem('trunghai_last_nas_sync'));
  
  // Auto Backup Configuration
  const [autoBackupConfig, setAutoBackupConfigState] = useState<AutoBackupConfig>(() => loadAutoBackupConfig());
  const [autoBackupCountdown, setAutoBackupCountdown] = useState<number>(() => autoBackupConfig.intervalMinutes * 60);

  const isInitialLoadDone = React.useRef(false);
  const isSyncInProgress = React.useRef(false);
  const mutationDebounceTimerRef = React.useRef<any>(null);

  const updateAutoBackupConfig = useCallback((newConfig: Partial<AutoBackupConfig>) => {
    setAutoBackupConfigState(prev => {
      const updated = { ...prev, ...newConfig };
      saveAutoBackupConfig(updated);
      if (newConfig.intervalMinutes && newConfig.intervalMinutes !== prev.intervalMinutes) {
        setAutoBackupCountdown(newConfig.intervalMinutes * 60);
      }
      return updated;
    });
  }, []);

  // Sync users to storage
  useEffect(() => {
    saveUsers(users);
  }, [users]);

  // Sync departments to storage
  useEffect(() => {
    saveDepartments(departments);
  }, [departments]);

  // Sync job titles to storage
  useEffect(() => {
    saveJobTitles(jobTitles);
  }, [jobTitles]);

  // Sync permission presets to storage
  useEffect(() => {
    savePermissionPresets(permissionPresets);
  }, [permissionPresets]);

  // Sync workflow templates to storage
  useEffect(() => {
    saveWorkflowTemplates(workflowTemplates);
  }, [workflowTemplates]);

  // Sync documents to storage
  useEffect(() => {
    saveDocuments(documents);
  }, [documents]);

  // Sync notifications to storage
  useEffect(() => {
    saveNotifications(notifications);
  }, [notifications]);

  // Hàm cập nhật snapshot từ máy chủ MinIO NAS vào ứng dụng một cách nhất quán (Single Source of Truth)
  const applyRemoteSnapshot = useCallback((snapshot: DatabaseSnapshot, eTag?: string, lastModified?: string) => {
    if (Array.isArray(snapshot.deletedDocumentIds)) {
      snapshot.deletedDocumentIds.forEach(id => addDeletedDocumentId(id));
    }
    if (Array.isArray(snapshot.deletedUserIds)) {
      snapshot.deletedUserIds.forEach(id => addDeletedUserId(id));
    }
    if (Array.isArray(snapshot.deletedDepartmentIds)) {
      snapshot.deletedDepartmentIds.forEach(id => addDeletedDeptId(id));
    }
    if (Array.isArray(snapshot.deletedJobTitleIds)) {
      snapshot.deletedJobTitleIds.forEach(id => addDeletedJobId(id));
    }
    if (Array.isArray(snapshot.deletedPresetIds)) {
      snapshot.deletedPresetIds.forEach(id => addDeletedPresetId(id));
    }
    if (Array.isArray(snapshot.deletedWorkflowTemplateIds)) {
      snapshot.deletedWorkflowTemplateIds.forEach(id => addDeletedWorkflowTemplateId(id));
    }

    const cleanDocs = deduplicateDocuments(snapshot.documents || []);
    const cleanUsers = deduplicateUsers(snapshot.users || []);
    const cleanDepts = deduplicateDepartments(snapshot.departments || []);
    const cleanJobs = deduplicateJobTitles(snapshot.jobTitles || []);
    const cleanPresets = deduplicatePresets(snapshot.permissionPresets || []);
    const cleanWfs = deduplicateWorkflowTemplates(snapshot.workflowTemplates || []);
    const cleanNotifs = snapshot.notifications || [];

    setDocuments(cleanDocs);
    saveDocuments(cleanDocs);

    if (cleanUsers.length > 0) {
      setUsers(cleanUsers);
      saveUsers(cleanUsers);
    }
    if (cleanDepts.length > 0) {
      setDepartments(cleanDepts);
      saveDepartments(cleanDepts);
    }
    if (cleanJobs.length > 0) {
      setJobTitles(cleanJobs);
      saveJobTitles(cleanJobs);
    }
    if (cleanPresets.length > 0) {
      setPermissionPresets(cleanPresets);
      savePermissionPresets(cleanPresets);
    }
    if (cleanWfs.length > 0) {
      setWorkflowTemplates(cleanWfs);
      saveWorkflowTemplates(cleanWfs);
    }

    // Tự động phát hiện thông báo mới và kích hoạt Push Notification / Rung chuông thiết bị
    setNotifications(prevNotifs => {
      if (activeUser) {
        const prevIds = new Set(prevNotifs.map(n => n.id));
        const docMap = new Map(cleanDocs.map(d => [d.id.toLowerCase(), d]));
        const brandNew = cleanNotifs.filter(n => 
          !prevIds.has(n.id) && 
          !n.read && 
          canUserReceiveNotification(activeUser, n, docMap.get(n.documentId?.toLowerCase() || ''))
        );
        brandNew.forEach(n => {
          sendDeviceNotification({
            title: n.title,
            body: n.message,
            documentId: n.documentId,
            type: n.type
          });
        });
      }
      saveNotifications(cleanNotifs);
      return cleanNotifs;
    });

    // Cập nhật selectedDocument tức thời nếu người dùng đang mở chi tiết hồ sơ
    setSelectedDocument(prev => {
      if (!prev) return null;
      const updated = cleanDocs.find(d => d.id.toLowerCase() === prev.id.toLowerCase());
      return updated || null;
    });

    // Cập nhật activeUser nếu thông tin role / phòng ban / quyền của tài khoản thay đổi
    if (activeUser) {
      const updatedActive = cleanUsers.find(u => u.id === activeUser.id || (u.username && u.username.toLowerCase() === activeUser.username.toLowerCase()));
      if (updatedActive && (
        updatedActive.role !== activeUser.role || 
        updatedActive.department !== activeUser.department ||
        updatedActive.name !== activeUser.name ||
        JSON.stringify(updatedActive.permissions) !== JSON.stringify(activeUser.permissions)
      )) {
        setActiveUserState(updatedActive);
        saveActiveUser(updatedActive);
      }
    }

    const newETag = eTag || snapshot.savedAt || new Date().toISOString();
    const newSyncTime = lastModified || snapshot.savedAt || new Date().toISOString();

    lastSyncETagRef.current = newETag;
    lastSyncServerTimeRef.current = newSyncTime;
    localStorage.setItem('trunghai_last_nas_etag', newETag);
    localStorage.setItem('trunghai_last_nas_sync', newSyncTime);
    setLastNASSyncTime(newSyncTime);
    setNasSyncStatus('synced');
  }, [activeUser]);

  // SLA & OVERDUE AUTOMATED ENGINE (Quét định kỳ tự động phê duyệt hoặc cảnh báo vi phạm SLA)
  useEffect(() => {
    const checkSlaInterval = setInterval(() => {
      setDocuments(prevDocs => {
        let hasChanges = false;
        const now = Date.now();
        const nowIso = new Date().toISOString();
        const newNotifs: NotificationItem[] = [];

        const updatedDocs = prevDocs.map(doc => {
          if (doc.status !== 'PENDING' && doc.status !== 'IN_PROGRESS') {
            return doc;
          }

          const currentStepIdx = doc.currentStepIndex;
          const currentStep = doc.steps[currentStepIdx];
          if (!currentStep || currentStep.status !== 'CURRENT') {
            return doc;
          }

          // Kiểm tra deadline của bước hiện tại
          const deadlineStr = currentStep.deadline || doc.deadline;
          if (!deadlineStr) return doc;

          const deadlineTime = new Date(deadlineStr).getTime();
          if (isNaN(deadlineTime) || now <= deadlineTime) {
            return doc;
          }

          // Bước này đã quá hạn SLA!
          const overdueHours = Math.max(1, Math.round((now - deadlineTime) / (1000 * 3600)));
          const action = currentStep.overdueAction || doc.overdueAction || 'WARN_AND_RETURN';

          if (action === 'AUTO_APPROVE' && !currentStep.autoApprovedBySystem) {
            // TỰ ĐỘNG PHÊ DUYỆT BỞI HỆ THỐNG
            hasChanges = true;
            const updatedSteps = [...doc.steps];
            updatedSteps[currentStepIdx] = {
              ...currentStep,
              status: 'APPROVED',
              comment: `⚡ Hệ thống TỰ ĐỘNG PHÊ DUYỆT do Phòng ${currentStep.department} chậm trễ quá hạn SLA cam kết (${currentStep.slaHours || 8}h).`,
              decisionDate: nowIso,
              signatureImage: 'system_auto_approved_stamp',
              autoApprovedBySystem: true,
              isOverdue: true,
            };

            const isLastStep = currentStepIdx === doc.steps.length - 1;
            const nextStatus: DocumentStatus = isLastStep ? 'APPROVED' : 'IN_PROGRESS';
            let nextStepIdx = currentStepIdx;

            if (!isLastStep) {
              nextStepIdx = currentStepIdx + 1;
              const nextStepSla = updatedSteps[nextStepIdx].slaHours || 8;
              updatedSteps[nextStepIdx] = {
                ...updatedSteps[nextStepIdx],
                status: 'CURRENT',
                startedAt: nowIso,
                deadline: new Date(now + nextStepSla * 3600 * 1000).toISOString(),
                isOverdue: false,
              };
            }

            const newLog: AuditLog = {
              id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
              documentId: doc.id,
              action: 'APPROVE',
              actorId: 'SYSTEM_BOT',
              actorName: 'Robot Hệ Thống (SLA Engine)',
              actorTitle: 'Tự Động Ký Duyệt',
              timestamp: nowIso,
              comment: `[HỆ THỐNG TỰ ĐỘNG DUYỆT BƯỚC ${currentStepIdx + 1}]: Phòng ${currentStep.department} vi phạm SLA quá hạn ${overdueHours} giờ.`,
              previousStatus: doc.status,
              newStatus: nextStatus,
            };

            const updatedDoc: DocumentItem = {
              ...doc,
              status: nextStatus,
              currentStepIndex: nextStepIdx,
              steps: updatedSteps,
              deadline: isLastStep ? undefined : updatedSteps[nextStepIdx]?.deadline,
              isOverdue: false,
              overdueDepartment: undefined,
              overdueHours: undefined,
              updatedAt: nowIso,
              auditLogs: [...doc.auditLogs, newLog],
            };

            // Gửi thông báo SLA_VIOLATION cho Ban Lãnh đạo & Người lập
            newNotifs.push({
              id: `notif-sla-auto-${Date.now()}-${doc.id}`,
              title: '⚡ TỰ ĐỘNG PHÊ DUYỆT DO VI PHẠM SLA',
              message: `Hệ thống đã tự động phê duyệt bước ${currentStepIdx + 1} của hồ sơ "${doc.code} - ${doc.title}" do Phòng ${currentStep.department} quá hạn SLA ${overdueHours} giờ.`,
              documentId: doc.id,
              documentCode: doc.code,
              type: 'SLA_VIOLATION',
              read: false,
              createdAt: nowIso,
              actorId: 'SYSTEM_BOT',
              recipientId: doc.creatorId,
              targetDepartment: currentStep.department,
              overdueHours: overdueHours,
            });

            return updatedDoc;
          } else if (action === 'WARN_AND_RETURN') {
            // CẢNH BÁO QUÁ HẠN
            if (!doc.isOverdue || !currentStep.isOverdue || doc.overdueHours !== overdueHours) {
              hasChanges = true;
              const updatedSteps = [...doc.steps];
              updatedSteps[currentStepIdx] = {
                ...currentStep,
                isOverdue: true,
              };

              const updatedDoc: DocumentItem = {
                ...doc,
                isOverdue: true,
                overdueDepartment: currentStep.department,
                overdueHours: overdueHours,
                steps: updatedSteps,
                updatedAt: nowIso,
              };

              newNotifs.push({
                id: `notif-sla-warn-${Date.now()}-${doc.id}`,
                title: '⚠️ CẢNH BÁO QUÁ HẠN PHÊ DUYỆT (SLA)',
                message: `Phòng ${currentStep.department} chưa xử lý hồ sơ "${doc.code} - ${doc.title}" đúng hạn (Đã quá hạn ${overdueHours} giờ). Ban Lãnh đạo có thể chỉ đạo hoặc Trả hồ sơ.`,
                documentId: doc.id,
                documentCode: doc.code,
                type: 'SLA_VIOLATION',
                read: false,
                createdAt: nowIso,
                actorId: 'SYSTEM_BOT',
                recipientId: doc.creatorId,
                targetDepartment: currentStep.department,
                overdueHours: overdueHours,
              });

              return updatedDoc;
            }
          }

          return doc;
        });

        if (newNotifs.length > 0) {
          setNotifications(prevNotifs => {
            const existingKeys = new Set(prevNotifs.slice(0, 15).map(n => `${n.documentId}-${n.type}`));
            const filteredNew = newNotifs.filter(n => !existingKeys.has(`${n.documentId}-${n.type}`));
            if (filteredNew.length > 0) {
              filteredNew.forEach(n => {
                sendDeviceNotification({
                  title: n.title,
                  body: n.message,
                  documentId: n.documentId,
                  type: n.type
                });
              });
              return [...filteredNew, ...prevNotifs];
            }
            return prevNotifs;
          });
        }

        return hasChanges ? updatedDocs : prevDocs;
      });
    }, 10000);

    return () => clearInterval(checkSlaInterval);
  }, []);

  // Sync state to NAS
  const syncToNAS = useCallback(async (isAuto = false): Promise<{ success: boolean; message: string; path?: string }> => {
    if (isSyncInProgress.current) {
      return { success: false, message: 'Đang có tiến trình đồng bộ khác chạy' };
    }
    isSyncInProgress.current = true;
    setIsNASSyncing(true);
    setNasSyncStatus('syncing');
    try {
      const cleanUsers = deduplicateUsers(users);
      const cleanDepts = deduplicateDepartments(departments);
      const cleanJobs = deduplicateJobTitles(jobTitles);
      const cleanPresets = deduplicatePresets(permissionPresets);
      const cleanWfs = deduplicateWorkflowTemplates(workflowTemplates);

      const res = await saveDatabaseToNAS({
        documents,
        users: cleanUsers,
        departments: cleanDepts,
        jobTitles: cleanJobs,
        permissionPresets: cleanPresets,
        workflowTemplates: cleanWfs,
        notifications,
        deletedUserIds: loadDeletedUserIds(),
        deletedDepartmentIds: loadDeletedDeptIds(),
        deletedJobTitleIds: loadDeletedJobIds(),
        deletedPresetIds: loadDeletedPresetIds(),
        deletedWorkflowTemplateIds: loadDeletedWorkflowTemplateIds(),
        savedBy: isAuto ? 'Tự động sao lưu hệ thống' : (activeUser?.name || 'Tài khoản quản trị'),
      });
      if (res.success) {
        const nowStr = res.lastModified || new Date().toISOString();
        const newETag = res.eTag || nowStr;
        lastSyncETagRef.current = newETag;
        lastSyncServerTimeRef.current = nowStr;
        localStorage.setItem('trunghai_last_nas_etag', newETag);
        localStorage.setItem('trunghai_last_nas_sync', nowStr);
        setLastNASSyncTime(nowStr);
        setNasSyncStatus('synced');
        // Reset countdown timer
        setAutoBackupCountdown(autoBackupConfig.intervalMinutes * 60);

        if (syncBroadcastChannel) {
          syncBroadcastChannel.postMessage({
            type: 'STATE_UPDATED',
            eTag: newETag,
            lastModified: nowStr,
          });
        }
      } else {
        setNasSyncStatus('error');
      }
      setIsNASSyncing(false);
      isSyncInProgress.current = false;
      return {
        success: res.success,
        message: res.message || (res.success ? 'Đã sao lưu lên NAS thành công' : 'Lỗi khi sao lưu'),
        path: res.path
      };
    } catch (e: any) {
      setIsNASSyncing(false);
      setNasSyncStatus('error');
      isSyncInProgress.current = false;
      return { success: false, message: e.message || 'Lỗi không xác định khi đồng bộ lên NAS' };
    }
  }, [documents, users, departments, jobTitles, permissionPresets, workflowTemplates, notifications, activeUser, autoBackupConfig.intervalMinutes]);

  // Lưu tức thời và đồng bộ vào Database (MinIO NAS + localStorage)
  const persistStateToDatabase = useCallback(async (overrides?: {
    users?: User[];
    departments?: DepartmentItem[];
    jobTitles?: JobTitleItem[];
    permissionPresets?: PermissionPreset[];
    workflowTemplates?: WorkflowTemplate[];
    documents?: DocumentItem[];
    notifications?: NotificationItem[];
    actionDescription?: string;
  }) => {
    const targetUsers = deduplicateUsers(overrides?.users || users);
    const targetDepts = deduplicateDepartments(overrides?.departments || departments);
    const targetJobs = deduplicateJobTitles(overrides?.jobTitles || jobTitles);
    const targetPresets = deduplicatePresets(overrides?.permissionPresets || permissionPresets);
    const targetWorkflowTemplates = deduplicateWorkflowTemplates(overrides?.workflowTemplates || workflowTemplates);
    const targetDocs = overrides?.documents || documents;
    const targetNotifs = overrides?.notifications || notifications;

    // 1. Lưu tức thời vào LocalStorage
    if (overrides?.users) saveUsers(targetUsers);
    if (overrides?.departments) saveDepartments(targetDepts);
    if (overrides?.jobTitles) saveJobTitles(targetJobs);
    if (overrides?.permissionPresets) savePermissionPresets(targetPresets);
    if (overrides?.workflowTemplates) saveWorkflowTemplates(targetWorkflowTemplates);
    if (overrides?.documents) saveDocuments(targetDocs);
    if (overrides?.notifications) saveNotifications(targetNotifs);

    // 2. Lưu trực tiếp vào Database NAS
    try {
      setIsNASSyncing(true);
      setNasSyncStatus('syncing');
      const res = await saveDatabaseToNAS({
        documents: targetDocs,
        users: targetUsers,
        departments: targetDepts,
        jobTitles: targetJobs,
        permissionPresets: targetPresets,
        workflowTemplates: targetWorkflowTemplates,
        notifications: targetNotifs,
        deletedDocumentIds: loadDeletedDocumentIds(),
        deletedUserIds: loadDeletedUserIds(),
        deletedDepartmentIds: loadDeletedDeptIds(),
        deletedJobTitleIds: loadDeletedJobIds(),
        deletedPresetIds: loadDeletedPresetIds(),
        deletedWorkflowTemplateIds: loadDeletedWorkflowTemplateIds(),
        savedBy: overrides?.actionDescription || (activeUser?.name ? `${activeUser.name} (${activeUser.roleTitle})` : 'Tài khoản quản trị'),
      });
      if (res.success) {
        const nowStr = res.lastModified || new Date().toISOString();
        const newETag = res.eTag || nowStr;
        lastSyncETagRef.current = newETag;
        lastSyncServerTimeRef.current = nowStr;
        localStorage.setItem('trunghai_last_nas_etag', newETag);
        localStorage.setItem('trunghai_last_nas_sync', nowStr);
        setLastNASSyncTime(nowStr);
        setNasSyncStatus('synced');

        if (syncBroadcastChannel) {
          syncBroadcastChannel.postMessage({
            type: 'STATE_UPDATED',
            eTag: newETag,
            lastModified: nowStr,
          });
        }
      } else {
        setNasSyncStatus('error');
      }
      setIsNASSyncing(false);
      return res;
    } catch (e: any) {
      console.warn('Lỗi khi persist vào database NAS:', e);
      setIsNASSyncing(false);
      setNasSyncStatus('error');
      return { success: false, message: e.message };
    }
  }, [users, departments, jobTitles, permissionPresets, workflowTemplates, documents, notifications, activeUser]);

  // Sync state from NAS
  const syncFromNAS = useCallback(async (backupKey?: string): Promise<{ success: boolean; message: string }> => {
    setIsNASSyncing(true);
    setNasSyncStatus('syncing');
    try {
      const snapshot = await fetchDatabaseFromNAS(backupKey);
      if (!snapshot) {
        setIsNASSyncing(false);
        setNasSyncStatus('error');
        return { success: false, message: 'Không tìm thấy dữ liệu trên MinIO NAS hoặc không thể đọc file.' };
      }

      applyRemoteSnapshot(snapshot);
      setIsNASSyncing(false);
      setNasSyncStatus('synced');
      return { 
        success: true, 
        message: `Khôi phục thành công ${snapshot.documents?.length || 0} hồ sơ, ${snapshot.users?.length || 0} tài khoản từ NAS (${new Date(snapshot.savedAt).toLocaleString('vi-VN')}).` 
      };
    } catch (e: any) {
      setIsNASSyncing(false);
      setNasSyncStatus('error');
      return { success: false, message: e.message || 'Lỗi khi khôi phục từ NAS' };
    }
  }, [applyRemoteSnapshot]);

  const testNAS = useCallback(async () => {
    return await testNASConnection();
  }, []);

  const listBackups = useCallback(async () => {
    return await listNASBackups();
  }, []);

  // 1. Initial Sync from MinIO NAS on startup
  useEffect(() => {
    let isMounted = true;
    const initNASAndDB = async () => {
      try {
        if (autoBackupConfig.syncOnStartup) {
          const info = await getLatestNASDatabaseInfo();
          const snapshot = await fetchDatabaseFromNAS();
          if (!isMounted) return;
          if (snapshot) {
            applyRemoteSnapshot(snapshot, info?.eTag, info?.lastModified);
          } else {
            // Push initial baseline if none exists
            saveDatabaseToNAS({
              documents,
              users,
              departments,
              jobTitles,
              permissionPresets,
              workflowTemplates,
              notifications,
              deletedDocumentIds: loadDeletedDocumentIds(),
              deletedUserIds: loadDeletedUserIds(),
              deletedDepartmentIds: loadDeletedDeptIds(),
              deletedJobTitleIds: loadDeletedJobIds(),
              deletedPresetIds: loadDeletedPresetIds(),
              deletedWorkflowTemplateIds: loadDeletedWorkflowTemplateIds(),
              savedBy: 'Khởi tạo hệ thống ban đầu'
            }).then(res => {
              if (res.success) {
                const nowStr = res.lastModified || new Date().toISOString();
                const newETag = res.eTag || nowStr;
                lastSyncETagRef.current = newETag;
                lastSyncServerTimeRef.current = nowStr;
                localStorage.setItem('trunghai_last_nas_etag', newETag);
                localStorage.setItem('trunghai_last_nas_sync', nowStr);
                setLastNASSyncTime(nowStr);
                setNasSyncStatus('synced');
              }
            }).catch(e => console.warn('Khởi tạo baseline NAS:', e));
          }
        }
      } catch (err) {
        console.warn('Sync notification:', err);
      } finally {
        isInitialLoadDone.current = true;
      }
    };

    initNASAndDB();
    return () => {
      isMounted = false;
    };
  }, [autoBackupConfig.syncOnStartup, applyRemoteSnapshot]);

  // 2. Periodic Auto-Backup Interval Timer (Counts down every second)
  useEffect(() => {
    if (!autoBackupConfig.enabled) return;

    const timer = setInterval(() => {
      setAutoBackupCountdown(prev => {
        if (prev <= 1) {
          // Trigger periodic background backup
          syncToNAS(true).catch(err => console.warn('Auto backup interval error:', err));
          return autoBackupConfig.intervalMinutes * 60;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [autoBackupConfig.enabled, autoBackupConfig.intervalMinutes, syncToNAS]);

  // 3. Debounced Auto-Backup on Data Mutation (Triggered after user changes documents/users/departments)
  useEffect(() => {
    if (!isInitialLoadDone.current || !autoBackupConfig.enabled || !autoBackupConfig.backupOnChange) {
      return;
    }

    if (mutationDebounceTimerRef.current) {
      clearTimeout(mutationDebounceTimerRef.current);
    }

    mutationDebounceTimerRef.current = setTimeout(() => {
      syncToNAS(true).catch(err => console.warn('Auto backup on change error:', err));
    }, 1500); // 1.5 seconds debounce

    return () => {
      if (mutationDebounceTimerRef.current) {
        clearTimeout(mutationDebounceTimerRef.current);
      }
    };
  }, [documents, users, departments, jobTitles, permissionPresets, workflowTemplates, notifications, autoBackupConfig.enabled, autoBackupConfig.backupOnChange, syncToNAS]);

  // 4. Remote Polling & Real-time Synchronization across Devices (Ultra-fast 2s Polling + Event Driven)
  useEffect(() => {
    if (!autoBackupConfig.enabled) return;

    let isPolling = false;

    const checkRemoteNAS = async () => {
      if (isPolling || isSyncInProgress.current) return;
      isPolling = true;
      try {
        const info = await getLatestNASDatabaseInfo();
        if (info && info.exists) {
          const currentETag = lastSyncETagRef.current;
          const currentSyncTime = lastSyncServerTimeRef.current;

          const isETagChanged = info.eTag && info.eTag !== currentETag;
          const isTimeChanged = info.lastModified && info.lastModified !== currentSyncTime;

          if (isETagChanged || isTimeChanged || !currentETag) {
            const snapshot = await fetchDatabaseFromNAS();
            if (snapshot) {
              applyRemoteSnapshot(snapshot, info.eTag, info.lastModified);
            }
          }
        }
      } catch (err) {
        console.warn('Check remote NAS error:', err);
      } finally {
        isPolling = false;
      }
    };

    // Kiểm tra tức thì khi chuyển tab, focus ứng dụng, bật mạng hoặc chuyển qua lại giữa các ứng dụng
    const handleVisibilityOrFocus = () => {
      if (document.visibilityState === 'visible' || document.hasFocus()) {
        checkRemoteNAS();
      }
    };

    window.addEventListener('focus', handleVisibilityOrFocus);
    window.addEventListener('online', handleVisibilityOrFocus);
    window.addEventListener('pageshow', handleVisibilityOrFocus);
    document.addEventListener('visibilitychange', handleVisibilityOrFocus);

    let handleBroadcast: ((e: MessageEvent) => void) | null = null;
    if (syncBroadcastChannel) {
      handleBroadcast = (e: MessageEvent) => {
        if (e.data?.type === 'STATE_UPDATED' || e.data?.type === 'CHECK_REMOTE') {
          checkRemoteNAS();
        }
      };
      syncBroadcastChannel.addEventListener('message', handleBroadcast);
    }

    const interval = setInterval(checkRemoteNAS, 2000); // Quét mỗi 2 giây
    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleVisibilityOrFocus);
      window.removeEventListener('online', handleVisibilityOrFocus);
      window.removeEventListener('pageshow', handleVisibilityOrFocus);
      document.removeEventListener('visibilitychange', handleVisibilityOrFocus);
      if (syncBroadcastChannel && handleBroadcast) {
        syncBroadcastChannel.removeEventListener('message', handleBroadcast);
      }
    };
  }, [autoBackupConfig.enabled, applyRemoteSnapshot]);

  const login = async (username: string, pass: string): Promise<{ success: boolean; message?: string }> => {
    const trimmed = username.trim().toLowerCase();
    const trimmedPass = pass.trim();

    // 1. Kiểm tra nhanh trong danh sách người dùng hiện có trong bộ nhớ
    let currentUsers = users;
    let found = currentUsers.find(u => 
      (u.username.toLowerCase() === trimmed || 
       (u.email && u.email.toLowerCase() === trimmed) ||
       (u.id && u.id.toLowerCase() === trimmed)) && 
      u.pass === trimmedPass
    );

    // 2. Nếu chưa tìm thấy hoặc mật khẩu không khớp, truy vấn cơ sở dữ liệu MinIO NAS mới nhất tức thì
    if (!found) {
      try {
        const info = await getLatestNASDatabaseInfo();
        const snapshot = await fetchDatabaseFromNAS();
        if (snapshot && Array.isArray(snapshot.users) && snapshot.users.length > 0) {
          applyRemoteSnapshot(snapshot, info?.eTag, info?.lastModified);
          currentUsers = deduplicateUsers(snapshot.users);
          found = currentUsers.find(u => 
            (u.username.toLowerCase() === trimmed || 
             (u.email && u.email.toLowerCase() === trimmed) ||
             (u.id && u.id.toLowerCase() === trimmed)) && 
            u.pass === trimmedPass
          );
        }
      } catch (err) {
        console.warn('Lỗi kiểm tra người dùng trực tuyến từ NAS:', err);
      }
    }

    if (found) {
      setActiveUserState(found);
      saveActiveUser(found);
      return { success: true };
    }
    return { success: false, message: 'Tên đăng nhập hoặc mật khẩu không chính xác.' };
  };

  const logout = () => {
    setActiveUserState(null);
    saveActiveUser(null);
    setSelectedDocument(null);
  };

  const hasPermission = useCallback((permissionId: PermissionId): boolean => {
    return checkHasPermission(activeUser, permissionId);
  }, [activeUser]);

  const hasAnyPermission = useCallback((permissionIds: PermissionId[]): boolean => {
    return checkHasAnyPermission(activeUser, permissionIds);
  }, [activeUser]);

  const hasAllPermissions = useCallback((permissionIds: PermissionId[]): boolean => {
    return checkHasAllPermissions(activeUser, permissionIds);
  }, [activeUser]);

  const createUser = (userData: { 
    name: string; 
    username: string; 
    pass: string; 
    roleTitle: string; 
    department: string; 
    role?: UserRole; 
    permissions?: PermissionId[];
    secondaryPositions?: UserPosition[];
  }): { success: boolean; message?: string } => {
    const trimmedUsername = userData.username.trim().toLowerCase();
    if (users.some(u => u.username.toLowerCase() === trimmedUsername)) {
      return { success: false, message: 'Tên đăng nhập này đã tồn tại trong hệ thống.' };
    }
    removeDeletedUserId(trimmedUsername);

    const assignedRole = userData.role || 'STAFF';
    const assignedPermissions = userData.permissions && userData.permissions.length > 0
      ? userData.permissions
      : (ROLE_PRESET_PERMISSIONS[assignedRole] || ROLE_PRESET_PERMISSIONS.STAFF);

    const newUser: User = {
      id: `user-${Date.now()}`,
      name: userData.name.trim(),
      username: trimmedUsername,
      pass: userData.pass.trim(),
      email: `${trimmedUsername}@trunghai.com.vn`,
      role: assignedRole,
      roleTitle: userData.roleTitle.trim() || 'Chuyên viên',
      department: userData.department.trim() || 'Phòng Kỹ thuật & Dự án',
      avatar: `https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80`,
      permissions: assignedPermissions,
      secondaryPositions: userData.secondaryPositions || []
    };

    const updatedUsers = [...users, newUser];
    setUsers(updatedUsers);
    saveUsers(updatedUsers);
    persistStateToDatabase({
      users: updatedUsers,
      actionDescription: `Thêm nhân sự mới: ${newUser.name}`
    });

    return { success: true };
  };

  const updateUser = (userId: string, userData: Partial<User>): { success: boolean; message?: string } => {
    const targetUser = users.find(u => u.id === userId);
    if (userData.username) {
      const trimmed = userData.username.trim().toLowerCase();
      const existing = users.find(u => u.username.toLowerCase() === trimmed && u.id !== userId);
      if (existing) {
        return { success: false, message: 'Tên đăng nhập này đã được sử dụng bởi người dùng khác.' };
      }
      if (targetUser && targetUser.username.toLowerCase() !== trimmed) {
        addDeletedUserId(targetUser.username);
        removeDeletedUserId(trimmed);
      }
    }

    const updatedUsers = users.map(u => {
      if (u.id !== userId) return u;
      return { ...u, ...userData };
    });

    setUsers(updatedUsers);
    saveUsers(updatedUsers);

    if (activeUser?.id === userId) {
      const updatedActive = updatedUsers.find(u => u.id === userId);
      if (updatedActive) {
        setActiveUserState(updatedActive);
        saveActiveUser(updatedActive);
      }
    }

    persistStateToDatabase({
      users: updatedUsers,
      actionDescription: `Cập nhật thông tin nhân sự: ${userData.name || userId}`
    });

    return { success: true };
  };

  const deleteUser = (userId: string): { success: boolean; message?: string } => {
    if (activeUser?.id === userId) {
      return { success: false, message: 'Không thể xóa tài khoản đang đăng nhập hiện tại.' };
    }
    const userToDelete = users.find(u => u.id === userId || (u.username && u.username.toLowerCase() === userId.toLowerCase()));
    if (userToDelete?.id) addDeletedUserId(userToDelete.id);
    if (userToDelete?.username) addDeletedUserId(userToDelete.username);
    addDeletedUserId(userId);

    const deletedSet = new Set(loadDeletedUserIds().map(s => s.toLowerCase()));
    const targetUsername = userToDelete?.username?.toLowerCase();
    const targetId = (userToDelete?.id || userId).toLowerCase();

    // Lọc sạch toàn bộ instance của người dùng này và mọi user nằm trong deletedSet khỏi bộ nhớ ngay lập tức
    const filtered = users.filter(u => {
      if (!u) return false;
      const uId = u.id?.toLowerCase();
      const uName = u.username?.toLowerCase();
      if (uId === targetId || uId === userId.toLowerCase()) return false;
      if (targetUsername && uName === targetUsername) return false;
      if (uId && deletedSet.has(uId)) return false;
      if (uName && deletedSet.has(uName)) return false;
      return true;
    });

    const updatedUsers = deduplicateUsers(filtered);
    setUsers(updatedUsers);
    saveUsers(updatedUsers);
    persistStateToDatabase({
      users: updatedUsers,
      actionDescription: `Xóa nhân sự: ${userToDelete?.name || userId}`
    });
    return { success: true };
  };

  const registerUser = (userData: { 
    name: string; 
    username: string; 
    pass: string; 
    roleTitle: string; 
    department: string; 
    role?: UserRole;
    permissions?: PermissionId[];
    secondaryPositions?: UserPosition[];
  }): { success: boolean; message?: string } => {
    return createUser({
      ...userData,
      role: userData.role || 'STAFF',
    });
  };

  // Profile modal state & User Self-Service (Đổi mật khẩu & Cập nhật Avatar)
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [profileInitialTab, setProfileInitialTab] = useState<'PROFILE' | 'PASSWORD' | 'SIGNATURE'>('PROFILE');

  const openProfileModal = (initialTab: 'PROFILE' | 'PASSWORD' | 'SIGNATURE' = 'PROFILE') => {
    setProfileInitialTab(initialTab);
    setIsProfileModalOpen(true);
  };

  const changePassword = (currentPass: string, newPass: string): { success: boolean; message?: string } => {
    if (!activeUser) {
      return { success: false, message: 'Bạn chưa đăng nhập.' };
    }
    const currentTrimmed = currentPass.trim();
    const newTrimmed = newPass.trim();

    if (activeUser.pass && activeUser.pass !== currentTrimmed) {
      return { success: false, message: 'Mật khẩu hiện tại không chính xác. Vui lòng kiểm tra lại!' };
    }

    if (newTrimmed.length < 6) {
      return { success: false, message: 'Mật khẩu mới phải có tối thiểu 6 ký tự.' };
    }

    if (newTrimmed === currentTrimmed) {
      return { success: false, message: 'Mật khẩu mới không được trùng với mật khẩu hiện tại.' };
    }

    const res = updateUser(activeUser.id, { pass: newTrimmed });
    if (res.success) {
      return { success: true, message: 'Đổi mật khẩu thành công!' };
    }
    return res;
  };

  const updateMyProfile = (data: { name?: string; email?: string; avatar?: string; signatureUrl?: string }): { success: boolean; message?: string } => {
    if (!activeUser) {
      return { success: false, message: 'Bạn chưa đăng nhập.' };
    }
    const res = updateUser(activeUser.id, data);
    if (res.success) {
      return { success: true, message: 'Cập nhật thông tin tài khoản thành công!' };
    }
    return res;
  };

  // Department Management
  const createDepartment = (deptData: { name: string; code: string; description?: string; defaultSlaHours?: number; defaultOverdueAction?: OverdueAction }): { success: boolean; message?: string } => {
    const trimmedName = deptData.name.trim();
    const trimmedCode = deptData.code.trim().toUpperCase();
    if (!trimmedName || !trimmedCode) {
      return { success: false, message: 'Vui lòng nhập đầy đủ tên và mã phòng ban.' };
    }
    if (departments.some(d => d.name.toLowerCase() === trimmedName.toLowerCase() || d.code.toUpperCase() === trimmedCode)) {
      return { success: false, message: 'Phòng ban hoặc mã phòng ban này đã tồn tại.' };
    }
    removeDeletedDeptId(trimmedCode);
    removeDeletedDeptId(trimmedName);

    const newDept: DepartmentItem = {
      id: `dept-${Date.now()}`,
      name: trimmedName,
      code: trimmedCode,
      description: deptData.description?.trim() || '',
      defaultSlaHours: deptData.defaultSlaHours || 8,
      defaultOverdueAction: deptData.defaultOverdueAction || 'WARN_AND_RETURN',
      createdAt: new Date().toISOString()
    };

    const updatedDepts = [...departments, newDept];
    setDepartments(updatedDepts);
    saveDepartments(updatedDepts);
    persistStateToDatabase({
      departments: updatedDepts,
      actionDescription: `Thêm phòng ban mới: ${newDept.name}`
    });
    return { success: true };
  };

  const updateDepartment = (id: string, deptData: Partial<DepartmentItem>): { success: boolean; message?: string } => {
    const currentDept = departments.find(d => d.id === id);
    if (deptData.name) {
      const trimmedName = deptData.name.trim();
      if (departments.some(d => d.id !== id && d.name.toLowerCase() === trimmedName.toLowerCase())) {
        return { success: false, message: 'Tên phòng ban này đã được sử dụng.' };
      }
      if (currentDept && currentDept.name.toLowerCase() !== trimmedName.toLowerCase()) {
        addDeletedDeptId(currentDept.name);
        removeDeletedDeptId(trimmedName);
      }
    }
    if (deptData.code) {
      const trimmedCode = deptData.code.trim().toUpperCase();
      if (departments.some(d => d.id !== id && d.code.toUpperCase() === trimmedCode)) {
        return { success: false, message: 'Mã phòng ban này đã được sử dụng.' };
      }
      if (currentDept && currentDept.code.toUpperCase() !== trimmedCode) {
        addDeletedDeptId(currentDept.code);
        removeDeletedDeptId(trimmedCode);
      }
    }
    const updatedDepts = departments.map(d => {
      if (d.id !== id) return d;
      const updated = { ...d, ...deptData };
      if (deptData.code) updated.code = deptData.code.trim().toUpperCase();
      if (deptData.name) updated.name = deptData.name.trim();
      return updated;
    });
    setDepartments(updatedDepts);
    saveDepartments(updatedDepts);
    persistStateToDatabase({
      departments: updatedDepts,
      actionDescription: `Cập nhật phòng ban: ${deptData.name || id}`
    });
    return { success: true };
  };

  const deleteDepartment = (id: string): { success: boolean; message?: string } => {
    const target = departments.find(d => d.id === id || (d.code && d.code.toUpperCase() === id.toUpperCase()));
    if (!target) return { success: false, message: 'Không tìm thấy phòng ban.' };
    const hasUsers = users.some(u => u.department.toLowerCase() === target.name.toLowerCase());
    if (hasUsers) {
      return { success: false, message: `Không thể xóa phòng ban "${target.name}" vì đang có ${users.filter(u => u.department.toLowerCase() === target.name.toLowerCase()).length} nhân sự trực thuộc. Vui lòng chuyển phòng ban của nhân sự trước.` };
    }
    addDeletedDeptId(id);
    if (target.id) addDeletedDeptId(target.id);
    if (target.code) addDeletedDeptId(target.code);
    if (target.name) addDeletedDeptId(target.name);

    const deletedDeptsSet = new Set(loadDeletedDeptIds().map(s => s.toLowerCase()));
    const targetCode = target.code?.toLowerCase();
    const targetName = target.name?.toLowerCase();
    const targetId = (target.id || id).toLowerCase();

    const filtered = departments.filter(d => {
      if (!d) return false;
      const dId = d.id?.toLowerCase();
      const dCode = d.code?.toLowerCase();
      const dName = d.name?.toLowerCase();
      if (dId === targetId || dId === id.toLowerCase()) return false;
      if (targetCode && dCode === targetCode) return false;
      if (targetName && dName === targetName) return false;
      if (dId && deletedDeptsSet.has(dId)) return false;
      if (dCode && deletedDeptsSet.has(dCode)) return false;
      if (dName && deletedDeptsSet.has(dName)) return false;
      return true;
    });

    const updatedDepts = deduplicateDepartments(filtered);
    setDepartments(updatedDepts);
    saveDepartments(updatedDepts);
    persistStateToDatabase({
      departments: updatedDepts,
      actionDescription: `Xóa phòng ban: ${target.name}`
    });
    return { success: true };
  };

  // Job Title Management
  const createJobTitle = (titleData: { name: string; code: string; department: string; defaultRole?: UserRole; description?: string }): { success: boolean; message?: string } => {
    const trimmedName = titleData.name.trim();
    const trimmedCode = titleData.code.trim().toUpperCase();
    const trimmedDept = titleData.department.trim();
    if (!trimmedName || !trimmedCode || !trimmedDept) {
      return { success: false, message: 'Vui lòng nhập đầy đủ tên chức vụ, mã chức vụ và phòng ban trực thuộc.' };
    }
    if (jobTitles.some(j => j.name.toLowerCase() === trimmedName.toLowerCase() || j.code.toUpperCase() === trimmedCode)) {
      return { success: false, message: 'Chức vụ hoặc mã chức vụ này đã tồn tại.' };
    }
    removeDeletedJobId(trimmedCode);
    removeDeletedJobId(trimmedName);

    const newJobTitle: JobTitleItem = {
      id: `job-${Date.now()}`,
      name: trimmedName,
      code: trimmedCode,
      department: trimmedDept,
      defaultRole: titleData.defaultRole || 'STAFF',
      description: titleData.description?.trim() || '',
      createdAt: new Date().toISOString()
    };
    const updatedJobs = [...jobTitles, newJobTitle];
    setJobTitles(updatedJobs);
    saveJobTitles(updatedJobs);
    persistStateToDatabase({
      jobTitles: updatedJobs,
      actionDescription: `Thêm chức vụ mới: ${newJobTitle.name}`
    });
    return { success: true };
  };

  const updateJobTitle = (id: string, titleData: Partial<JobTitleItem>): { success: boolean; message?: string } => {
    const currentJob = jobTitles.find(j => j.id === id);
    if (titleData.name) {
      const trimmedName = titleData.name.trim();
      if (jobTitles.some(j => j.id !== id && j.name.toLowerCase() === trimmedName.toLowerCase())) {
        return { success: false, message: 'Tên chức vụ này đã được sử dụng.' };
      }
      if (currentJob && currentJob.name.toLowerCase() !== trimmedName.toLowerCase()) {
        addDeletedJobId(currentJob.name);
        removeDeletedJobId(trimmedName);
      }
    }
    if (titleData.code) {
      const trimmedCode = titleData.code.trim().toUpperCase();
      if (jobTitles.some(j => j.id !== id && j.code.toUpperCase() === trimmedCode)) {
        return { success: false, message: 'Mã chức vụ này đã được sử dụng.' };
      }
      if (currentJob && currentJob.code.toUpperCase() !== trimmedCode) {
        addDeletedJobId(currentJob.code);
        removeDeletedJobId(trimmedCode);
      }
    }
    const updatedJobs = jobTitles.map(j => {
      if (j.id !== id) return j;
      const updated = { ...j, ...titleData };
      if (titleData.code) updated.code = titleData.code.trim().toUpperCase();
      if (titleData.name) updated.name = titleData.name.trim();
      return updated;
    });
    setJobTitles(updatedJobs);
    saveJobTitles(updatedJobs);
    persistStateToDatabase({
      jobTitles: updatedJobs,
      actionDescription: `Cập nhật chức vụ: ${titleData.name || id}`
    });
    return { success: true };
  };

  const deleteJobTitle = (id: string): { success: boolean; message?: string } => {
    const target = jobTitles.find(j => j.id === id || (j.code && j.code.toUpperCase() === id.toUpperCase()));
    if (!target) return { success: false, message: 'Không tìm thấy chức vụ.' };
    const hasUsers = users.some(u => u.roleTitle.toLowerCase() === target.name.toLowerCase());
    if (hasUsers) {
      return { success: false, message: `Không thể xóa chức vụ "${target.name}" vì đang có ${users.filter(u => u.roleTitle.toLowerCase() === target.name.toLowerCase()).length} nhân sự nắm giữ. Vui lòng thay đổi chức vụ của nhân sự trước.` };
    }
    addDeletedJobId(id);
    if (target.id) addDeletedJobId(target.id);
    if (target.code) addDeletedJobId(target.code);
    if (target.name) addDeletedJobId(target.name);

    const deletedJobsSet = new Set(loadDeletedJobIds().map(s => s.toLowerCase()));
    const targetCode = target.code?.toLowerCase();
    const targetName = target.name?.toLowerCase();
    const targetId = (target.id || id).toLowerCase();

    const filtered = jobTitles.filter(j => {
      if (!j) return false;
      const jId = j.id?.toLowerCase();
      const jCode = j.code?.toLowerCase();
      const jName = j.name?.toLowerCase();
      if (jId === targetId || jId === id.toLowerCase()) return false;
      if (targetCode && jCode === targetCode) return false;
      if (targetName && jName === targetName) return false;
      if (jId && deletedJobsSet.has(jId)) return false;
      if (jCode && deletedJobsSet.has(jCode)) return false;
      if (jName && deletedJobsSet.has(jName)) return false;
      return true;
    });

    const updatedJobs = deduplicateJobTitles(filtered);
    setJobTitles(updatedJobs);
    saveJobTitles(updatedJobs);
    persistStateToDatabase({
      jobTitles: updatedJobs,
      actionDescription: `Xóa chức vụ: ${target.name}`
    });
    return { success: true };
  };

  // Permission Preset Management
  const createPermissionPreset = (presetData: {
    name: string;
    role: UserRole;
    roleTitle?: string;
    permissions: PermissionId[];
    description?: string;
  }): { success: boolean; message?: string; preset?: PermissionPreset } => {
    const trimmedName = presetData.name.trim();
    if (!trimmedName) {
      return { success: false, message: 'Vui lòng nhập tên mẫu phân quyền.' };
    }
    if (permissionPresets.some(p => p.name.toLowerCase() === trimmedName.toLowerCase())) {
      return { success: false, message: 'Tên mẫu phân quyền này đã tồn tại.' };
    }

    const newPreset: PermissionPreset = {
      id: `preset-${Date.now()}`,
      name: trimmedName,
      role: presetData.role || 'STAFF',
      roleTitle: presetData.roleTitle?.trim() || trimmedName,
      permissions: presetData.permissions || [],
      isSystem: false,
      description: presetData.description?.trim() || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    removeDeletedPresetId(newPreset.id);
    const updated = [...permissionPresets, newPreset];
    setPermissionPresets(updated);
    savePermissionPresets(updated);
    persistStateToDatabase({
      permissionPresets: updated,
      actionDescription: `Tạo mẫu phân quyền mới: ${newPreset.name}`
    });
    return { success: true, preset: newPreset };
  };

  const updatePermissionPreset = (id: string, presetData: Partial<PermissionPreset>): { success: boolean; message?: string } => {
    const target = permissionPresets.find(p => p.id === id);
    if (!target) return { success: false, message: 'Không tìm thấy mẫu phân quyền.' };

    if (presetData.name) {
      const trimmedName = presetData.name.trim();
      if (permissionPresets.some(p => p.id !== id && p.name.toLowerCase() === trimmedName.toLowerCase())) {
        return { success: false, message: 'Tên mẫu phân quyền này đã được sử dụng.' };
      }
    }

    const updated = permissionPresets.map(p => {
      if (p.id !== id) return p;
      return {
        ...p,
        ...presetData,
        name: presetData.name ? presetData.name.trim() : p.name,
        roleTitle: presetData.roleTitle !== undefined ? presetData.roleTitle.trim() : p.roleTitle,
        description: presetData.description !== undefined ? presetData.description.trim() : p.description,
        updatedAt: new Date().toISOString()
      };
    });

    setPermissionPresets(updated);
    savePermissionPresets(updated);
    persistStateToDatabase({
      permissionPresets: updated,
      actionDescription: `Cập nhật mẫu phân quyền: ${target.name}`
    });
    return { success: true };
  };

  const deletePermissionPreset = (id: string): { success: boolean; message?: string } => {
    const target = permissionPresets.find(p => p.id === id);
    if (!target) return { success: false, message: 'Không tìm thấy mẫu phân quyền.' };
    if (target.isSystem) {
      return { success: false, message: 'Không thể xóa mẫu phân quyền mặc định của hệ thống.' };
    }

    addDeletedPresetId(id);
    const updated = permissionPresets.filter(p => p.id !== id);
    setPermissionPresets(updated);
    savePermissionPresets(updated);
    persistStateToDatabase({
      permissionPresets: updated,
      actionDescription: `Xóa mẫu phân quyền: ${target.name}`
    });
    return { success: true };
  };

  const resetPermissionPresetsToDefault = () => {
    const currentCustom = permissionPresets.filter(p => !p.isSystem);
    const defaults = DEFAULT_PERMISSION_PRESETS.map(d => ({ ...d }));
    // Gỡ các ID của default khỏi deleted set
    defaults.forEach(d => removeDeletedPresetId(d.id));
    const merged = [...defaults, ...currentCustom];
    setPermissionPresets(merged);
    savePermissionPresets(merged);
    persistStateToDatabase({
      permissionPresets: merged,
      actionDescription: 'Khôi phục mẫu phân quyền hệ thống về mặc định'
    });
  };

  // Workflow Template Management (BPM Workflow Engine)
  const createWorkflowTemplate = (templateData: { name: string; description: string; category: string; steps: WorkflowStep[] }): { success: boolean; message?: string; template?: WorkflowTemplate } => {
    const trimmedName = templateData.name.trim();
    const trimmedCat = templateData.category.trim();
    if (!trimmedName || !trimmedCat) {
      return { success: false, message: 'Vui lòng nhập tên quy trình và loại hồ sơ áp dụng.' };
    }
    if (!Array.isArray(templateData.steps) || templateData.steps.length === 0) {
      return { success: false, message: 'Quy trình phải có ít nhất 01 bước phê duyệt.' };
    }

    // Kiểm tra không cho phép chọn trùng phòng ban trong cùng một quy trình
    const deptSet = new Set<string>();
    for (const step of templateData.steps) {
      const d = step.department.trim().toLowerCase();
      if (deptSet.has(d)) {
        return { success: false, message: `Phòng ban "${step.department}" bị trùng lặp trong quy trình. Mỗi phòng ban chỉ tham gia phê duyệt 1 lần.` };
      }
      deptSet.add(d);
    }

    if (workflowTemplates.some(w => w.name.toLowerCase() === trimmedName.toLowerCase())) {
      return { success: false, message: 'Tên mẫu quy trình này đã tồn tại.' };
    }

    const newTemplate: WorkflowTemplate = {
      id: `wf-${Date.now()}`,
      name: trimmedName,
      description: templateData.description.trim(),
      category: trimmedCat,
      steps: templateData.steps.map((s, idx) => ({ ...s, order: idx + 1 })),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    removeDeletedWorkflowTemplateId(newTemplate.id);
    const updated = [...workflowTemplates, newTemplate];
    setWorkflowTemplates(updated);
    saveWorkflowTemplates(updated);
    persistStateToDatabase({
      workflowTemplates: updated,
      actionDescription: `Tạo quy trình ký mới: ${newTemplate.name}`
    });
    return { success: true, template: newTemplate };
  };

  const updateWorkflowTemplate = (id: string, templateData: Partial<WorkflowTemplate>): { success: boolean; message?: string } => {
    const target = workflowTemplates.find(w => w.id === id);
    if (!target) return { success: false, message: 'Không tìm thấy mẫu quy trình ký.' };

    if (templateData.name) {
      const trimmedName = templateData.name.trim();
      if (workflowTemplates.some(w => w.id !== id && w.name.toLowerCase() === trimmedName.toLowerCase())) {
        return { success: false, message: 'Tên mẫu quy trình này đã được sử dụng.' };
      }
    }

    // Kiểm tra không cho phép trùng phòng ban nếu có cập nhật các bước
    if (Array.isArray(templateData.steps)) {
      const deptSet = new Set<string>();
      for (const step of templateData.steps) {
        const d = step.department.trim().toLowerCase();
        if (deptSet.has(d)) {
          return { success: false, message: `Phòng ban "${step.department}" bị trùng lặp trong quy trình. Mỗi phòng ban chỉ tham gia phê duyệt 1 lần.` };
        }
        deptSet.add(d);
      }
    }

    const updated = workflowTemplates.map(w => {
      if (w.id !== id) return w;
      const steps = templateData.steps ? templateData.steps.map((s, idx) => ({ ...s, order: idx + 1 })) : w.steps;
      return {
        ...w,
        ...templateData,
        name: templateData.name ? templateData.name.trim() : w.name,
        category: templateData.category ? templateData.category.trim() : w.category,
        description: templateData.description !== undefined ? templateData.description.trim() : w.description,
        steps,
        updatedAt: new Date().toISOString()
      };
    });

    setWorkflowTemplates(updated);
    saveWorkflowTemplates(updated);
    persistStateToDatabase({
      workflowTemplates: updated,
      actionDescription: `Cập nhật quy trình ký: ${templateData.name || target.name}`
    });
    return { success: true };
  };

  const deleteWorkflowTemplate = (id: string): { success: boolean; message?: string } => {
    const target = workflowTemplates.find(w => w.id === id);
    if (!target) return { success: false, message: 'Không tìm thấy mẫu quy trình ký.' };

    addDeletedWorkflowTemplateId(id);
    const updated = workflowTemplates.filter(w => w.id !== id);
    setWorkflowTemplates(updated);
    saveWorkflowTemplates(updated);
    persistStateToDatabase({
      workflowTemplates: updated,
      actionDescription: `Xóa quy trình ký: ${target.name}`
    });
    return { success: true };
  };

  const resetWorkflowTemplatesToDefault = () => {
    const defaults = WORKFLOW_TEMPLATES.map(w => ({ ...w }));
    defaults.forEach(w => removeDeletedWorkflowTemplateId(w.id));
    const nonDefault = workflowTemplates.filter(w => !WORKFLOW_TEMPLATES.some(dw => dw.id === w.id));
    const merged = deduplicateWorkflowTemplates([...defaults, ...nonDefault]);
    setWorkflowTemplates(merged);
    saveWorkflowTemplates(merged);
    persistStateToDatabase({
      workflowTemplates: merged,
      actionDescription: 'Khôi phục quy trình ký hệ thống về mặc định'
    });
  };


  const markNotificationAsRead = (id: string) => {
    const updated = notifications.map(n => n.id === id ? { ...n, read: true } : n);
    setNotifications(updated);
    saveNotifications(updated);
    persistStateToDatabase({
      notifications: updated,
      actionDescription: 'Đánh dấu đã đọc thông báo'
    }).catch(() => {});
  };

  const createDocument = (docData: Omit<DocumentItem, 'id' | 'createdAt' | 'updatedAt' | 'auditLogs'>): DocumentItem => {
    const now = new Date();
    const nowIso = now.toISOString();
    const newDocId = `doc-${Date.now()}`;
    const creator = activeUser || users[0];

    const stepsWithDates: ApprovalStep[] = docData.steps.map((step, idx) => {
      if (idx === 0) {
        const sla = step.slaHours || 8;
        return {
          ...step,
          status: 'CURRENT' as StepStatus,
          startedAt: nowIso,
          deadline: step.deadline || new Date(now.getTime() + sla * 3600 * 1000).toISOString(),
          isOverdue: false,
        };
      }
      return step;
    });
    
    const newDoc: DocumentItem = {
      ...docData,
      id: newDocId,
      createdAt: nowIso,
      updatedAt: nowIso,
      deadline: stepsWithDates[0]?.deadline || docData.deadline,
      steps: stepsWithDates,
      isOverdue: false,
      auditLogs: [
        {
          id: `log-${Date.now()}`,
          documentId: newDocId,
          action: 'CREATE',
          actorId: creator.id,
          actorName: creator.name,
          actorTitle: creator.roleTitle,
          timestamp: nowIso,
          comment: 'Khởi tạo và trình ký hồ sơ mới',
          newStatus: docData.status,
        }
      ]
    };

    const updatedDocs = [newDoc, ...documents];
    setDocuments(updatedDocs);
    saveDocuments(updatedDocs);

    // Thêm thông báo cho người có trách nhiệm duyệt bước 1
    const firstApprover = stepsWithDates[0];
    let updatedNotifs = notifications;
    if (firstApprover) {
      const newNotif: NotificationItem = {
        id: `notif-${Date.now()}`,
        title: 'Hồ sơ mới cần duyệt',
        message: `Hồ sơ "${newDoc.code} - ${newDoc.title}" đang chờ bạn duyệt tại bước 1 (${firstApprover.title}). SLA: ${firstApprover.slaHours || 8}h.`,
        documentId: newDoc.id,
        documentCode: newDoc.code,
        type: 'ACTION_REQUIRED',
        read: false,
        createdAt: nowIso,
        actorId: creator.id,
        recipientId: firstApprover.approverId,
        recipientRole: firstApprover.approverRole,
        targetStepIndex: 0,
        targetDepartment: firstApprover.department,
      };
      updatedNotifs = [newNotif, ...notifications];
      setNotifications(updatedNotifs);
      saveNotifications(updatedNotifs);
      sendDeviceNotification({
        title: newNotif.title,
        body: newNotif.message,
        documentId: newNotif.documentId,
        type: newNotif.type
      });
    }

    persistStateToDatabase({
      documents: updatedDocs,
      notifications: updatedNotifs,
      actionDescription: `Khởi tạo trình ký hồ sơ ${newDoc.code} - ${newDoc.title}`
    }).catch(e => console.warn('Lỗi persist database khi tạo hồ sơ:', e));

    return newDoc;
  };

  // 1. Hành động Thẩm định & Kiểm tra nội bộ ban (Chặng 1 trong bước duyệt phòng ban)
  const performInternalCheck = (documentId: string, comment: string, signatureImage?: string) => {
    if (!activeUser) return;
    const targetDoc = documents.find(d => d.id === documentId);
    if (!targetDoc) return;
    const curStep = targetDoc.steps[targetDoc.currentStepIndex];
    if (!curStep || curStep.status !== 'CURRENT' || !canUserPerformInternalCheck(activeUser, curStep)) {
      console.warn('User not authorized to perform internal check for department:', curStep?.department);
      return;
    }

    const now = new Date().toISOString();
    const currentStepIdx = targetDoc.currentStepIndex;
    const updatedSteps = [...targetDoc.steps];
    updatedSteps[currentStepIdx] = {
      ...curStep,
      isInternalChecked: true,
      checkedByName: activeUser.name,
      checkedAt: now,
      checkedComment: comment || 'Đã kiểm tra nội bộ hồ sơ hợp lệ',
      checkedSignature: signatureImage || 'internal_checked',
    };

    const newLog: AuditLog = {
      id: `log-${Date.now()}`,
      documentId: targetDoc.id,
      action: 'APPROVE' as const,
      actorId: activeUser.id,
      actorName: activeUser.name,
      actorTitle: activeUser.roleTitle,
      timestamp: now,
      comment: comment 
        ? `[Kiểm tra nội bộ]: ${comment}` 
        : `Đã kiểm tra nội bộ hồ sơ tại ${curStep.department}, chuyển cấp Quản lý ban phê duyệt`,
      previousStatus: targetDoc.status,
      newStatus: targetDoc.status,
    };

    const updatedDoc: DocumentItem = {
      ...targetDoc,
      steps: updatedSteps,
      updatedAt: now,
      auditLogs: [...targetDoc.auditLogs, newLog],
    };

    const updatedDocs = documents.map(d => d.id === documentId ? updatedDoc : d);
    setDocuments(updatedDocs);
    saveDocuments(updatedDocs);

    if (selectedDocument?.id === documentId) {
      setSelectedDocument(updatedDoc);
    }

    // Gửi thông báo đến cấp Quản lý của phòng ban
    const checkNotif: NotificationItem = {
      id: `notif-${Date.now()}`,
      title: `Hồ sơ đã qua kiểm tra nội bộ - Chờ Quản lý ${curStep.department} duyệt`,
      message: `Hồ sơ "${targetDoc.code} - ${targetDoc.title}" đã được chuyên viên ${activeUser.name} kiểm tra nội bộ. Kính mời cấp Quản lý ban xem xét và ký số.`,
      documentId: targetDoc.id,
      documentCode: targetDoc.code,
      type: 'ACTION_REQUIRED',
      read: false,
      createdAt: now,
      actorId: activeUser.id,
      targetStepIndex: currentStepIdx,
      targetDepartment: curStep.department,
    };
    const updatedNotifs = [checkNotif, ...notifications];
    setNotifications(updatedNotifs);
    saveNotifications(updatedNotifs);
    sendDeviceNotification({
      title: checkNotif.title,
      body: checkNotif.message,
      documentId: checkNotif.documentId,
      type: checkNotif.type
    });

    persistStateToDatabase({
      documents: updatedDocs,
      notifications: updatedNotifs,
      actionDescription: `Kiểm tra nội bộ hồ sơ ${targetDoc.code}`
    }).catch(e => console.warn('Lỗi persist NAS khi kiểm tra nội bộ:', e));
  };

  // 2. Hành động Phê duyệt cấp Quản lý (Chặng 2 / Duyệt chính thức bước)
  const approveStep = (documentId: string, comment: string, signatureImage?: string) => {
    if (!activeUser) return;
    const targetDoc = documents.find(d => d.id === documentId);
    if (!targetDoc) return;
    const curStep = targetDoc.steps[targetDoc.currentStepIndex];
    if (!curStep || curStep.status !== 'CURRENT' || !isUserApproverForStep(activeUser, curStep)) {
      console.warn('User not authorized to approve step for department:', curStep?.department);
      return;
    }

    const now = new Date().toISOString();
    const currentStepIdx = targetDoc.currentStepIndex;

    // Cập nhật bước hiện tại hoàn tất
    const updatedSteps = [...targetDoc.steps];
    updatedSteps[currentStepIdx] = {
      ...curStep,
      status: 'APPROVED',
      isInternalChecked: true,
      checkedByName: curStep.checkedByName || activeUser.name,
      checkedAt: curStep.checkedAt || now,
      comment: comment || 'Đã kiểm tra và phê duyệt',
      decisionDate: now,
      signatureImage: signatureImage || 'signature_stamp',
      approverId: activeUser.id,
      approverName: activeUser.name,
      approverTitle: activeUser.roleTitle,
    };

    const isLastStep = currentStepIdx === targetDoc.steps.length - 1;
    let newStatus: DocumentStatus = isLastStep ? 'APPROVED' : 'IN_PROGRESS';
    let newStepIdx = currentStepIdx;

    if (!isLastStep) {
      newStepIdx = currentStepIdx + 1;
      const nextStep = updatedSteps[newStepIdx];
      const nextStepSla = nextStep.slaHours || 8;
      const nextDeadline = new Date(Date.now() + nextStepSla * 3600 * 1000).toISOString();

      updatedSteps[newStepIdx] = {
        ...nextStep,
        status: 'CURRENT',
        startedAt: now,
        deadline: nextDeadline,
        isOverdue: false,
      };
    }

    const newLog: AuditLog = {
      id: `log-${Date.now()}`,
      documentId: targetDoc.id,
      action: 'APPROVE' as const,
      actorId: activeUser.id,
      actorName: activeUser.name,
      actorTitle: activeUser.roleTitle,
      timestamp: now,
      comment: comment ? `Phê duyệt: ${comment}` : `Đã duyệt bước ${currentStepIdx + 1}: ${curStep.title}`,
      previousStatus: targetDoc.status,
      newStatus: newStatus,
    };

    const updatedDoc: DocumentItem = {
      ...targetDoc,
      status: newStatus,
      currentStepIndex: newStepIdx,
      steps: updatedSteps,
      deadline: isLastStep ? undefined : updatedSteps[newStepIdx]?.deadline,
      isOverdue: false,
      overdueDepartment: undefined,
      overdueHours: undefined,
      updatedAt: now,
      auditLogs: [...targetDoc.auditLogs, newLog],
    };

    const updatedDocs = documents.map(d => d.id === documentId ? updatedDoc : d);
    setDocuments(updatedDocs);
    saveDocuments(updatedDocs);

    if (selectedDocument?.id === targetDoc.id) {
      setSelectedDocument(updatedDoc);
    }

    let addedNotifs: NotificationItem[] = [];

    if (isLastStep) {
      // BƯỚC CUỐI CÙNG: Sau khi duyệt thì chỉ người lập hồ sơ (và Cc) nhận được thông báo, người duyệt KHÔNG nhận.
      const doneNotif: NotificationItem = {
        id: `notif-${Date.now()}`,
        title: 'Hồ sơ đã được phê duyệt hoàn tất',
        message: `Hồ sơ "${targetDoc.code} - ${targetDoc.title}" đã được hoàn tất phê duyệt & đóng dấu điện tử bởi ${activeUser.name}.`,
        documentId: targetDoc.id,
        documentCode: targetDoc.code,
        type: 'APPROVED',
        read: false,
        createdAt: now,
        actorId: activeUser.id,
        recipientId: targetDoc.creatorId,
        recipientIds: [targetDoc.creatorId, ...(targetDoc.ccUsers?.map(c => c.id) || [])],
      };
      addedNotifs = [doneNotif];
      sendDeviceNotification({
        title: doneNotif.title,
        body: doneNotif.message,
        documentId: doneNotif.documentId,
        type: doneNotif.type
      });
    } else {
      const nextApprover = updatedSteps[newStepIdx];
      const nextNotifTitle = 'Hồ sơ mới cần xử lý';
      const nextNotifMsg = `Hồ sơ "${targetDoc.code} - ${targetDoc.title}" đang chờ xử lý tại bước ${newStepIdx + 1} (${nextApprover.title}). SLA: ${nextApprover.slaHours || 8}h.`;

      addedNotifs = [
        // 1. Người lập hồ sơ nhận được thông báo bước hiện tại đã duyệt xong
        {
          id: `notif-${Date.now()}-creator`,
          title: `Hồ sơ đã được duyệt bước ${currentStepIdx + 1}`,
          message: `Hồ sơ "${targetDoc.code} - ${targetDoc.title}" đã được ${activeUser.name} phê duyệt tại bước ${currentStepIdx + 1} (${curStep.department || curStep.title}). Hồ sơ đã chuyển đến bước tiếp theo.`,
          documentId: targetDoc.id,
          documentCode: targetDoc.code,
          type: 'INFO',
          read: false,
          createdAt: now,
          actorId: activeUser.id,
          recipientId: targetDoc.creatorId,
        },
        // 2. Người có trách nhiệm duyệt bước tiếp theo nhận thông báo
        {
          id: `notif-${Date.now()}-next`,
          title: nextNotifTitle,
          message: nextNotifMsg,
          documentId: targetDoc.id,
          documentCode: targetDoc.code,
          type: 'ACTION_REQUIRED',
          read: false,
          createdAt: now,
          actorId: activeUser.id,
          recipientId: nextApprover.approverId,
          recipientRole: nextApprover.approverRole,
          targetStepIndex: newStepIdx,
          targetDepartment: nextApprover.department,
        }
      ];

      addedNotifs.forEach(n => {
        sendDeviceNotification({
          title: n.title,
          body: n.message,
          documentId: n.documentId,
          type: n.type
        });
      });
    }

    const updatedNotifs = [...addedNotifs, ...notifications];
    setNotifications(updatedNotifs);
    saveNotifications(updatedNotifs);

    persistStateToDatabase({
      documents: updatedDocs,
      notifications: updatedNotifs,
      actionDescription: `Phê duyệt hồ sơ ${targetDoc.code} (Bước ${currentStepIdx + 1})`
    }).catch(e => console.warn('Lỗi persist NAS khi phê duyệt:', e));
  };

  const returnOverdueDocument = (documentId: string, reason: string): { success: boolean; message?: string } => {
    if (!activeUser) return { success: false, message: 'Người dùng chưa đăng nhập.' };
    const targetDoc = documents.find(d => d.id === documentId);
    if (!targetDoc) return { success: false, message: 'Không tìm thấy hồ sơ.' };

    const now = new Date().toISOString();
    const currentStep = targetDoc.steps[targetDoc.currentStepIndex];
    const deptName = currentStep?.department || 'Phòng ban liên quan';

    const newLog: AuditLog = {
      id: `log-${Date.now()}`,
      documentId: targetDoc.id,
      action: 'REQUEST_INFO',
      actorId: activeUser.id,
      actorName: activeUser.name,
      actorTitle: activeUser.roleTitle,
      timestamp: now,
      comment: `[TRẢ HỒ SƠ DO QUÁ HẠN SLA - Phòng ${deptName}]: ${reason}`,
      previousStatus: targetDoc.status,
      newStatus: 'ADDITIONAL_REQ',
    };

    const updatedDoc: DocumentItem = {
      ...targetDoc,
      status: 'ADDITIONAL_REQ',
      isOverdue: false,
      overdueDepartment: undefined,
      overdueHours: undefined,
      updatedAt: now,
      auditLogs: [...targetDoc.auditLogs, newLog],
    };

    const updatedDocs = documents.map(d => d.id === documentId ? updatedDoc : d);
    setDocuments(updatedDocs);
    saveDocuments(updatedDocs);

    if (selectedDocument?.id === targetDoc.id) {
      setSelectedDocument(updatedDoc);
    }

    const slaNotif: NotificationItem = {
      id: `notif-${Date.now()}`,
      title: `Hồ sơ bị trả về do vi phạm SLA (${deptName})`,
      message: `${activeUser.name} đã trả hồ sơ "${targetDoc.code}" về cho người lập do phòng ${deptName} xử lý quá hạn SLA. Lý do: ${reason}`,
      documentId: targetDoc.id,
      documentCode: targetDoc.code,
      type: 'SLA_VIOLATION',
      read: false,
      createdAt: now,
      actorId: activeUser.id,
      recipientId: targetDoc.creatorId,
      recipientIds: [targetDoc.creatorId, ...(targetDoc.ccUsers?.map(c => c.id) || [])],
    };
    const updatedNotifs = [slaNotif, ...notifications];
    setNotifications(updatedNotifs);
    saveNotifications(updatedNotifs);
    sendDeviceNotification({
      title: slaNotif.title,
      body: slaNotif.message,
      documentId: slaNotif.documentId,
      type: slaNotif.type
    });

    persistStateToDatabase({
      documents: updatedDocs,
      notifications: updatedNotifs,
      actionDescription: `Trả hồ sơ quá hạn SLA ${targetDoc.code}`
    }).catch(e => console.warn('Lỗi persist NAS khi trả hồ sơ quá hạn:', e));

    return { success: true, message: 'Đã trả hồ sơ về cho người lập thành công.' };
  };

  const rejectDocument = (documentId: string, reason: string) => {
    if (!activeUser) return;
    const targetDoc = documents.find(d => d.id === documentId);
    if (!targetDoc) return;
    const curStep = targetDoc.steps[targetDoc.currentStepIndex];
    if (!curStep || curStep.status !== 'CURRENT' || !isUserApproverForStep(activeUser, curStep)) {
      console.warn('User not authorized to reject step for department:', curStep?.department);
      return;
    }

    const now = new Date().toISOString();
    const currentStepIdx = targetDoc.currentStepIndex;
    const updatedSteps = [...targetDoc.steps];
    if (curStep) {
      updatedSteps[currentStepIdx] = {
        ...curStep,
        status: 'REJECTED',
        comment: reason,
        decisionDate: now,
        approverId: activeUser.id,
        approverName: activeUser.name,
      };
    }

    const newLog = {
      id: `log-${Date.now()}`,
      documentId: targetDoc.id,
      action: 'REJECT' as const,
      actorId: activeUser.id,
      actorName: activeUser.name,
      actorTitle: activeUser.roleTitle,
      timestamp: now,
      comment: `Từ chối phê duyệt: ${reason}`,
      previousStatus: targetDoc.status,
      newStatus: 'REJECTED' as DocumentStatus,
    };

    const updatedDoc: DocumentItem = {
      ...targetDoc,
      status: 'REJECTED',
      steps: updatedSteps,
      updatedAt: now,
      auditLogs: [...targetDoc.auditLogs, newLog],
    };

    const updatedDocs = documents.map(d => d.id === documentId ? updatedDoc : d);
    setDocuments(updatedDocs);
    saveDocuments(updatedDocs);

    if (selectedDocument?.id === targetDoc.id) {
      setSelectedDocument(updatedDoc);
    }

    const rejectNotif: NotificationItem = {
      id: `notif-${Date.now()}`,
      title: 'Hồ sơ bị từ chối phê duyệt',
      message: `Hồ sơ "${targetDoc.code}" bị từ chối bởi ${activeUser.name}. Lý do: ${reason}`,
      documentId: targetDoc.id,
      documentCode: targetDoc.code,
      type: 'REJECTED',
      read: false,
      createdAt: now,
      actorId: activeUser.id,
      recipientId: targetDoc.creatorId,
    };
    const updatedNotifs = [rejectNotif, ...notifications];
    setNotifications(updatedNotifs);
    saveNotifications(updatedNotifs);
    sendDeviceNotification({
      title: rejectNotif.title,
      body: rejectNotif.message,
      documentId: rejectNotif.documentId,
      type: rejectNotif.type
    });

    persistStateToDatabase({
      documents: updatedDocs,
      notifications: updatedNotifs,
      actionDescription: `Từ chối duyệt hồ sơ ${targetDoc.code}`
    }).catch(e => console.warn('Lỗi persist NAS khi từ chối hồ sơ:', e));
  };

  const requestAdditionalInfo = (documentId: string, note: string) => {
    if (!activeUser) return;
    const targetDoc = documents.find(d => d.id === documentId);
    if (!targetDoc) return;
    const curStep = targetDoc.steps[targetDoc.currentStepIndex];
    if (!curStep || curStep.status !== 'CURRENT' || !isUserApproverForStep(activeUser, curStep)) {
      console.warn('User not authorized to request info for department:', curStep?.department);
      return;
    }

    const now = new Date().toISOString();
    const newLog = {
      id: `log-${Date.now()}`,
      documentId: targetDoc.id,
      action: 'REQUEST_INFO' as const,
      actorId: activeUser.id,
      actorName: activeUser.name,
      actorTitle: activeUser.roleTitle,
      timestamp: now,
      comment: `Yêu cầu bổ sung tài liệu/thông tin: ${note}`,
      previousStatus: targetDoc.status,
      newStatus: 'ADDITIONAL_REQ' as DocumentStatus,
    };

    const updatedDoc: DocumentItem = {
      ...targetDoc,
      status: 'ADDITIONAL_REQ',
      updatedAt: now,
      auditLogs: [...targetDoc.auditLogs, newLog],
    };

    const updatedDocs = documents.map(d => d.id === documentId ? updatedDoc : d);
    setDocuments(updatedDocs);
    saveDocuments(updatedDocs);

    if (selectedDocument?.id === targetDoc.id) {
      setSelectedDocument(updatedDoc);
    }

    // BẮT BUỘC: Hồ sơ trả về sẽ trả về đúng tài khoản của người lập (recipientId: doc.creatorId)
    const reqNotif: NotificationItem = {
      id: `notif-${Date.now()}`,
      title: 'Yêu cầu bổ sung hồ sơ',
      message: `${activeUser.name} yêu cầu bổ sung hồ sơ "${targetDoc.code}": ${note}`,
      documentId: targetDoc.id,
      documentCode: targetDoc.code,
      type: 'ACTION_REQUIRED',
      read: false,
      createdAt: now,
      actorId: activeUser.id,
      recipientId: targetDoc.creatorId,
    };
    const updatedNotifs = [reqNotif, ...notifications];
    setNotifications(updatedNotifs);
    saveNotifications(updatedNotifs);
    sendDeviceNotification({
      title: reqNotif.title,
      body: reqNotif.message,
      documentId: reqNotif.documentId,
      type: reqNotif.type
    });

    persistStateToDatabase({
      documents: updatedDocs,
      notifications: updatedNotifs,
      actionDescription: `Yêu cầu bổ sung hồ sơ ${targetDoc.code}`
    }).catch(e => console.warn('Lỗi persist NAS khi yêu cầu bổ sung:', e));
  };

  const resubmitDocument = (
    documentId: string, 
    data: {
      title?: string;
      amount?: number;
      description?: string;
      contentHtml?: string;
      attachments: DocumentItem['attachments'];
      supplementNote: string;
      resubmitMode: ResubmitMode;
    }
  ): { success: boolean; message?: string } => {
    if (!activeUser) return { success: false, message: 'Người dùng chưa đăng nhập' };
    const now = new Date().toISOString();

    // BẢO MẬT: Hồ sơ trả về chỉ đúng người lập mới có quyền bổ sung và gửi lại!
    const targetDocToResubmit = documents.find(d => d.id === documentId);
    if (!targetDocToResubmit) return { success: false, message: 'Không tìm thấy hồ sơ.' };
    if (targetDocToResubmit.creatorId !== activeUser.id && activeUser.role !== 'ADMIN') {
      return { success: false, message: 'Hồ sơ đã được trả về cho người lập. Chỉ đúng tài khoản người lập mới có quyền bổ sung và gửi lại.' };
    }

    const isContinuing = data.resubmitMode === 'CONTINUE_FROM_CURRENT';
    const targetStepIndex = isContinuing ? targetDocToResubmit.currentStepIndex : 0;
    const targetStatus: DocumentStatus = isContinuing 
      ? (targetDocToResubmit.currentStepIndex === 0 ? 'PENDING' : 'IN_PROGRESS')
      : 'PENDING';

    // Cập nhật các bước duyệt
    const updatedSteps = targetDocToResubmit.steps.map((step, idx) => {
      if (isContinuing) {
        if (idx === targetDocToResubmit.currentStepIndex) {
          return {
            ...step,
            status: 'CURRENT' as StepStatus,
          };
        }
        return step;
      } else {
        return {
          ...step,
          status: (idx === 0 ? 'CURRENT' : 'PENDING') as StepStatus,
          comment: undefined,
          decisionDate: undefined,
          signatureImage: undefined,
        };
      }
    });

    const targetApprover = updatedSteps[targetStepIndex];
    const approverNameDisplay = targetApprover?.approverName || targetApprover?.approverTitle || targetApprover?.department || 'Cấp phê duyệt';
    const modeDescription = isContinuing 
      ? `Duyệt tiếp tục từ Bước ${targetStepIndex + 1} (${approverNameDisplay})`
      : `Trình duyệt lại từ Bước 1 (${updatedSteps[0]?.approverName || updatedSteps[0]?.approverTitle || updatedSteps[0]?.department})`;

    const newLog: AuditLog = {
      id: `log-${Date.now()}`,
      documentId: targetDocToResubmit.id,
      action: 'RESUBMIT',
      actorId: activeUser.id,
      actorName: activeUser.name,
      actorTitle: activeUser.roleTitle,
      timestamp: now,
      comment: `[Bổ sung hồ sơ - ${modeDescription}]: ${data.supplementNote}`,
      previousStatus: targetDocToResubmit.status,
      newStatus: targetStatus,
    };

    const updatedDoc: DocumentItem = {
      ...targetDocToResubmit,
      title: data.title !== undefined ? data.title : targetDocToResubmit.title,
      amount: data.amount !== undefined ? data.amount : targetDocToResubmit.amount,
      description: data.description !== undefined ? data.description : targetDocToResubmit.description,
      contentHtml: data.contentHtml !== undefined ? data.contentHtml : targetDocToResubmit.contentHtml,
      attachments: data.attachments || targetDocToResubmit.attachments,
      status: targetStatus,
      currentStepIndex: targetStepIndex,
      steps: updatedSteps,
      updatedAt: now,
      auditLogs: [...targetDocToResubmit.auditLogs, newLog],
    };

    const updatedDocs = documents.map(d => d.id === documentId ? updatedDoc : d);
    setDocuments(updatedDocs);
    saveDocuments(updatedDocs);

    if (selectedDocument?.id === documentId) {
      setSelectedDocument(updatedDoc);
    }

    const resubmitNotif: NotificationItem = {
      id: `notif-${Date.now()}`,
      title: isContinuing ? 'Hồ sơ đã được bổ sung & gửi lại' : 'Hồ sơ trình duyệt lại từ đầu',
      message: `${activeUser.name} đã bổ sung hồ sơ "${targetDocToResubmit.code}" (${modeDescription}): ${data.supplementNote}`,
      documentId: targetDocToResubmit.id,
      documentCode: targetDocToResubmit.code,
      type: 'ACTION_REQUIRED',
      read: false,
      createdAt: now,
      actorId: activeUser.id,
      recipientId: targetApprover?.approverId,
      recipientRole: targetApprover?.approverRole,
      targetStepIndex: targetStepIndex,
      targetDepartment: targetApprover?.department,
    };
    const updatedNotifs = [resubmitNotif, ...notifications];
    setNotifications(updatedNotifs);
    saveNotifications(updatedNotifs);
    sendDeviceNotification({
      title: resubmitNotif.title,
      body: resubmitNotif.message,
      documentId: resubmitNotif.documentId,
      type: resubmitNotif.type
    });

    persistStateToDatabase({
      documents: updatedDocs,
      notifications: updatedNotifs,
      actionDescription: `Gửi lại hồ sơ bổ sung ${targetDocToResubmit.code}`
    }).catch(e => console.warn('Lỗi persist NAS khi gửi lại hồ sơ:', e));

    return { 
      success: true, 
      message: 'Đã bổ sung và gửi lại hồ sơ thành công!' 
    };
  };

  const deleteDocument = (documentId: string) => {
    const docToDelete = documents.find(d => d.id === documentId);
    addDeletedDocumentId(documentId);
    if (docToDelete?.code) {
      addDeletedDocumentId(docToDelete.code);
    }
    const updatedDocs = deduplicateDocuments(documents.filter(d => d.id !== documentId));
    setDocuments(updatedDocs);
    saveDocuments(updatedDocs);

    const updatedNotifs = notifications.filter(n => n.documentId !== documentId);
    setNotifications(updatedNotifs);
    saveNotifications(updatedNotifs);

    if (selectedDocument?.id === documentId) {
      setSelectedDocument(null);
    }

    persistStateToDatabase({
      documents: updatedDocs,
      notifications: updatedNotifs,
      actionDescription: activeUser ? `${activeUser.name} (Xóa hồ sơ ${docToDelete?.code || documentId})` : 'Xóa hồ sơ'
    }).catch(e => console.warn('Lỗi đồng bộ xóa hồ sơ lên NAS:', e));
  };

  const resetToSampleData = () => {
    localStorage.removeItem('trunghai_documents_v1');
    localStorage.removeItem('trunghai_notifications_v1');
    localStorage.removeItem('trunghai_users_db_v1');
    localStorage.removeItem('trunghai_active_user_v1');
    localStorage.removeItem('trunghai_deleted_documents_v1');
    window.location.reload();
  };

  // 1. Hồ sơ được phân quyền xem:
  // "Hồ sơ của ai lập thì chỉ có người lập và người phê duyệt với người theo dõi được thấy thôi. Còn lại các tài khoản khác sẽ không thấy của nhau."
  const accessibleDocuments = useMemo(() => {
    if (!activeUser) return [];
    return documents.filter(doc => canUserAccessDocument(activeUser, doc));
  }, [documents, activeUser]);

  // Tự động đóng nếu hồ sơ đang chọn không thuộc quyền xem của người dùng
  useEffect(() => {
    if (selectedDocument && activeUser && !canUserAccessDocument(activeUser, selectedDocument)) {
      setSelectedDocument(null);
    }
  }, [activeUser, selectedDocument]);

  // 2. Thông báo được phân quyền nhận:
  // "Thông báo của hồ sơ người nào người đó nhận được đúng thông báo đó. Chỉ có người được phân quyền theo dõi toàn bộ hồ sơ mới nhận được toàn bộ thông báo."
  const userNotifications = useMemo(() => {
    if (!activeUser) return [];
    const docMap = new Map(documents.map(d => [d.id, d]));
    return notifications.filter(notif => {
      const doc = notif.documentId ? docMap.get(notif.documentId) : undefined;
      return canUserReceiveNotification(activeUser, notif, doc);
    });
  }, [notifications, activeUser, documents]);

  const unreadNotificationCount = useMemo(() => {
    return userNotifications.filter(n => !n.read).length;
  }, [userNotifications]);

  // Đồng bộ số thông báo lên Icon App ngoài màn hình chính (App Badging API)
  useEffect(() => {
    updateAppBadge(unreadNotificationCount);
  }, [unreadNotificationCount]);

  const markAllNotificationsAsRead = () => {
    const userNotifIds = new Set(userNotifications.map(n => n.id));
    const updated = notifications.map(n => userNotifIds.has(n.id) ? { ...n, read: true } : n);
    setNotifications(updated);
    saveNotifications(updated);
    persistStateToDatabase({
      notifications: updated,
      actionDescription: 'Đánh dấu tất cả thông báo đã đọc'
    }).catch(() => {});
  };

  // Tính toán số liệu thống kê dựa trên các hồ sơ người dùng có quyền thấy
  const stats = useMemo(() => {
    const total = accessibleDocuments.length;
    const pending = accessibleDocuments.filter(d => d.status === 'PENDING').length;
    const inProgress = accessibleDocuments.filter(d => d.status === 'IN_PROGRESS').length;
    const approved = accessibleDocuments.filter(d => d.status === 'APPROVED').length;
    const rejected = accessibleDocuments.filter(d => d.status === 'REJECTED').length;
    const additionalReq = accessibleDocuments.filter(d => d.status === 'ADDITIONAL_REQ').length;
    const urgentCount = accessibleDocuments.filter(d => (d.priority === 'URGENT' || d.priority === 'VERY_URGENT') && d.status !== 'APPROVED').length;
    
    // Đếm số hồ sơ cần người dùng hiện tại duyệt (chỉ tính hồ sơ trình đúng phòng ban/người dùng)
    const myPendingApprovalsCount = activeUser ? accessibleDocuments.filter(doc => {
      if (doc.status === 'APPROVED' || doc.status === 'REJECTED' || doc.status === 'ADDITIONAL_REQ') return false;
      const currentStep = doc.steps[doc.currentStepIndex];
      if (!currentStep || currentStep.status !== 'CURRENT') return false;
      return isUserApproverForStep(activeUser, currentStep);
    }).length : 0;

    const myCreatedCount = activeUser ? accessibleDocuments.filter(d => d.creatorId === activeUser.id).length : 0;

    const overdueCount = accessibleDocuments.filter(d => {
      if (d.status === 'APPROVED' || d.status === 'REJECTED') return false;
      if (d.isOverdue) return true;
      const currentStep = d.steps[d.currentStepIndex];
      return (
        currentStep?.status === 'CURRENT' &&
        !!currentStep?.deadline &&
        Date.now() > new Date(currentStep.deadline).getTime()
      );
    }).length;

    return {
      total,
      pending,
      inProgress,
      approved,
      rejected,
      additionalReq,
      urgentCount,
      overdueCount,
      myPendingApprovalsCount,
      myCreatedCount,
    };
  }, [accessibleDocuments, activeUser]);

  return (
    <DocumentContext.Provider
      value={{
        users,
        activeUser,
        isAuthenticated: !!activeUser,
        login,
        logout,
        hasPermission,
        hasAnyPermission,
        hasAllPermissions,
        createUser,
        updateUser,
        deleteUser,
        registerUser,
        departments,
        jobTitles,
        createDepartment,
        updateDepartment,
        deleteDepartment,
        createJobTitle,
        updateJobTitle,
        deleteJobTitle,
        permissionPresets,
        createPermissionPreset,
        updatePermissionPreset,
        deletePermissionPreset,
        resetPermissionPresetsToDefault,
        workflowTemplates,
        createWorkflowTemplate,
        updateWorkflowTemplate,
        deleteWorkflowTemplate,
        resetWorkflowTemplatesToDefault,
        documents: accessibleDocuments,

        notifications: userNotifications,
        unreadNotificationCount,
        markNotificationAsRead,
        markAllNotificationsAsRead,
        searchQuery,
        setSearchQuery,
        activeTab,
        setActiveTab,
        selectedDocument,
        setSelectedDocument,
        isCreateModalOpen,
        setIsCreateModalOpen,
        createDocument,
        performInternalCheck,
        approveStep,
        rejectDocument,
        requestAdditionalInfo,
        returnOverdueDocument,
        resubmitDocument,
        deleteDocument,
        resetToSampleData,
        stats,
        isNASSyncing,
        lastNASSyncTime,
        nasSyncStatus,
        autoBackupConfig,
        autoBackupCountdown,
        updateAutoBackupConfig,
        syncToNAS,
        syncFromNAS,
        testNAS,
        listBackups,
        persistStateToDatabase,

        // Profile & Password Management
        isProfileModalOpen,
        setIsProfileModalOpen,
        profileInitialTab,
        setProfileInitialTab,
        openProfileModal,
        changePassword,
        updateMyProfile,
      }}
    >
      {children}
    </DocumentContext.Provider>
  );
};

export const useDocument = () => {
  const context = useContext(DocumentContext);
  if (!context) {
    throw new Error('useDocument must be used within a DocumentProvider');
  }
  return context;
};
