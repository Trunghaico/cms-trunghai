import { DocumentItem, NotificationItem, User, DepartmentItem, JobTitleItem } from '../types';
import { INITIAL_DOCUMENTS, INITIAL_NOTIFICATIONS, USERS, INITIAL_DEPARTMENTS, INITIAL_JOB_TITLES } from './initialData';
import { ROLE_PRESET_PERMISSIONS } from './permissions';

const STORAGE_KEY_DOCS = 'trunghai_documents_v1';
const STORAGE_KEY_NOTIFS = 'trunghai_notifications_v1';
const STORAGE_KEY_USER = 'trunghai_active_user_v1';
const STORAGE_KEY_USERS_DB = 'trunghai_users_db_v1';
const STORAGE_KEY_DEPTS = 'trunghai_departments_v1';
const STORAGE_KEY_JOB_TITLES = 'trunghai_job_titles_v1';
const STORAGE_KEY_DELETED_USERS = 'trunghai_deleted_users_v1';
const STORAGE_KEY_DELETED_DEPTS = 'trunghai_deleted_depts_v1';
const STORAGE_KEY_DELETED_JOBS = 'trunghai_deleted_jobs_v1';

export const loadDeletedUserIds = (): string[] => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_DELETED_USERS);
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
};

export const addDeletedUserId = (idOrUsername: string) => {
  try {
    if (!idOrUsername) return;
    const current = new Set(loadDeletedUserIds().map(s => s.toLowerCase()));
    current.add(idOrUsername.toLowerCase());
    localStorage.setItem(STORAGE_KEY_DELETED_USERS, JSON.stringify(Array.from(current)));
  } catch (e) {
    console.error('Failed to save deleted user id', e);
  }
};

export const removeDeletedUserId = (idOrUsername: string) => {
  try {
    if (!idOrUsername) return;
    const current = new Set(loadDeletedUserIds().map(s => s.toLowerCase()));
    current.delete(idOrUsername.toLowerCase());
    localStorage.setItem(STORAGE_KEY_DELETED_USERS, JSON.stringify(Array.from(current)));
  } catch (e) {
    console.error('Failed to remove deleted user id', e);
  }
};

export const loadDeletedDeptIds = (): string[] => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_DELETED_DEPTS);
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
};

export const addDeletedDeptId = (idOrCode: string) => {
  try {
    if (!idOrCode) return;
    const current = new Set(loadDeletedDeptIds().map(s => s.toLowerCase()));
    current.add(idOrCode.toLowerCase());
    localStorage.setItem(STORAGE_KEY_DELETED_DEPTS, JSON.stringify(Array.from(current)));
  } catch (e) {
    console.error('Failed to save deleted dept id', e);
  }
};

export const removeDeletedDeptId = (idOrCode: string) => {
  try {
    if (!idOrCode) return;
    const current = new Set(loadDeletedDeptIds().map(s => s.toLowerCase()));
    current.delete(idOrCode.toLowerCase());
    localStorage.setItem(STORAGE_KEY_DELETED_DEPTS, JSON.stringify(Array.from(current)));
  } catch (e) {
    console.error('Failed to remove deleted dept id', e);
  }
};

export const loadDeletedJobIds = (): string[] => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_DELETED_JOBS);
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
};

export const addDeletedJobId = (idOrCode: string) => {
  try {
    if (!idOrCode) return;
    const current = new Set(loadDeletedJobIds().map(s => s.toLowerCase()));
    current.add(idOrCode.toLowerCase());
    localStorage.setItem(STORAGE_KEY_DELETED_JOBS, JSON.stringify(Array.from(current)));
  } catch (e) {
    console.error('Failed to save deleted job id', e);
  }
};

export const removeDeletedJobId = (idOrCode: string) => {
  try {
    if (!idOrCode) return;
    const current = new Set(loadDeletedJobIds().map(s => s.toLowerCase()));
    current.delete(idOrCode.toLowerCase());
    localStorage.setItem(STORAGE_KEY_DELETED_JOBS, JSON.stringify(Array.from(current)));
  } catch (e) {
    console.error('Failed to remove deleted job id', e);
  }
};

export const loadUsers = (): User[] => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_USERS_DB);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        const deletedSet = new Set(loadDeletedUserIds().map(s => s.toLowerCase()));
        return parsed
          .filter((u: User) => {
            if (!u) return false;
            const uId = u.id?.toLowerCase();
            const uName = u.username?.toLowerCase();
            return !deletedSet.has(uId) && !deletedSet.has(uName);
          })
          .map((u: User) => ({
            ...u,
            permissions: Array.isArray(u.permissions) && u.permissions.length > 0
              ? u.permissions 
              : (ROLE_PRESET_PERMISSIONS[u.role] || ROLE_PRESET_PERMISSIONS.STAFF),
            secondaryPositions: Array.isArray(u.secondaryPositions) ? u.secondaryPositions : []
          }));
      }
    }
  } catch (e) {
    console.error('Failed to load users database', e);
  }
  // Khởi tạo mặc định nếu chưa từng có cơ sở dữ liệu trên máy
  saveUsers(USERS);
  return USERS;
};

export const saveUsers = (users: User[]) => {
  try {
    localStorage.setItem(STORAGE_KEY_USERS_DB, JSON.stringify(users));
  } catch (e) {
    console.error('Failed to save users database', e);
  }
};

export const loadDepartments = (): DepartmentItem[] => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_DEPTS);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        const deletedSet = new Set(loadDeletedDeptIds().map(s => s.toLowerCase()));
        return parsed.filter((d: DepartmentItem) => {
          if (!d) return false;
          const dId = d.id?.toLowerCase();
          const dCode = d.code?.toLowerCase();
          const dName = d.name?.toLowerCase();
          return !deletedSet.has(dId) && !deletedSet.has(dCode) && !deletedSet.has(dName);
        });
      }
    }
  } catch (e) {
    console.error('Failed to load departments', e);
  }
  saveDepartments(INITIAL_DEPARTMENTS);
  return INITIAL_DEPARTMENTS;
};

export const saveDepartments = (depts: DepartmentItem[]) => {
  try {
    localStorage.setItem(STORAGE_KEY_DEPTS, JSON.stringify(depts));
  } catch (e) {
    console.error('Failed to save departments', e);
  }
};

export const loadJobTitles = (): JobTitleItem[] => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_JOB_TITLES);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        const deletedSet = new Set(loadDeletedJobIds().map(s => s.toLowerCase()));
        return parsed.filter((j: JobTitleItem) => {
          if (!j) return false;
          const jId = j.id?.toLowerCase();
          const jCode = j.code?.toLowerCase();
          const jName = j.name?.toLowerCase();
          return !deletedSet.has(jId) && !deletedSet.has(jCode) && !deletedSet.has(jName);
        });
      }
    }
  } catch (e) {
    console.error('Failed to load job titles', e);
  }
  saveJobTitles(INITIAL_JOB_TITLES);
  return INITIAL_JOB_TITLES;
};

export const saveJobTitles = (titles: JobTitleItem[]) => {
  try {
    localStorage.setItem(STORAGE_KEY_JOB_TITLES, JSON.stringify(titles));
  } catch (e) {
    console.error('Failed to save job titles', e);
  }
};

export const loadDocuments = (): DocumentItem[] => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_DOCS);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {
    console.error('Failed to load documents from localStorage', e);
  }
  return INITIAL_DOCUMENTS;
};

export const saveDocuments = (docs: DocumentItem[]) => {
  try {
    localStorage.setItem(STORAGE_KEY_DOCS, JSON.stringify(docs));
  } catch (e) {
    console.error('Failed to save documents to localStorage', e);
  }
};

export const loadNotifications = (): NotificationItem[] => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_NOTIFS);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {
    console.error('Failed to load notifications', e);
  }
  return INITIAL_NOTIFICATIONS;
};

export const saveNotifications = (notifs: NotificationItem[]) => {
  try {
    localStorage.setItem(STORAGE_KEY_NOTIFS, JSON.stringify(notifs));
  } catch (e) {
    console.error('Failed to save notifications', e);
  }
};

export const loadActiveUser = (): User | null => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_USER);
    if (saved) {
      const user = JSON.parse(saved);
      const allUsers = loadUsers();
      const found = allUsers.find(u => u.id === user.id || u.username === user.username);
      if (found) return found;
    }
  } catch (e) {
    console.error('Failed to load active user', e);
  }
  return null; // Chưa đăng nhập
};

export const saveActiveUser = (user: User | null) => {
  try {
    if (user) {
      localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(user));
    } else {
      localStorage.removeItem(STORAGE_KEY_USER);
    }
  } catch (e) {
    console.error('Failed to save active user', e);
  }
};

export const formatCurrency = (amount?: number): string => {
  if (amount === undefined || amount === null) return '0 đ';
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
};

export const formatDate = (dateStr?: string): string => {
  if (!dateStr) return '---';
  try {
    const d = new Date(dateStr);
    return new Intl.DateTimeFormat('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(d);
  } catch {
    return dateStr;
  }
};

export const formatShortDate = (dateStr?: string): string => {
  if (!dateStr) return '---';
  try {
    const d = new Date(dateStr);
    return new Intl.DateTimeFormat('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(d);
  } catch {
    return dateStr;
  }
};
