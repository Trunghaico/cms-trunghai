import { createClient } from '@supabase/supabase-js';

const rawUrl = import.meta.env.VITE_SUPABASE_URL;
const rawAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const rawServiceKey = import.meta.env.VITE_SUPABASE_SERVICE_KEY;

export const SUPABASE_URL = (rawUrl && typeof rawUrl === 'string' && rawUrl.startsWith('http')) 
  ? rawUrl.trim() 
  : 'https://fuekwijihziizgwuukld.supabase.co';

export const SUPABASE_ANON_KEY = (rawAnonKey && typeof rawAnonKey === 'string' && rawAnonKey.trim()) 
  ? rawAnonKey.trim() 
  : 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.dummy_anon_key';

export const SUPABASE_SECRET_KEY = (rawServiceKey && typeof rawServiceKey === 'string' && rawServiceKey.trim()) 
  ? rawServiceKey.trim() 
  : SUPABASE_ANON_KEY;

export const STORAGE_BUCKET = 'pdf-cms-trunghai';

export const isSupabaseConfigured = Boolean(
  rawUrl && 
  rawAnonKey && 
  rawUrl.startsWith('http') && 
  !rawUrl.includes('your-project.supabase.co')
);

// Client sử dụng anon/publishable key cho thao tác từ trình duyệt
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  }
});

// Admin client khi cần bypass RLS
export const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SECRET_KEY || SUPABASE_ANON_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  }
});

import { uploadFileToNAS } from './nasStorageService';

/**
 * Tải file trực tiếp lên MinIO trên Synology NAS (hoặc fallback sang Supabase Storage)
 */
export const uploadFileToStorage = async (file: File): Promise<{ url: string; path: string } | null> => {
  // 1. Ưu tiên tải trực tiếp lên MinIO trên Synology NAS
  try {
    const nasResult = await uploadFileToNAS(file);
    if (nasResult) {
      return {
        url: nasResult.url,
        path: nasResult.path,
      };
    }
  } catch (nasErr) {
    console.warn('Tải lên MinIO NAS không thành công, thử fallback sang Supabase Storage:', nasErr);
  }

  // 2. Fallback sang Supabase Storage nếu MinIO không khả dụng
  if (isSupabaseConfigured) {
    try {
      const fileExt = file.name.split('.').pop() || 'pdf';
      const cleanName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const filePath = `documents/${Date.now()}_${Math.random().toString(36).substring(2, 7)}_${cleanName}`;
      const contentType = file.type || (fileExt.toLowerCase() === 'pdf' ? 'application/pdf' : 'application/octet-stream');

      // Thử upload qua client
      const { error } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
          contentType,
        });

      if (error) {
        console.warn('Upload với client anon gặp lỗi, chuyển sang admin client:', error.message);
        const { error: adminError } = await supabaseAdmin.storage
          .from(STORAGE_BUCKET)
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false,
            contentType,
          });

        if (adminError) {
          console.error('Không thể upload lên Supabase Storage:', adminError.message);
          return null;
        }
      }

      const { data: publicUrlData } = supabase.storage
        .from(STORAGE_BUCKET)
        .getPublicUrl(filePath);

      return {
        url: publicUrlData.publicUrl,
        path: filePath,
      };
    } catch (err) {
      console.error('Lỗi ngoại lệ khi upload file lên Supabase Storage:', err);
    }
  }

  return null;
};
