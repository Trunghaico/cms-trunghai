import { DocumentItem, NotificationItem, User } from '../types';
import { INITIAL_DOCUMENTS, INITIAL_NOTIFICATIONS, USERS } from './initialData';
import { ROLE_PRESET_PERMISSIONS } from './permissions';

const STORAGE_KEY_DOCS = 'trunghai_documents_v1';
const STORAGE_KEY_NOTIFS = 'trunghai_notifications_v1';
const STORAGE_KEY_USER = 'trunghai_active_user_v1';
const STORAGE_KEY_USERS_DB = 'trunghai_users_db_v1';

export const loadUsers = (): User[] => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_USERS_DB);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Ensure all users have permissions array
        return parsed.map((u: User) => ({
          ...u,
          permissions: Array.isArray(u.permissions) && u.permissions.length > 0
            ? u.permissions 
            : (ROLE_PRESET_PERMISSIONS[u.role] || ROLE_PRESET_PERMISSIONS.STAFF)
        }));
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
