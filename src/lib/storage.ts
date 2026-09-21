import { DocumentItem, NotificationItem, User, DepartmentItem, JobTitleItem } from '../types';
import { INITIAL_DOCUMENTS, INITIAL_NOTIFICATIONS, USERS, INITIAL_DEPARTMENTS, INITIAL_JOB_TITLES } from './initialData';
import { ROLE_PRESET_PERMISSIONS } from './permissions';

const STORAGE_KEY_DOCS = 'trunghai_documents_v1';
const STORAGE_KEY_NOTIFS = 'trunghai_notifications_v1';
const STORAGE_KEY_USER = 'trunghai_active_user_v1';
const STORAGE_KEY_USERS_DB = 'trunghai_users_db_v1';
const STORAGE_KEY_DEPTS = 'trunghai_departments_v1';
const STORAGE_KEY_JOB_TITLES = 'trunghai_job_titles_v1';

export const loadUsers = (): User[] => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_USERS_DB);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Merge missing default initial users if any
        const existingIds = new Set(parsed.map((u: User) => (u.username || u.id)?.toLowerCase()));
        const missingInitialUsers = USERS.filter(u => !existingIds.has(u.username.toLowerCase()) && !existingIds.has(u.id.toLowerCase()));
        
        const combined = [...parsed, ...missingInitialUsers];
        return combined.map((u: User) => {
          // If user matches an initial user, make sure secondaryPositions is populated if not yet set
          const initialMatch = USERS.find(init => init.username.toLowerCase() === u.username?.toLowerCase() || init.id === u.id);
          const secondaryPositions = Array.isArray(u.secondaryPositions)
            ? u.secondaryPositions
            : (initialMatch?.secondaryPositions || []);

          return {
            ...u,
            permissions: Array.isArray(u.permissions) && u.permissions.length > 0
              ? u.permissions 
              : (ROLE_PRESET_PERMISSIONS[u.role] || ROLE_PRESET_PERMISSIONS.STAFF),
            secondaryPositions
          };
        });
      }
    }
  } catch (e) {
    console.error('Failed to load users database', e);
  }
  // Initialize with default USERS if empty
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
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
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
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
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
