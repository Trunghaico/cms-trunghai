import { createClient } from '@supabase/supabase-js';

export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
export const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
export const SUPABASE_SECRET_KEY = import.meta.env.VITE_SUPABASE_SERVICE_KEY || '';
export const STORAGE_BUCKET = 'pdf-cms-trunghai';

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

/**
 * Tải file trực tiếp lên bucket 'pdf-cms-trunghai' trên Supabase Storage
 */
export const uploadFileToStorage = async (file: File): Promise<{ url: string; path: string } | null> => {
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
      // Fallback dùng supabaseAdmin để bypass RLS nếu chưa cấu hình policy
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

    // Lấy Public URL của file vừa upload
    const { data: publicUrlData } = supabase.storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(filePath);

    return {
      url: publicUrlData.publicUrl,
      path: filePath,
    };
  } catch (err) {
    console.error('Lỗi ngoại lệ khi upload file lên Supabase Storage:', err);
    return null;
  }
};
