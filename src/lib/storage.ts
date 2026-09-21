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

/**
 * Chuẩn hóa và loại bỏ hoàn toàn trùng lặp trong danh sách người dùng.
 * Đảm bảo mỗi ID và Username chỉ xuất hiện duy nhất 1 lần, lọc bỏ các tài khoản đã bị xóa.
 */
export const deduplicateUsers = (usersList: User[]): User[] => {
  if (!Array.isArray(usersList)) return [];
  const seenIds = new Set<string>();
  const seenUsernames = new Set<string>();
  const deletedSet = new Set(loadDeletedUserIds().map(s => s.toLowerCase()));
  const result: User[] = [];

  for (const u of usersList) {
    if (!u) continue;
    const uId = (u.id || '').trim().toLowerCase();
    const uName = (u.username || '').trim().toLowerCase();

    // Loại trừ vĩnh viễn nếu nằm trong danh sách đã xóa
    if ((uId && deletedSet.has(uId)) || (uName && deletedSet.has(uName))) {
      continue;
    }

    // Chống nhân bản trùng lặp ID hoặc Username
    if (uId && seenIds.has(uId)) continue;
    if (uName && seenUsernames.has(uName)) continue;

    if (uId) seenIds.add(uId);
    if (uName) seenUsernames.add(uName);

    result.push({
      ...u,
      permissions: Array.isArray(u.permissions) && u.permissions.length > 0
        ? u.permissions 
        : (ROLE_PRESET_PERMISSIONS[u.role] || ROLE_PRESET_PERMISSIONS.STAFF),
      secondaryPositions: Array.isArray(u.secondaryPositions) ? u.secondaryPositions : []
    });
  }

  return result;
};

/**
 * Chuẩn hóa và loại bỏ trùng lặp trong danh sách phòng ban.
 */
export const deduplicateDepartments = (deptList: DepartmentItem[]): DepartmentItem[] => {
  if (!Array.isArray(deptList)) return [];
  const seenIds = new Set<string>();
  const seenCodes = new Set<string>();
  const seenNames = new Set<string>();
  const deletedSet = new Set(loadDeletedDeptIds().map(s => s.toLowerCase()));
  const result: DepartmentItem[] = [];

  for (const d of deptList) {
    if (!d) continue;
    const dId = (d.id || '').trim().toLowerCase();
    const dCode = (d.code || '').trim().toLowerCase();
    const dName = (d.name || '').trim().toLowerCase();

    if ((dId && deletedSet.has(dId)) || (dCode && deletedSet.has(dCode)) || (dName && deletedSet.has(dName))) {
      continue;
    }

    if (dId && seenIds.has(dId)) continue;
    if (dCode && seenCodes.has(dCode)) continue;
    if (dName && seenNames.has(dName)) continue;

    if (dId) seenIds.add(dId);
    if (dCode) seenCodes.add(dCode);
    if (dName) seenNames.add(dName);

    result.push(d);
  }

  return result;
};

/**
 * Chuẩn hóa và loại bỏ trùng lặp trong danh sách chức danh/chức vụ.
 */
export const deduplicateJobTitles = (jobList: JobTitleItem[]): JobTitleItem[] => {
  if (!Array.isArray(jobList)) return [];
  const seenIds = new Set<string>();
  const seenCodes = new Set<string>();
  const seenNames = new Set<string>();
  const deletedSet = new Set(loadDeletedJobIds().map(s => s.toLowerCase()));
  const result: JobTitleItem[] = [];

  for (const j of jobList) {
    if (!j) continue;
    const jId = (j.id || '').trim().toLowerCase();
    const jCode = (j.code || '').trim().toLowerCase();
    const jName = (j.name || '').trim().toLowerCase();

    if ((jId && deletedSet.has(jId)) || (jCode && deletedSet.has(jCode)) || (jName && deletedSet.has(jName))) {
      continue;
    }

    if (jId && seenIds.has(jId)) continue;
    if (jCode && seenCodes.has(jCode)) continue;
    if (jName && seenNames.has(jName)) continue;

    if (jId) seenIds.add(jId);
    if (jCode) seenCodes.add(jCode);
    if (jName) seenNames.add(jName);

    result.push(j);
  }

  return result;
};

export const loadUsers = (): User[] => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_USERS_DB);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        return deduplicateUsers(parsed);
      }
    }
  } catch (e) {
    console.error('Failed to load users database', e);
  }
  // Khởi tạo mặc định nếu chưa từng có cơ sở dữ liệu trên máy
  const initial = deduplicateUsers(USERS);
  saveUsers(initial);
  return initial;
};

export const saveUsers = (users: User[]) => {
  try {
    const cleanUsers = deduplicateUsers(users);
    localStorage.setItem(STORAGE_KEY_USERS_DB, JSON.stringify(cleanUsers));
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
        return deduplicateDepartments(parsed);
      }
    }
  } catch (e) {
    console.error('Failed to load departments', e);
  }
  const initial = deduplicateDepartments(INITIAL_DEPARTMENTS);
  saveDepartments(initial);
  return initial;
};

export const saveDepartments = (depts: DepartmentItem[]) => {
  try {
    const cleanDepts = deduplicateDepartments(depts);
    localStorage.setItem(STORAGE_KEY_DEPTS, JSON.stringify(cleanDepts));
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
        return deduplicateJobTitles(parsed);
      }
    }
  } catch (e) {
    console.error('Failed to load job titles', e);
  }
  const initial = deduplicateJobTitles(INITIAL_JOB_TITLES);
  saveJobTitles(initial);
  return initial;
};

export const saveJobTitles = (titles: JobTitleItem[]) => {
  try {
    const cleanJobs = deduplicateJobTitles(titles);
    localStorage.setItem(STORAGE_KEY_JOB_TITLES, JSON.stringify(cleanJobs));
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
