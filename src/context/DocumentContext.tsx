import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { DocumentItem, ApprovalStep, NotificationItem, User, DocumentStatus, StepStatus, UserRole, PermissionId, PermissionPreset, DepartmentItem, JobTitleItem, UserPosition, ResubmitMode, AuditLog } from '../types';
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
  deduplicateUsers,
  deduplicateDepartments,
  deduplicateJobTitles,
  deduplicatePresets
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
import { USERS } from '../lib/initialData';
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
  isSameDepartment
} from '../lib/permissions';

interface DocumentContextType {
  users: User[];
  activeUser: User | null;
  isAuthenticated: boolean;
  login: (username: string, pass: string) => { success: boolean; message?: string };
  logout: () => void;
  hasPermission: (permissionId: PermissionId) => boolean;
  hasAnyPermission: (permissionIds: PermissionId[]) => boolean;
  hasAllPermissions: (permissionIds: PermissionId[]) => boolean;
  createUser: (userData: { name: string; username: string; pass: string; roleTitle: string; department: string; role?: UserRole; permissions?: PermissionId[]; secondaryPositions?: UserPosition[] }) => { success: boolean; message?: string };
  updateUser: (userId: string, userData: Partial<User>) => { success: boolean; message?: string };
  deleteUser: (userId: string) => { success: boolean; message?: string };
  registerUser?: (userData: { name: string; username: string; pass: string; roleTitle: string; department: string; role?: UserRole; permissions?: PermissionId[]; secondaryPositions?: UserPosition[] }) => { success: boolean; message?: string };
  
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
  createDepartment: (deptData: { name: string; code: string; description?: string; defaultSlaHours?: number }) => { success: boolean; message?: string };
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

const DocumentContext = createContext<DocumentContextType | undefined>(undefined);

export const DocumentProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [users, setUsers] = useState<User[]>(() => loadUsers());
  const [departments, setDepartments] = useState<DepartmentItem[]>(() => loadDepartments());
  const [jobTitles, setJobTitles] = useState<JobTitleItem[]>(() => loadJobTitles());
  const [permissionPresets, setPermissionPresets] = useState<PermissionPreset[]>(() => loadPermissionPresets());
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

  // Sync documents to storage
  useEffect(() => {
    saveDocuments(documents);
  }, [documents]);

  // Sync notifications to storage
  useEffect(() => {
    saveNotifications(notifications);
  }, [notifications]);

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
            return filteredNew.length > 0 ? [...filteredNew, ...prevNotifs] : prevNotifs;
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

      const res = await saveDatabaseToNAS({
        documents,
        users: cleanUsers,
        departments: cleanDepts,
        jobTitles: cleanJobs,
        permissionPresets: cleanPresets,
        notifications,
        deletedUserIds: loadDeletedUserIds(),
        deletedDepartmentIds: loadDeletedDeptIds(),
        deletedJobTitleIds: loadDeletedJobIds(),
        deletedPresetIds: loadDeletedPresetIds(),
        savedBy: isAuto ? 'Tự động sao lưu hệ thống' : (activeUser?.name || 'Tài khoản quản trị'),
      });
      if (res.success) {
        const nowStr = new Date().toISOString();
        setLastNASSyncTime(nowStr);
        localStorage.setItem('trunghai_last_nas_sync', nowStr);
        setNasSyncStatus('synced');
        // Reset countdown timer
        setAutoBackupCountdown(autoBackupConfig.intervalMinutes * 60);
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
  }, [documents, users, departments, jobTitles, permissionPresets, notifications, activeUser, autoBackupConfig.intervalMinutes]);

  // Lưu tức thời và đồng bộ vào Database (MinIO NAS + localStorage)
  const persistStateToDatabase = useCallback(async (overrides?: {
    users?: User[];
    departments?: DepartmentItem[];
    jobTitles?: JobTitleItem[];
    permissionPresets?: PermissionPreset[];
    documents?: DocumentItem[];
    notifications?: NotificationItem[];
    actionDescription?: string;
  }) => {
    const targetUsers = deduplicateUsers(overrides?.users || users);
    const targetDepts = deduplicateDepartments(overrides?.departments || departments);
    const targetJobs = deduplicateJobTitles(overrides?.jobTitles || jobTitles);
    const targetPresets = deduplicatePresets(overrides?.permissionPresets || permissionPresets);
    const targetDocs = overrides?.documents || documents;
    const targetNotifs = overrides?.notifications || notifications;

    // 1. Lưu tức thời vào LocalStorage
    if (overrides?.users) saveUsers(targetUsers);
    if (overrides?.departments) saveDepartments(targetDepts);
    if (overrides?.jobTitles) saveJobTitles(targetJobs);
    if (overrides?.permissionPresets) savePermissionPresets(targetPresets);
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
        notifications: targetNotifs,
        deletedUserIds: loadDeletedUserIds(),
        deletedDepartmentIds: loadDeletedDeptIds(),
        deletedJobTitleIds: loadDeletedJobIds(),
        deletedPresetIds: loadDeletedPresetIds(),
        savedBy: overrides?.actionDescription || (activeUser?.name ? `${activeUser.name} (${activeUser.roleTitle})` : 'Tài khoản quản trị'),
      });
      if (res.success) {
        const nowStr = new Date().toISOString();
        setLastNASSyncTime(nowStr);
        localStorage.setItem('trunghai_last_nas_sync', nowStr);
        setNasSyncStatus('synced');
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
  }, [users, departments, jobTitles, permissionPresets, documents, notifications, activeUser]);

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

      if (Array.isArray(snapshot.documents) && snapshot.documents.length > 0) {
        setDocuments(snapshot.documents);
        saveDocuments(snapshot.documents);
      }
      if (Array.isArray(snapshot.users) && snapshot.users.length > 0) {
        setUsers(snapshot.users);
        saveUsers(snapshot.users);
      }
      if (Array.isArray(snapshot.departments) && snapshot.departments.length > 0) {
        setDepartments(snapshot.departments);
        saveDepartments(snapshot.departments);
      }
      if (Array.isArray(snapshot.jobTitles) && snapshot.jobTitles.length > 0) {
        setJobTitles(snapshot.jobTitles);
        saveJobTitles(snapshot.jobTitles);
      }
      if (Array.isArray(snapshot.permissionPresets) && snapshot.permissionPresets.length > 0) {
        setPermissionPresets(snapshot.permissionPresets);
        savePermissionPresets(snapshot.permissionPresets);
      }
      if (Array.isArray(snapshot.notifications)) {
        setNotifications(snapshot.notifications);
        saveNotifications(snapshot.notifications);
      }

      const nowStr = new Date().toISOString();
      setLastNASSyncTime(nowStr);
      localStorage.setItem('trunghai_last_nas_sync', nowStr);
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
  }, []);

  const testNAS = useCallback(async () => {
    return await testNASConnection();
  }, []);

  const listBackups = useCallback(async () => {
    return await listNASBackups();
  }, []);

  // 1. Initial Sync from MinIO NAS on startup (Gộp thông minh để không ghi đè mất user/phòng ban đã tạo)
  useEffect(() => {
    let isMounted = true;
    const initNASAndDB = async () => {
      try {
        if (autoBackupConfig.syncOnStartup) {
          const snapshot = await fetchDatabaseFromNAS();
          if (!isMounted) return;
          if (snapshot) {
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

            const deletedUsersSet = new Set(loadDeletedUserIds().map(s => s.toLowerCase()));
            const deletedDeptsSet = new Set(loadDeletedDeptIds().map(s => s.toLowerCase()));
            const deletedJobsSet = new Set(loadDeletedJobIds().map(s => s.toLowerCase()));

            // MERGE & DEDUPLICATE USERS:
            const localUsers = loadUsers();
            const snapUsers = Array.isArray(snapshot.users) ? snapshot.users : [];
            const mergedUsers = deduplicateUsers([...localUsers, ...snapUsers]);

            // MERGE & DEDUPLICATE DEPARTMENTS:
            const localDepts = loadDepartments();
            const snapDepts = Array.isArray(snapshot.departments) ? snapshot.departments : [];
            const mergedDepts = deduplicateDepartments([...localDepts, ...snapDepts]);

            // MERGE & DEDUPLICATE JOB TITLES:
            const localJobs = loadJobTitles();
            const snapJobs = Array.isArray(snapshot.jobTitles) ? snapshot.jobTitles : [];
            const mergedJobs = deduplicateJobTitles([...localJobs, ...snapJobs]);

            // MERGE & DEDUPLICATE PERMISSION PRESETS:
            const localPresets = loadPermissionPresets();
            const snapPresets = Array.isArray(snapshot.permissionPresets) ? snapshot.permissionPresets : [];
            const mergedPresets = deduplicatePresets([...localPresets, ...snapPresets]);

            // MERGE DOCUMENTS:
            const localDocs = loadDocuments();
            const snapDocs = Array.isArray(snapshot.documents) ? snapshot.documents : [];
            const docMap = new Map<string, DocumentItem>();
            snapDocs.forEach(d => {
              if (d && d.id) docMap.set(d.id, d);
            });
            localDocs.forEach(d => {
              if (!docMap.has(d.id)) {
                docMap.set(d.id, d);
              } else {
                const existing = docMap.get(d.id)!;
                if (new Date(d.updatedAt).getTime() > new Date(existing.updatedAt).getTime()) {
                  docMap.set(d.id, d);
                }
              }
            });
            const mergedDocs = Array.from(docMap.values());

            setUsers(mergedUsers);
            setDepartments(mergedDepts);
            setJobTitles(mergedJobs);
            setPermissionPresets(mergedPresets);
            setDocuments(mergedDocs);

            saveUsers(mergedUsers);
            saveDepartments(mergedDepts);
            saveJobTitles(mergedJobs);
            savePermissionPresets(mergedPresets);
            saveDocuments(mergedDocs);

            const nowStr = new Date().toISOString();
            setLastNASSyncTime(nowStr);
            localStorage.setItem('trunghai_last_nas_sync', nowStr);
            setNasSyncStatus('synced');

            // Cập nhật lại NAS với snapshot đầy đủ nhất
            if (mergedUsers.length > snapUsers.length || 
                mergedDepts.length > snapDepts.length || 
                mergedJobs.length > snapJobs.length ||
                mergedPresets.length > snapPresets.length ||
                mergedDocs.length > snapDocs.length) {
              saveDatabaseToNAS({
                documents: mergedDocs,
                users: mergedUsers,
                departments: mergedDepts,
                jobTitles: mergedJobs,
                permissionPresets: mergedPresets,
                notifications,
                deletedUserIds: loadDeletedUserIds(),
                deletedDepartmentIds: loadDeletedDeptIds(),
                deletedJobTitleIds: loadDeletedJobIds(),
                deletedPresetIds: loadDeletedPresetIds(),
                savedBy: 'Đồng bộ gộp dữ liệu khởi động'
              }).catch(e => console.warn('Lưu snapshot gộp lên NAS:', e));
            }
          } else {
            // Push initial baseline if none exists
            saveDatabaseToNAS({
              documents,
              users,
              departments,
              jobTitles,
              permissionPresets,
              notifications,
              deletedUserIds: loadDeletedUserIds(),
              deletedDepartmentIds: loadDeletedDeptIds(),
              deletedJobTitleIds: loadDeletedJobIds(),
              deletedPresetIds: loadDeletedPresetIds(),
              savedBy: 'Khởi tạo hệ thống ban đầu'
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
  }, [autoBackupConfig.syncOnStartup]);

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
    }, 5000); // 5 seconds debounce

    return () => {
      if (mutationDebounceTimerRef.current) {
        clearTimeout(mutationDebounceTimerRef.current);
      }
    };
  }, [documents, users, departments, jobTitles, autoBackupConfig.enabled, autoBackupConfig.backupOnChange, syncToNAS]);

  // 4. Remote Polling: Check if NAS has newer snapshot from other clients
  useEffect(() => {
    if (!autoBackupConfig.enabled) return;

    const checkRemoteNAS = async () => {
      try {
        const info = await getLatestNASDatabaseInfo();
        if (info && info.exists && info.lastModified && lastNASSyncTime) {
          const remoteTime = new Date(info.lastModified).getTime();
          const localTime = new Date(lastNASSyncTime).getTime();
          // If remote is at least 10s newer than our last sync, sync it quietly
          if (remoteTime - localTime > 10000 && !isSyncInProgress.current) {
            const snapshot = await fetchDatabaseFromNAS();
            if (snapshot) {
              if (Array.isArray(snapshot.deletedUserIds)) {
                snapshot.deletedUserIds.forEach(id => addDeletedUserId(id));
              }
              if (Array.isArray(snapshot.deletedDepartmentIds)) {
                snapshot.deletedDepartmentIds.forEach(id => addDeletedDeptId(id));
              }
              if (Array.isArray(snapshot.deletedJobTitleIds)) {
                snapshot.deletedJobTitleIds.forEach(id => addDeletedJobId(id));
              }

              const currentUsers = loadUsers();
              const snapUsers = Array.isArray(snapshot.users) ? snapshot.users : [];
              const mergedUsers = deduplicateUsers([...currentUsers, ...snapUsers]);

              const currentDepts = loadDepartments();
              const snapDepts = Array.isArray(snapshot.departments) ? snapshot.departments : [];
              const mergedDepts = deduplicateDepartments([...currentDepts, ...snapDepts]);

              const currentJobs = loadJobTitles();
              const snapJobs = Array.isArray(snapshot.jobTitles) ? snapshot.jobTitles : [];
              const mergedJobs = deduplicateJobTitles([...currentJobs, ...snapJobs]);

              const currentDocs = loadDocuments();
              const snapDocs = Array.isArray(snapshot.documents) ? snapshot.documents : [];
              const docMap = new Map<string, DocumentItem>();
              snapDocs.forEach(d => {
                if (d && d.id) docMap.set(d.id, d);
              });
              currentDocs.forEach(d => {
                if (!docMap.has(d.id)) {
                  docMap.set(d.id, d);
                } else {
                  const existing = docMap.get(d.id)!;
                  if (new Date(d.updatedAt).getTime() > new Date(existing.updatedAt).getTime()) {
                    docMap.set(d.id, d);
                  }
                }
              });
              const mergedDocs = Array.from(docMap.values());

              setUsers(mergedUsers);
              setDepartments(mergedDepts);
              setJobTitles(mergedJobs);
              setDocuments(mergedDocs);

              saveUsers(mergedUsers);
              saveDepartments(mergedDepts);
              saveJobTitles(mergedJobs);
              saveDocuments(mergedDocs);

              setLastNASSyncTime(info.lastModified);
              localStorage.setItem('trunghai_last_nas_sync', info.lastModified);
            }
          }
        }
      } catch (err) {
        // Quiet fail for remote poll
      }
    };

    const pollInterval = setInterval(checkRemoteNAS, 45000); // Poll every 45s
    return () => clearInterval(pollInterval);
  }, [autoBackupConfig.enabled, lastNASSyncTime]);

  const login = (username: string, pass: string): { success: boolean; message?: string } => {
    const trimmed = username.trim().toLowerCase();
    const trimmedPass = pass.trim();

    const found = users.find(u => 
      (u.username.toLowerCase() === trimmed || 
       (u.email && u.email.toLowerCase() === trimmed) ||
       (u.id && u.id.toLowerCase() === trimmed)) && 
      u.pass === trimmedPass
    );
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

  // Department Management
  const createDepartment = (deptData: { name: string; code: string; description?: string; defaultSlaHours?: number }): { success: boolean; message?: string } => {
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

  const markNotificationAsRead = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
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

    setDocuments(prev => [newDoc, ...prev]);

    // Thêm thông báo cho người có trách nhiệm duyệt bước 1
    const firstApprover = stepsWithDates[0];
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
      setNotifications(prev => [newNotif, ...prev]);
    }

    return newDoc;
  };

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

    setDocuments(prevDocs => {
      return prevDocs.map(doc => {
        if (doc.id !== documentId) return doc;

        const currentStepIdx = doc.currentStepIndex;
        const currentStep = doc.steps[currentStepIdx];
        if (!currentStep) return doc;

        const isCurrentInternalCheck = Boolean(
          currentStep.isInternalCheck || 
          currentStep.stepType === 'INTERNAL_CHECK' || 
          currentStep.title?.toLowerCase().includes('kiểm tra nội bộ')
        );

        // Cập nhật bước hiện tại
        const updatedSteps = [...doc.steps];
        updatedSteps[currentStepIdx] = {
          ...currentStep,
          status: 'APPROVED',
          comment: comment || (isCurrentInternalCheck ? 'Đã kiểm tra nội bộ hồ sơ' : 'Đã kiểm tra và phê duyệt'),
          decisionDate: now,
          signatureImage: signatureImage || (isCurrentInternalCheck ? 'internal_checked' : 'signature_stamp'),
          approverId: activeUser.id,
          approverName: activeUser.name,
          checkedByName: isCurrentInternalCheck ? activeUser.name : currentStep.checkedByName,
          checkedAt: isCurrentInternalCheck ? now : currentStep.checkedAt,
        };

        const isLastStep = currentStepIdx === doc.steps.length - 1;
        let newStatus: DocumentStatus = isLastStep ? 'APPROVED' : 'IN_PROGRESS';
        let newStepIdx = currentStepIdx;

        if (!isLastStep) {
          newStepIdx = currentStepIdx + 1;
          const nextStep = updatedSteps[newStepIdx];
          const nextStepSla = nextStep.slaHours || 8;

          // Nếu bước tiếp theo là bước duyệt cùng phòng ban (vd: bước Kiểm tra nội bộ -> Lãnh đạo ban duyệt),
          // kế thừa hạn SLA đang chạy của phòng ban để không bị kéo dài thêm hạn
          const isSameDeptChain = isCurrentInternalCheck && isSameDepartment(currentStep.department, nextStep.department);
          const nextDeadline = (isSameDeptChain && currentStep.deadline) 
            ? currentStep.deadline 
            : new Date(Date.now() + nextStepSla * 3600 * 1000).toISOString();

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
          documentId: doc.id,
          action: 'APPROVE' as const,
          actorId: activeUser.id,
          actorName: activeUser.name,
          actorTitle: activeUser.roleTitle,
          timestamp: now,
          comment: comment 
            ? (isCurrentInternalCheck ? `[Kiểm tra nội bộ]: ${comment}` : `Phê duyệt: ${comment}`) 
            : (isCurrentInternalCheck 
                ? `Đã kiểm tra nội bộ hồ sơ và chuyển cấp quản lý (${currentStep.department}) duyệt` 
                : `Đã duyệt bước ${currentStepIdx + 1}`),
          previousStatus: doc.status,
          newStatus: newStatus,
        };

        const updatedDoc: DocumentItem = {
          ...doc,
          status: newStatus,
          currentStepIndex: newStepIdx,
          steps: updatedSteps,
          deadline: isLastStep ? undefined : updatedSteps[newStepIdx]?.deadline,
          isOverdue: false,
          overdueDepartment: undefined,
          overdueHours: undefined,
          updatedAt: now,
          auditLogs: [...doc.auditLogs, newLog],
        };

        if (selectedDocument?.id === doc.id) {
          setSelectedDocument(updatedDoc);
        }

        if (isLastStep) {
          // BƯỚC CUỐI CÙNG: Sau khi duyệt thì chỉ người lập hồ sơ (và Cc) nhận được thông báo, người duyệt KHÔNG nhận.
          setNotifications(prev => [{
            id: `notif-${Date.now()}`,
            title: 'Hồ sơ đã được phê duyệt hoàn tất',
            message: `Hồ sơ "${doc.code} - ${doc.title}" đã được hoàn tất phê duyệt & đóng dấu điện tử bởi ${activeUser.name}.`,
            documentId: doc.id,
            documentCode: doc.code,
            type: 'APPROVED',
            read: false,
            createdAt: now,
            actorId: activeUser.id,
            recipientId: doc.creatorId,
            recipientIds: [doc.creatorId, ...(doc.ccUsers?.map(c => c.id) || [])],
          }, ...prev]);
        } else {
          const nextApprover = updatedSteps[newStepIdx];
          const isNextInternalCheck = Boolean(
            nextApprover.isInternalCheck || 
            nextApprover.stepType === 'INTERNAL_CHECK' || 
            nextApprover.title?.toLowerCase().includes('kiểm tra nội bộ')
          );

          const nextNotifTitle = isNextInternalCheck 
            ? 'Hồ sơ mới cần kiểm tra nội bộ' 
            : (isCurrentInternalCheck ? 'Hồ sơ đã qua kiểm tra nội bộ - Chờ bạn duyệt' : 'Hồ sơ mới cần duyệt');

          const nextNotifMsg = isCurrentInternalCheck 
            ? `Hồ sơ "${doc.code} - ${doc.title}" đã được nhân sự ${activeUser.name} kiểm tra nội bộ. Đang chờ bạn phê duyệt tại bước ${newStepIdx + 1} (${nextApprover.title}).`
            : `Hồ sơ "${doc.code} - ${doc.title}" đang chờ bạn ${isNextInternalCheck ? 'kiểm tra nội bộ' : 'phê duyệt'} tại bước ${newStepIdx + 1} (${nextApprover.title}). SLA: ${nextApprover.slaHours || 8}h.`;

          const newNotifs: NotificationItem[] = [
            // 1. Chỉ người lập hồ sơ nhận được thông báo hồ sơ đã được duyệt bước này
            {
              id: `notif-${Date.now()}-creator`,
              title: isCurrentInternalCheck 
                ? `Hồ sơ đã hoàn tất kiểm tra nội bộ tại ${currentStep.department}` 
                : `Hồ sơ đã được duyệt bước ${currentStepIdx + 1}`,
              message: `Hồ sơ "${doc.code} - ${doc.title}" đã được ${activeUser.name} ${isCurrentInternalCheck ? 'kiểm tra nội bộ' : 'phê duyệt'} tại bước ${currentStepIdx + 1}. Hồ sơ đã chuyển đến bước tiếp theo.`,
              documentId: doc.id,
              documentCode: doc.code,
              type: 'INFO',
              read: false,
              createdAt: now,
              actorId: activeUser.id,
              recipientId: doc.creatorId,
            },
            // 2. Người có trách nhiệm duyệt bước tiếp theo nhận được thông báo chờ duyệt trước khi thực hiện
            {
              id: `notif-${Date.now()}-next`,
              title: nextNotifTitle,
              message: nextNotifMsg,
              documentId: doc.id,
              documentCode: doc.code,
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
          setNotifications(prev => [...newNotifs, ...prev]);
        }

        return updatedDoc;
      });
    });
  };

  const returnOverdueDocument = (documentId: string, reason: string): { success: boolean; message?: string } => {
    if (!activeUser) return { success: false, message: 'Người dùng chưa đăng nhập.' };
    const targetDoc = documents.find(d => d.id === documentId);
    if (!targetDoc) return { success: false, message: 'Không tìm thấy hồ sơ.' };

    const now = new Date().toISOString();
    const currentStep = targetDoc.steps[targetDoc.currentStepIndex];
    const deptName = currentStep?.department || 'Phòng ban liên quan';

    setDocuments(prevDocs => {
      return prevDocs.map(doc => {
        if (doc.id !== documentId) return doc;

        const newLog: AuditLog = {
          id: `log-${Date.now()}`,
          documentId: doc.id,
          action: 'REQUEST_INFO',
          actorId: activeUser.id,
          actorName: activeUser.name,
          actorTitle: activeUser.roleTitle,
          timestamp: now,
          comment: `[TRẢ HỒ SƠ DO QUÁ HẠN SLA - Phòng ${deptName}]: ${reason}`,
          previousStatus: doc.status,
          newStatus: 'ADDITIONAL_REQ',
        };

        const updatedDoc: DocumentItem = {
          ...doc,
          status: 'ADDITIONAL_REQ',
          isOverdue: false,
          overdueDepartment: undefined,
          overdueHours: undefined,
          updatedAt: now,
          auditLogs: [...doc.auditLogs, newLog],
        };

        if (selectedDocument?.id === doc.id) {
          setSelectedDocument(updatedDoc);
        }

        setNotifications(prev => [{
          id: `notif-${Date.now()}`,
          title: `Hồ sơ bị trả về do vi phạm SLA (${deptName})`,
          message: `${activeUser.name} đã trả hồ sơ "${doc.code}" về cho người lập do phòng ${deptName} xử lý quá hạn SLA. Lý do: ${reason}`,
          documentId: doc.id,
          documentCode: doc.code,
          type: 'SLA_VIOLATION',
          read: false,
          createdAt: now,
          actorId: activeUser.id,
          recipientId: doc.creatorId,
          recipientIds: [doc.creatorId, ...(doc.ccUsers?.map(c => c.id) || [])],
        }, ...prev]);

        return updatedDoc;
      });
    });

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

    setDocuments(prevDocs => {
      return prevDocs.map(doc => {
        if (doc.id !== documentId) return doc;

        const currentStepIdx = doc.currentStepIndex;
        const currentStep = doc.steps[currentStepIdx];

        const updatedSteps = [...doc.steps];
        if (currentStep) {
          updatedSteps[currentStepIdx] = {
            ...currentStep,
            status: 'REJECTED',
            comment: reason,
            decisionDate: now,
            approverId: activeUser.id,
            approverName: activeUser.name,
          };
        }

        const newLog = {
          id: `log-${Date.now()}`,
          documentId: doc.id,
          action: 'REJECT' as const,
          actorId: activeUser.id,
          actorName: activeUser.name,
          actorTitle: activeUser.roleTitle,
          timestamp: now,
          comment: `Từ chối phê duyệt: ${reason}`,
          previousStatus: doc.status,
          newStatus: 'REJECTED' as DocumentStatus,
        };

        const updatedDoc: DocumentItem = {
          ...doc,
          status: 'REJECTED',
          steps: updatedSteps,
          updatedAt: now,
          auditLogs: [...doc.auditLogs, newLog],
        };

        if (selectedDocument?.id === doc.id) {
          setSelectedDocument(updatedDoc);
        }

        setNotifications(prev => [{
          id: `notif-${Date.now()}`,
          title: 'Hồ sơ bị từ chối phê duyệt',
          message: `Hồ sơ "${doc.code}" bị từ chối bởi ${activeUser.name}. Lý do: ${reason}`,
          documentId: doc.id,
          documentCode: doc.code,
          type: 'REJECTED',
          read: false,
          createdAt: now,
          actorId: activeUser.id,
          recipientId: doc.creatorId,
        }, ...prev]);

        return updatedDoc;
      });
    });
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

    setDocuments(prevDocs => {
      return prevDocs.map(doc => {
        if (doc.id !== documentId) return doc;

        const newLog = {
          id: `log-${Date.now()}`,
          documentId: doc.id,
          action: 'REQUEST_INFO' as const,
          actorId: activeUser.id,
          actorName: activeUser.name,
          actorTitle: activeUser.roleTitle,
          timestamp: now,
          comment: `Yêu cầu bổ sung tài liệu/thông tin: ${note}`,
          previousStatus: doc.status,
          newStatus: 'ADDITIONAL_REQ' as DocumentStatus,
        };

        const updatedDoc: DocumentItem = {
          ...doc,
          status: 'ADDITIONAL_REQ',
          updatedAt: now,
          auditLogs: [...doc.auditLogs, newLog],
        };

        if (selectedDocument?.id === doc.id) {
          setSelectedDocument(updatedDoc);
        }

        // BẮT BUỘC: Hồ sơ trả về sẽ trả về đúng tài khoản của người lập (recipientId: doc.creatorId)
        setNotifications(prev => [{
          id: `notif-${Date.now()}`,
          title: 'Yêu cầu bổ sung hồ sơ',
          message: `${activeUser.name} yêu cầu bổ sung hồ sơ "${doc.code}": ${note}`,
          documentId: doc.id,
          documentCode: doc.code,
          type: 'ACTION_REQUIRED',
          read: false,
          createdAt: now,
          actorId: activeUser.id,
          recipientId: doc.creatorId,
        }, ...prev]);

        return updatedDoc;
      });
    });
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

    let isSuccess = false;

    setDocuments(prevDocs => {
      return prevDocs.map(doc => {
        if (doc.id !== documentId) return doc;

        const isContinuing = data.resubmitMode === 'CONTINUE_FROM_CURRENT';
        const targetStepIndex = isContinuing ? doc.currentStepIndex : 0;
        const targetStatus: DocumentStatus = isContinuing 
          ? (doc.currentStepIndex === 0 ? 'PENDING' : 'IN_PROGRESS')
          : 'PENDING';

        // Cập nhật các bước duyệt
        const updatedSteps = doc.steps.map((step, idx) => {
          if (isContinuing) {
            // Tiếp tục quy trình: Giữ nguyên kết quả và chữ ký các bước trước đã APPROVED
            // Bước hiện tại được chuyển sang trạng thái CURRENT để kiểm tra và duyệt tiếp
            if (idx === doc.currentStepIndex) {
              return {
                ...step,
                status: 'CURRENT' as StepStatus,
              };
            }
            return step;
          } else {
            // Trình duyệt lại từ đầu: reset tất cả các bước về PENDING, bước 0 thành CURRENT
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
          documentId: doc.id,
          action: 'RESUBMIT',
          actorId: activeUser.id,
          actorName: activeUser.name,
          actorTitle: activeUser.roleTitle,
          timestamp: now,
          comment: `[Bổ sung hồ sơ - ${modeDescription}]: ${data.supplementNote}`,
          previousStatus: doc.status,
          newStatus: targetStatus,
        };

        const updatedDoc: DocumentItem = {
          ...doc,
          title: data.title !== undefined ? data.title : doc.title,
          amount: data.amount !== undefined ? data.amount : doc.amount,
          description: data.description !== undefined ? data.description : doc.description,
          contentHtml: data.contentHtml !== undefined ? data.contentHtml : doc.contentHtml,
          attachments: data.attachments || doc.attachments,
          status: targetStatus,
          currentStepIndex: targetStepIndex,
          steps: updatedSteps,
          updatedAt: now,
          auditLogs: [...doc.auditLogs, newLog],
        };

        if (selectedDocument?.id === doc.id) {
          setSelectedDocument(updatedDoc);
        }

        setNotifications(prev => [{
          id: `notif-${Date.now()}`,
          title: isContinuing ? 'Hồ sơ đã được bổ sung & gửi lại' : 'Hồ sơ trình duyệt lại từ đầu',
          message: `${activeUser.name} đã bổ sung hồ sơ "${doc.code}" (${modeDescription}): ${data.supplementNote}`,
          documentId: doc.id,
          documentCode: doc.code,
          type: 'ACTION_REQUIRED',
          read: false,
          createdAt: now,
          actorId: activeUser.id,
          recipientId: targetApprover?.approverId,
          recipientRole: targetApprover?.approverRole,
          targetStepIndex: targetStepIndex,
          targetDepartment: targetApprover?.department,
        }, ...prev]);

        isSuccess = true;
        return updatedDoc;
      });
    });

    return { 
      success: isSuccess, 
      message: isSuccess ? 'Đã bổ sung và gửi lại hồ sơ thành công!' : 'Không tìm thấy hồ sơ.' 
    };
  };

  const deleteDocument = (documentId: string) => {
    setDocuments(prev => prev.filter(d => d.id !== documentId));
    if (selectedDocument?.id === documentId) {
      setSelectedDocument(null);
    }
  };

  const resetToSampleData = () => {
    localStorage.removeItem('trunghai_documents_v1');
    localStorage.removeItem('trunghai_notifications_v1');
    localStorage.removeItem('trunghai_users_db_v1');
    localStorage.removeItem('trunghai_active_user_v1');
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

  const markAllNotificationsAsRead = () => {
    const userNotifIds = new Set(userNotifications.map(n => n.id));
    setNotifications(prev => prev.map(n => userNotifIds.has(n.id) ? { ...n, read: true } : n));
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
