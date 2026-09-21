import { supabase, supabaseAdmin, isSupabaseConfigured } from './supabaseClient';
import { DepartmentItem, JobTitleItem, User } from '../types';
import { INITIAL_DEPARTMENTS, INITIAL_JOB_TITLES, USERS } from './initialData';

// Helper to use supabaseAdmin or fallback to supabase
const dbClient = supabaseAdmin || supabase;

/**
 * =========================================================================
 * 1. QUẢN LÝ PHÒNG BAN (DEPARTMENTS) TRÊN SUPABASE
 * =========================================================================
 */
export const fetchDepartmentsFromDB = async (): Promise<DepartmentItem[] | null> => {
  if (!isSupabaseConfigured) return null;
  try {
    const { data, error } = await dbClient
      .from('departments')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) {
      console.warn('Lỗi khi tải phòng ban từ Supabase DB (có thể chưa chạy SQL script):', error.message);
      return null;
    }

    if (data && data.length > 0) {
      return data.map(d => ({
        id: d.id,
        name: d.name,
        code: d.code,
        createdAt: d.created_at || new Date().toISOString()
      }));
    }

    // Nếu bảng rỗng, tự động khởi tạo dữ liệu mẫu ban đầu lên DB
    await seedInitialDepartmentsToDB();
    return INITIAL_DEPARTMENTS;
  } catch (err) {
    console.error('Lỗi kết nối Supabase Departments:', err);
    return null;
  }
};

export const seedInitialDepartmentsToDB = async () => {
  try {
    const payload = INITIAL_DEPARTMENTS.map(d => ({
      id: d.id,
      name: d.name,
      code: d.code,
      created_at: d.createdAt || new Date().toISOString()
    }));
    await dbClient.from('departments').upsert(payload, { onConflict: 'code' });
  } catch (e) {
    console.warn('Không thể seed phòng ban lên Supabase:', e);
  }
};

export const saveDepartmentToDB = async (dept: DepartmentItem): Promise<boolean> => {
  try {
    const payload = {
      id: dept.id,
      name: dept.name,
      code: dept.code,
      created_at: dept.createdAt || new Date().toISOString()
    };
    const { error } = await dbClient
      .from('departments')
      .upsert(payload, { onConflict: 'id' });

    if (error) {
      console.warn('Lỗi lưu phòng ban lên Supabase:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Lỗi ngoại lệ khi lưu phòng ban lên Supabase:', err);
    return false;
  }
};

export const deleteDepartmentFromDB = async (id: string): Promise<boolean> => {
  try {
    const { error } = await dbClient
      .from('departments')
      .delete()
      .eq('id', id);

    if (error) {
      console.warn('Lỗi xóa phòng ban trên Supabase:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Lỗi ngoại lệ khi xóa phòng ban trên Supabase:', err);
    return false;
  }
};

/**
 * =========================================================================
 * 2. QUẢN LÝ CHỨC VỤ (JOB TITLES) TRÊN SUPABASE
 * =========================================================================
 */
export const fetchJobTitlesFromDB = async (): Promise<JobTitleItem[] | null> => {
  if (!isSupabaseConfigured) return null;
  try {
    const { data, error } = await dbClient
      .from('job_titles')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) {
      console.warn('Lỗi khi tải chức vụ từ Supabase DB (có thể chưa chạy SQL script):', error.message);
      return null;
    }

    if (data && data.length > 0) {
      return data.map(j => ({
        id: j.id,
        name: j.name,
        code: j.code,
        department: j.department || 'Ban Giám Đốc',
        createdAt: j.created_at || new Date().toISOString()
      }));
    }

    // Nếu bảng rỗng, tự động khởi tạo dữ liệu mẫu ban đầu lên DB
    await seedInitialJobTitlesToDB();
    return INITIAL_JOB_TITLES;
  } catch (err) {
    console.error('Lỗi kết nối Supabase Job Titles:', err);
    return null;
  }
};

export const seedInitialJobTitlesToDB = async () => {
  if (!isSupabaseConfigured) return;
  try {
    const payload = INITIAL_JOB_TITLES.map(j => ({
      id: j.id,
      name: j.name,
      code: j.code,
      department: j.department || 'Ban Giám Đốc',
      created_at: j.createdAt || new Date().toISOString()
    }));
    await dbClient.from('job_titles').upsert(payload, { onConflict: 'code' });
  } catch (e) {
    console.warn('Không thể seed chức vụ lên Supabase:', e);
  }
};

export const saveJobTitleToDB = async (job: JobTitleItem): Promise<boolean> => {
  if (!isSupabaseConfigured) return false;
  try {
    const payload = {
      id: job.id,
      name: job.name,
      code: job.code,
      department: job.department,
      created_at: job.createdAt || new Date().toISOString()
    };
    const { error } = await dbClient
      .from('job_titles')
      .upsert(payload, { onConflict: 'id' });

    if (error) {
      console.warn('Lỗi lưu chức vụ lên Supabase:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Lỗi ngoại lệ khi lưu chức vụ lên Supabase:', err);
    return false;
  }
};

export const deleteJobTitleFromDB = async (id: string): Promise<boolean> => {
  if (!isSupabaseConfigured) return false;
  try {
    const { error } = await dbClient
      .from('job_titles')
      .delete()
      .eq('id', id);

    if (error) {
      console.warn('Lỗi xóa chức vụ trên Supabase:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Lỗi ngoại lệ khi xóa chức vụ trên Supabase:', err);
    return false;
  }
};

/**
 * =========================================================================
 * 3. QUẢN LÝ NGƯỜI DÙNG / TÀI KHOẢN TRÊN SUPABASE
 * =========================================================================
 */
export const fetchUsersFromDB = async (): Promise<User[] | null> => {
  if (!isSupabaseConfigured) return null;
  try {
    const { data, error } = await dbClient
      .from('users')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) {
      console.warn('Lỗi khi tải users từ Supabase DB:', error.message);
      return null;
    }

    if (data && data.length > 0) {
      return data.map(u => ({
        id: u.id,
        name: u.name,
        username: u.username,
        pass: u.pass,
        roleTitle: u.role_title,
        department: u.department,
        role: u.role || 'STAFF',
        email: u.email || `${u.username}@trunghai.com.vn`,
        avatar: u.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
        permissions: []
      }));
    }

    // Nếu bảng rỗng, khởi tạo danh sách USERS ban đầu
    await seedInitialUsersToDB();
    return USERS;
  } catch (err) {
    console.error('Lỗi kết nối Supabase Users:', err);
    return null;
  }
};

export const seedInitialUsersToDB = async () => {
  if (!isSupabaseConfigured) return;
  try {
    const payload = USERS.map(u => ({
      id: u.id,
      name: u.name,
      username: u.username,
      pass: u.pass,
      role_title: u.roleTitle,
      department: u.department,
      role: u.role,
      email: u.email || `${u.username}@trunghai.com.vn`,
      avatar_url: u.avatar
    }));
    await dbClient.from('users').upsert(payload, { onConflict: 'username' });
  } catch (e) {
    console.warn('Không thể seed người dùng lên Supabase:', e);
  }
};

export const saveUserToDB = async (user: User): Promise<boolean> => {
  if (!isSupabaseConfigured) return false;
  try {
    const payload = {
      id: user.id,
      name: user.name,
      username: user.username,
      pass: user.pass,
      role_title: user.roleTitle,
      department: user.department,
      role: user.role,
      email: user.email || `${user.username}@trunghai.com.vn`,
      avatar_url: user.avatar
    };
    const { error } = await dbClient
      .from('users')
      .upsert(payload, { onConflict: 'username' });

    if (error) {
      console.warn('Lỗi lưu user lên Supabase:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Lỗi ngoại lệ khi lưu user lên Supabase:', err);
    return false;
  }
};

export const deleteUserFromDB = async (id: string): Promise<boolean> => {
  if (!isSupabaseConfigured) return false;
  try {
    const { error } = await dbClient
      .from('users')
      .delete()
      .eq('id', id);

    if (error) {
      console.warn('Lỗi xóa user trên Supabase:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Lỗi ngoại lệ khi xóa user trên Supabase:', err);
    return false;
  }
};
