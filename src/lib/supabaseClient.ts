import { createClient } from '@supabase/supabase-js';

export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://fuekwijihziizgwuukld.supabase.co';
export const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_default_key';
export const SUPABASE_SECRET_KEY = import.meta.env.VITE_SUPABASE_SERVICE_KEY || '';

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
