import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { DocumentItem, NotificationItem, User, DocumentStatus, UserRole, PermissionId, DepartmentItem, JobTitleItem } from '../types';
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
  saveJobTitles
} from '../lib/storage';
import {
  fetchDepartmentsFromDB,
  fetchJobTitlesFromDB,
  fetchUsersFromDB,
  saveDepartmentToDB,
  deleteDepartmentFromDB,
  saveJobTitleToDB,
  deleteJobTitleFromDB,
  saveUserToDB,
  deleteUserFromDB
} from '../lib/databaseService';
import { USERS } from '../lib/initialData';
import { 
  hasPermission as checkHasPermission, 
  hasAnyPermission as checkHasAnyPermission,
  hasAllPermissions as checkHasAllPermissions,
  ROLE_PRESET_PERMISSIONS 
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
  createUser: (userData: { name: string; username: string; pass: string; roleTitle: string; department: string; role?: UserRole; permissions?: PermissionId[] }) => { success: boolean; message?: string };
  updateUser: (userId: string, userData: Partial<User>) => { success: boolean; message?: string };
  deleteUser: (userId: string) => { success: boolean; message?: string };
  registerUser?: (userData: { name: string; username: string; pass: string; roleTitle: string; department: string; role?: UserRole; permissions?: PermissionId[] }) => { success: boolean; message?: string };
  
  // Settings: Departments & Job Titles
  departments: DepartmentItem[];
  jobTitles: JobTitleItem[];
  createDepartment: (deptData: { name: string; code: string; description?: string }) => { success: boolean; message?: string };
  updateDepartment: (id: string, deptData: Partial<DepartmentItem>) => { success: boolean; message?: string };
  deleteDepartment: (id: string) => { success: boolean; message?: string };
  createJobTitle: (titleData: { name: string; code: string; department: string; defaultRole?: UserRole; description?: string }) => { success: boolean; message?: string };
  updateJobTitle: (id: string, titleData: Partial<JobTitleItem>) => { success: boolean; message?: string };
  deleteJobTitle: (id: string) => { success: boolean; message?: string };

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
    myPendingApprovalsCount: number;
    myCreatedCount: number;
  };
}

const DocumentContext = createContext<DocumentContextType | undefined>(undefined);

export const DocumentProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [users, setUsers] = useState<User[]>(() => loadUsers());
  const [departments, setDepartments] = useState<DepartmentItem[]>(() => loadDepartments());
  const [jobTitles, setJobTitles] = useState<JobTitleItem[]>(() => loadJobTitles());
  const [activeUser, setActiveUserState] = useState<User | null>(() => loadActiveUser());
  const [documents, setDocuments] = useState<DocumentItem[]>(() => loadDocuments());
  const [notifications, setNotifications] = useState<NotificationItem[]>(() => loadNotifications());
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedDocument, setSelectedDocument] = useState<DocumentItem | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

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

  // Sync documents to storage
  useEffect(() => {
    saveDocuments(documents);
  }, [documents]);

  // Sync notifications to storage
  useEffect(() => {
    saveNotifications(notifications);
  }, [notifications]);

  // Initial Sync from Supabase DB on startup
  useEffect(() => {
    let isMounted = true;
    const syncFromDB = async () => {
      try {
        const [dbDepts, dbJobs, dbUsers] = await Promise.all([
          fetchDepartmentsFromDB(),
          fetchJobTitlesFromDB(),
          fetchUsersFromDB()
        ]);
        if (!isMounted) return;
        if (dbDepts && dbDepts.length > 0) {
          setDepartments(dbDepts);
        }
        if (dbJobs && dbJobs.length > 0) {
          setJobTitles(dbJobs);
        }
        if (dbUsers && dbUsers.length > 0) {
          setUsers(prev => {
            return dbUsers.map(u => {
              const localUser = prev.find(p => p.id === u.id || p.username === u.username);
              return {
                ...u,
                permissions: localUser?.permissions?.length 
                  ? localUser.permissions 
                  : (ROLE_PRESET_PERMISSIONS[u.role] || ROLE_PRESET_PERMISSIONS.STAFF)
              };
            });
          });
        }
      } catch (err) {
        console.warn('Supabase DB sync notification:', err);
      }
    };
    syncFromDB();
    return () => {
      isMounted = false;
    };
  }, []);

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
  }): { success: boolean; message?: string } => {
    const trimmedUsername = userData.username.trim().toLowerCase();
    if (users.some(u => u.username.toLowerCase() === trimmedUsername)) {
      return { success: false, message: 'Tên đăng nhập này đã tồn tại trong hệ thống.' };
    }

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
    };

    setUsers(prev => [...prev, newUser]);
    saveUserToDB(newUser).catch(err => console.warn('Lỗi lưu user lên DB:', err));
    return { success: true };
  };

  const updateUser = (userId: string, userData: Partial<User>): { success: boolean; message?: string } => {
    if (userData.username) {
      const trimmed = userData.username.trim().toLowerCase();
      const existing = users.find(u => u.username.toLowerCase() === trimmed && u.id !== userId);
      if (existing) {
        return { success: false, message: 'Tên đăng nhập này đã được sử dụng bởi người dùng khác.' };
      }
    }

    let updatedTarget: User | null = null;
    setUsers(prev => prev.map(u => {
      if (u.id !== userId) return u;
      const updated = { ...u, ...userData };
      updatedTarget = updated;
      if (activeUser?.id === userId) {
        setActiveUserState(updated);
        saveActiveUser(updated);
      }
      return updated;
    }));

    if (updatedTarget) {
      saveUserToDB(updatedTarget).catch(err => console.warn('Lỗi cập nhật user lên DB:', err));
    }

    return { success: true };
  };

  const deleteUser = (userId: string): { success: boolean; message?: string } => {
    if (activeUser?.id === userId) {
      return { success: false, message: 'Không thể xóa tài khoản đang đăng nhập hiện tại.' };
    }
    setUsers(prev => prev.filter(u => u.id !== userId));
    deleteUserFromDB(userId).catch(err => console.warn('Lỗi xóa user trên DB:', err));
    return { success: true };
  };

  const registerUser = (userData: { 
    name: string; 
    username: string; 
    pass: string; 
    roleTitle: string; 
    department: string; 
    role?: UserRole 
  }): { success: boolean; message?: string } => {
    return createUser({
      ...userData,
      role: userData.role || 'STAFF',
    });
  };

  // Department Management
  const createDepartment = (deptData: { name: string; code: string; description?: string }): { success: boolean; message?: string } => {
    const trimmedName = deptData.name.trim();
    const trimmedCode = deptData.code.trim().toUpperCase();
    if (!trimmedName || !trimmedCode) {
      return { success: false, message: 'Vui lòng nhập đầy đủ tên và mã phòng ban.' };
    }
    if (departments.some(d => d.name.toLowerCase() === trimmedName.toLowerCase() || d.code.toUpperCase() === trimmedCode)) {
      return { success: false, message: 'Phòng ban hoặc mã phòng ban này đã tồn tại.' };
    }
    const newDept: DepartmentItem = {
      id: `dept-${Date.now()}`,
      name: trimmedName,
      code: trimmedCode,
      description: deptData.description?.trim() || '',
      createdAt: new Date().toISOString()
    };
    setDepartments(prev => [...prev, newDept]);
    saveDepartmentToDB(newDept).catch(err => console.warn('Lỗi lưu phòng ban lên DB:', err));
    return { success: true };
  };

  const updateDepartment = (id: string, deptData: Partial<DepartmentItem>): { success: boolean; message?: string } => {
    if (deptData.name) {
      const trimmedName = deptData.name.trim();
      if (departments.some(d => d.id !== id && d.name.toLowerCase() === trimmedName.toLowerCase())) {
        return { success: false, message: 'Tên phòng ban này đã được sử dụng.' };
      }
    }
    if (deptData.code) {
      const trimmedCode = deptData.code.trim().toUpperCase();
      if (departments.some(d => d.id !== id && d.code.toUpperCase() === trimmedCode)) {
        return { success: false, message: 'Mã phòng ban này đã được sử dụng.' };
      }
    }
    let updatedDept: DepartmentItem | null = null;
    setDepartments(prev => prev.map(d => {
      if (d.id !== id) return d;
      const updated = { ...d, ...deptData };
      if (deptData.code) updated.code = deptData.code.trim().toUpperCase();
      if (deptData.name) updated.name = deptData.name.trim();
      updatedDept = updated;
      return updated;
    }));
    if (updatedDept) {
      saveDepartmentToDB(updatedDept).catch(err => console.warn('Lỗi cập nhật phòng ban lên DB:', err));
    }
    return { success: true };
  };

  const deleteDepartment = (id: string): { success: boolean; message?: string } => {
    const target = departments.find(d => d.id === id);
    if (!target) return { success: false, message: 'Không tìm thấy phòng ban.' };
    const hasUsers = users.some(u => u.department.toLowerCase() === target.name.toLowerCase());
    if (hasUsers) {
      return { success: false, message: `Không thể xóa phòng ban "${target.name}" vì đang có ${users.filter(u => u.department.toLowerCase() === target.name.toLowerCase()).length} nhân sự trực thuộc. Vui lòng chuyển phòng ban của nhân sự trước.` };
    }
    setDepartments(prev => prev.filter(d => d.id !== id));
    deleteDepartmentFromDB(id).catch(err => console.warn('Lỗi xóa phòng ban trên DB:', err));
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
    const newJobTitle: JobTitleItem = {
      id: `job-${Date.now()}`,
      name: trimmedName,
      code: trimmedCode,
      department: trimmedDept,
      defaultRole: titleData.defaultRole || 'STAFF',
      description: titleData.description?.trim() || '',
      createdAt: new Date().toISOString()
    };
    setJobTitles(prev => [...prev, newJobTitle]);
    saveJobTitleToDB(newJobTitle).catch(err => console.warn('Lỗi lưu chức vụ lên DB:', err));
    return { success: true };
  };

  const updateJobTitle = (id: string, titleData: Partial<JobTitleItem>): { success: boolean; message?: string } => {
    if (titleData.name) {
      const trimmedName = titleData.name.trim();
      if (jobTitles.some(j => j.id !== id && j.name.toLowerCase() === trimmedName.toLowerCase())) {
        return { success: false, message: 'Tên chức vụ này đã được sử dụng.' };
      }
    }
    if (titleData.code) {
      const trimmedCode = titleData.code.trim().toUpperCase();
      if (jobTitles.some(j => j.id !== id && j.code.toUpperCase() === trimmedCode)) {
        return { success: false, message: 'Mã chức vụ này đã được sử dụng.' };
      }
    }
    let updatedJob: JobTitleItem | null = null;
    setJobTitles(prev => prev.map(j => {
      if (j.id !== id) return j;
      const updated = { ...j, ...titleData };
      if (titleData.code) updated.code = titleData.code.trim().toUpperCase();
      if (titleData.name) updated.name = titleData.name.trim();
      updatedJob = updated;
      return updated;
    }));
    if (updatedJob) {
      saveJobTitleToDB(updatedJob).catch(err => console.warn('Lỗi cập nhật chức vụ lên DB:', err));
    }
    return { success: true };
  };

  const deleteJobTitle = (id: string): { success: boolean; message?: string } => {
    const target = jobTitles.find(j => j.id === id);
    if (!target) return { success: false, message: 'Không tìm thấy chức vụ.' };
    const hasUsers = users.some(u => u.roleTitle.toLowerCase() === target.name.toLowerCase());
    if (hasUsers) {
      return { success: false, message: `Không thể xóa chức vụ "${target.name}" vì đang có ${users.filter(u => u.roleTitle.toLowerCase() === target.name.toLowerCase()).length} nhân sự nắm giữ. Vui lòng thay đổi chức vụ của nhân sự trước.` };
    }
    setJobTitles(prev => prev.filter(j => j.id !== id));
    deleteJobTitleFromDB(id).catch(err => console.warn('Lỗi xóa chức vụ trên DB:', err));
    return { success: true };
  };

  const markNotificationAsRead = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const markAllNotificationsAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const createDocument = (docData: Omit<DocumentItem, 'id' | 'createdAt' | 'updatedAt' | 'auditLogs'>): DocumentItem => {
    const now = new Date().toISOString();
    const newDocId = `doc-${Date.now()}`;
    const creator = activeUser || users[0];
    
    const newDoc: DocumentItem = {
      ...docData,
      id: newDocId,
      createdAt: now,
      updatedAt: now,
      auditLogs: [
        {
          id: `log-${Date.now()}`,
          documentId: newDocId,
          action: 'CREATE',
          actorId: creator.id,
          actorName: creator.name,
          actorTitle: creator.roleTitle,
          timestamp: now,
          comment: 'Khởi tạo và trình ký hồ sơ mới',
          newStatus: docData.status,
        }
      ]
    };

    setDocuments(prev => [newDoc, ...prev]);

    // Thêm thông báo cho người duyệt bước 1
    const firstApprover = docData.steps[0];
    if (firstApprover) {
      const newNotif: NotificationItem = {
        id: `notif-${Date.now()}`,
        title: 'Hồ sơ mới cần duyệt',
        message: `Hồ sơ "${newDoc.code} - ${newDoc.title}" đang chờ bạn duyệt tại bước 1 (${firstApprover.title}).`,
        documentId: newDoc.id,
        documentCode: newDoc.code,
        type: 'ACTION_REQUIRED',
        read: false,
        createdAt: now,
      };
      setNotifications(prev => [newNotif, ...prev]);
    }

    return newDoc;
  };

  const approveStep = (documentId: string, comment: string, signatureImage?: string) => {
    if (!activeUser) return;
    const now = new Date().toISOString();

    setDocuments(prevDocs => {
      return prevDocs.map(doc => {
        if (doc.id !== documentId) return doc;

        const currentStepIdx = doc.currentStepIndex;
        const currentStep = doc.steps[currentStepIdx];
        if (!currentStep) return doc;

        // Cập nhật bước hiện tại
        const updatedSteps = [...doc.steps];
        updatedSteps[currentStepIdx] = {
          ...currentStep,
          status: 'APPROVED',
          comment: comment || 'Đã kiểm tra và phê duyệt',
          decisionDate: now,
          signatureImage: signatureImage || 'signature_stamp',
          approverId: activeUser.id,
          approverName: activeUser.name,
        };

        const isLastStep = currentStepIdx === doc.steps.length - 1;
        let newStatus: DocumentStatus = isLastStep ? 'APPROVED' : 'IN_PROGRESS';
        let newStepIdx = currentStepIdx;

        if (!isLastStep) {
          newStepIdx = currentStepIdx + 1;
          updatedSteps[newStepIdx] = {
            ...updatedSteps[newStepIdx],
            status: 'CURRENT',
          };
        }

        const newLog = {
          id: `log-${Date.now()}`,
          documentId: doc.id,
          action: 'APPROVE' as const,
          actorId: activeUser.id,
          actorName: activeUser.name,
          actorTitle: activeUser.roleTitle,
          timestamp: now,
          comment: comment ? `Phê duyệt: ${comment}` : `Đã duyệt bước ${currentStepIdx + 1}`,
          previousStatus: doc.status,
          newStatus: newStatus,
        };

        const updatedDoc: DocumentItem = {
          ...doc,
          status: newStatus,
          currentStepIndex: newStepIdx,
          steps: updatedSteps,
          updatedAt: now,
          auditLogs: [...doc.auditLogs, newLog],
        };

        if (selectedDocument?.id === doc.id) {
          setSelectedDocument(updatedDoc);
        }

        if (isLastStep) {
          setNotifications(prev => [{
            id: `notif-${Date.now()}`,
            title: 'Hồ sơ đã được phê duyệt hoàn tất',
            message: `Hồ sơ "${doc.code} - ${doc.title}" đã được phê duyệt và đóng dấu điện tử thành công.`,
            documentId: doc.id,
            documentCode: doc.code,
            type: 'APPROVED',
            read: false,
            createdAt: now,
          }, ...prev]);
        } else {
          const nextApprover = updatedSteps[newStepIdx];
          setNotifications(prev => [{
            id: `notif-${Date.now()}`,
            title: 'Hồ sơ chuyển bước tiếp theo',
            message: `Hồ sơ "${doc.code}" đã hoàn thành bước ${currentStepIdx + 1}, chuyển tới ${nextApprover.approverTitle} (${nextApprover.approverName}).`,
            documentId: doc.id,
            documentCode: doc.code,
            type: 'ACTION_REQUIRED',
            read: false,
            createdAt: now,
          }, ...prev]);
        }

        return updatedDoc;
      });
    });
  };

  const rejectDocument = (documentId: string, reason: string) => {
    if (!activeUser) return;
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
        }, ...prev]);

        return updatedDoc;
      });
    });
  };

  const requestAdditionalInfo = (documentId: string, note: string) => {
    if (!activeUser) return;
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

        setNotifications(prev => [{
          id: `notif-${Date.now()}`,
          title: 'Yêu cầu bổ sung hồ sơ',
          message: `${activeUser.name} yêu cầu bổ sung hồ sơ "${doc.code}": ${note}`,
          documentId: doc.id,
          documentCode: doc.code,
          type: 'REJECTED',
          read: false,
          createdAt: now,
        }, ...prev]);

        return updatedDoc;
      });
    });
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

  // Tính toán số liệu thống kê
  const stats = useMemo(() => {
    const total = documents.length;
    const pending = documents.filter(d => d.status === 'PENDING').length;
    const inProgress = documents.filter(d => d.status === 'IN_PROGRESS').length;
    const approved = documents.filter(d => d.status === 'APPROVED').length;
    const rejected = documents.filter(d => d.status === 'REJECTED').length;
    const additionalReq = documents.filter(d => d.status === 'ADDITIONAL_REQ').length;
    const urgentCount = documents.filter(d => (d.priority === 'URGENT' || d.priority === 'VERY_URGENT') && d.status !== 'APPROVED').length;
    
    // Đếm số hồ sơ cần người dùng hiện tại duyệt dựa trên thẩm quyền
    const myPendingApprovalsCount = activeUser ? documents.filter(doc => {
      if (doc.status === 'APPROVED' || doc.status === 'REJECTED') return false;
      const currentStep = doc.steps[doc.currentStepIndex];
      if (!currentStep || currentStep.status !== 'CURRENT') return false;
      const canApprove = checkHasPermission(activeUser, 'approval.approve');
      const canOverride = checkHasPermission(activeUser, 'approval.override');

      const isExactUser = currentStep.approverId ? currentStep.approverId === activeUser.id : false;
      const isDeptApprover = !currentStep.approverId && (
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
        activeUser.role === currentStep.approverRole;

      return (canApprove && (isExactUser || (isDeptApprover && isAuthorizedToSign))) || canOverride;
    }).length : 0;

    const myCreatedCount = activeUser ? documents.filter(d => d.creatorId === activeUser.id).length : 0;

    return {
      total,
      pending,
      inProgress,
      approved,
      rejected,
      additionalReq,
      urgentCount,
      myPendingApprovalsCount,
      myCreatedCount,
    };
  }, [documents, activeUser]);

  const unreadNotificationCount = useMemo(() => {
    return notifications.filter(n => !n.read).length;
  }, [notifications]);

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
        documents,
        notifications,
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
        deleteDocument,
        resetToSampleData,
        stats,
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
