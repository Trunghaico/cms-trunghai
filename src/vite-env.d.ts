/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
  readonly VITE_SUPABASE_SERVICE_KEY?: string;
  readonly VITE_MINIO_ENDPOINT?: string;
  readonly VITE_MINIO_BUCKET?: string;
  readonly VITE_MINIO_ACCESS_KEY?: string;
  readonly VITE_MINIO_SECRET_KEY?: string;
  readonly VITE_STORAGE_PROVIDER?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
