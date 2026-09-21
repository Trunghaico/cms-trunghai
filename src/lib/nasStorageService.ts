import { 
  S3Client, 
  ListBucketsCommand, 
  PutObjectCommand, 
  GetObjectCommand, 
  ListObjectsV2Command,
  HeadObjectCommand
} from '@aws-sdk/client-s3';
import { DocumentItem, User, DepartmentItem, JobTitleItem, NotificationItem } from '../types';

export const MINIO_ENDPOINT = import.meta.env.VITE_MINIO_ENDPOINT || 'http://trunghaico.synology.me:9000';
export const MINIO_BUCKET = import.meta.env.VITE_MINIO_BUCKET || 'crm.trunghaico.vn';
export const MINIO_ACCESS_KEY = import.meta.env.VITE_MINIO_ACCESS_KEY || 'sysadmin';
export const MINIO_SECRET_KEY = import.meta.env.VITE_MINIO_SECRET_KEY || 'THG@2026';

export interface DatabaseSnapshot {
  version: string;
  savedAt: string;
  savedBy?: string;
  documents: DocumentItem[];
  users: User[];
  departments: DepartmentItem[];
  jobTitles: JobTitleItem[];
  notifications?: NotificationItem[];
  meta?: {
    totalDocuments: number;
    totalUsers: number;
    systemName: string;
  };
}

export interface NASBackupItem {
  key: string;
  fileName: string;
  lastModified: string;
  size: number;
}

export interface AutoBackupConfig {
  enabled: boolean;
  intervalMinutes: number;
  syncOnStartup: boolean;
  backupOnChange: boolean;
  autoUploadFiles: boolean;
}

export const DEFAULT_AUTO_BACKUP_CONFIG: AutoBackupConfig = {
  enabled: true,
  intervalMinutes: 10,
  syncOnStartup: true,
  backupOnChange: true,
  autoUploadFiles: true,
};

export const loadAutoBackupConfig = (): AutoBackupConfig => {
  try {
    const raw = localStorage.getItem('trunghai_auto_backup_config');
    if (raw) {
      return { ...DEFAULT_AUTO_BACKUP_CONFIG, ...JSON.parse(raw) };
    }
  } catch (e) {
    console.error('Lỗi khi đọc cấu hình auto-backup:', e);
  }
  return DEFAULT_AUTO_BACKUP_CONFIG;
};

export const saveAutoBackupConfig = (config: AutoBackupConfig): void => {
  try {
    localStorage.setItem('trunghai_auto_backup_config', JSON.stringify(config));
  } catch (e) {
    console.error('Lỗi khi lưu cấu hình auto-backup:', e);
  }
};

/**
 * Kiểm tra xem trình duyệt có đang chạy qua HTTPS (như Cloudflare Pages) hay không.
 * Nếu trang web tải qua HTTPS trong khi MinIO NAS dùng HTTP, trình duyệt sẽ chặn yêu cầu trực tiếp vì Mixed Content.
 * Khi đó, hệ thống sẽ tự động chuyển hướng qua Cloudflare Pages Function Gateway (/api/nas).
 */
export const isGatewayMode = (): boolean => {
  if (typeof window === 'undefined') return false;
  // Khi website chạy trên HTTPS mà MinIO là HTTP, bắt buộc phải dùng Gateway để tránh lỗi Mixed Content
  if (window.location.protocol === 'https:' && MINIO_ENDPOINT.startsWith('http://')) {
    return true;
  }
  // Môi trường Cloudflare Pages
  if (window.location.hostname.endsWith('pages.dev')) {
    return true;
  }
  return false;
};

/**
 * Chuyển đổi URL file trực tiếp từ MinIO sang URL an toàn qua Gateway khi chạy trên HTTPS
 */
export const getSecureFileUrl = (url: string | undefined): string => {
  if (!url) return '';
  if (typeof window !== 'undefined' && (window.location.protocol === 'https:' || window.location.hostname.endsWith('pages.dev'))) {
    const minioBase = MINIO_ENDPOINT.replace(/\/$/, '');
    const prefix = `${minioBase}/${MINIO_BUCKET}/`;
    if (url.startsWith(prefix)) {
      const key = url.substring(prefix.length);
      return `/api/nas?action=file&key=${encodeURIComponent(key)}`;
    }
    // Trường hợp IP 113.161.53.133 hardcoded
    if (url.startsWith('http://113.161.53.133:9000/crm.trunghaico.vn/')) {
      const key = url.substring('http://113.161.53.133:9000/crm.trunghaico.vn/'.length);
      return `/api/nas?action=file&key=${encodeURIComponent(key)}`;
    }
  }
  return url;
};

// Khởi tạo S3 Client tương thích MinIO trên Synology NAS (cho môi trường localhost/HTTP)
export const s3Client = new S3Client({
  endpoint: MINIO_ENDPOINT,
  region: 'us-east-1',
  credentials: {
    accessKeyId: MINIO_ACCESS_KEY,
    secretAccessKey: MINIO_SECRET_KEY,
  },
  forcePathStyle: true,
});

async function extractErrorMessage(res: Response): Promise<string> {
  try {
    const data = await res.json();
    if (data?.error) return data.error;
    if (data?.message) return data.message;
  } catch {
    try {
      const text = await res.text();
      if (text) return text;
    } catch {}
  }
  return `HTTP ${res.status}: ${res.statusText || 'Lỗi kết nối máy chủ'}`;
}

/**
 * Kiểm tra kết nối tới MinIO Server trên Synology NAS
 */
export const testNASConnection = async (): Promise<{
  success: boolean;
  latencyMs: number;
  bucket: string;
  message: string;
}> => {
  if (isGatewayMode()) {
    try {
      const res = await fetch('/api/nas?action=test');
      if (!res.ok) {
        const msg = await extractErrorMessage(res);
        throw new Error(msg);
      }
      return await res.json();
    } catch (err: any) {
      return {
        success: false,
        latencyMs: 0,
        bucket: MINIO_BUCKET,
        message: `Lỗi kết nối Gateway Cloudflare tới MinIO NAS: ${err.message || err}`
      };
    }
  }

  const startTime = Date.now();
  try {
    const res = await s3Client.send(new ListBucketsCommand({}));
    const latencyMs = Date.now() - startTime;
    const bucketExists = res.Buckets?.some(b => b.Name === MINIO_BUCKET);

    if (bucketExists) {
      return {
        success: true,
        latencyMs,
        bucket: MINIO_BUCKET,
        message: `Kết nối MinIO NAS thành công (${latencyMs}ms). Bucket "${MINIO_BUCKET}" sẵn sàng.`
      };
    } else {
      return {
        success: true,
        latencyMs,
        bucket: MINIO_BUCKET,
        message: `Đã kết nối tới NAS (${latencyMs}ms). Tìm thấy các buckets: ${res.Buckets?.map(b => b.Name).join(', ')}`
      };
    }
  } catch (err: any) {
    const latencyMs = Date.now() - startTime;
    console.error('Lỗi kiểm tra kết nối MinIO NAS:', err);
    return {
      success: false,
      latencyMs,
      bucket: MINIO_BUCKET,
      message: `Không thể kết nối tới MinIO NAS (${MINIO_ENDPOINT}): ${err.message || err}`
    };
  }
};

/**
 * Tải một file lên MinIO trên Synology NAS
 */
export const uploadFileToNAS = async (
  file: File | Blob, 
  customFileName?: string
): Promise<{ url: string; path: string; size: number } | null> => {
  const fileName = customFileName || (file instanceof File ? file.name : `file_${Date.now()}.bin`);
  const fileType = file.type || 'application/octet-stream';

  if (isGatewayMode()) {
    try {
      const uploadUrl = `/api/nas?action=upload&name=${encodeURIComponent(fileName)}&type=${encodeURIComponent(fileType)}`;
      const res = await fetch(uploadUrl, {
        method: 'POST',
        headers: {
          'Content-Type': fileType,
        },
        body: file,
      });
      if (!res.ok) {
        const msg = await extractErrorMessage(res);
        throw new Error(msg);
      }
      const data = await res.json();
      return {
        url: data.url,
        path: data.path,
        size: data.size,
      };
    } catch (err) {
      console.error('Lỗi khi tải file lên MinIO NAS qua Gateway:', err);
      return null;
    }
  }

  try {
    const fileExt = fileName.split('.').pop() || 'dat';
    const cleanName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
    const filePath = `documents/${Date.now()}_${Math.random().toString(36).substring(2, 7)}_${cleanName}`;
    const contentType = file.type || (fileExt.toLowerCase() === 'pdf' ? 'application/pdf' : 'application/octet-stream');

    const arrayBuffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);

    await s3Client.send(new PutObjectCommand({
      Bucket: MINIO_BUCKET,
      Key: filePath,
      Body: uint8Array,
      ContentType: contentType,
    }));

    const directUrl = `${MINIO_ENDPOINT.replace(/\/$/, '')}/${MINIO_BUCKET}/${filePath}`;

    return {
      url: directUrl,
      path: filePath,
      size: file.size,
    };
  } catch (err) {
    console.error('Lỗi khi tải file lên MinIO NAS:', err);
    return null;
  }
};

/**
 * Lưu toàn bộ cơ sở dữ liệu CMS lên MinIO trên Synology NAS
 */
export const saveDatabaseToNAS = async (
  snapshotData: {
    documents: DocumentItem[];
    users: User[];
    departments: DepartmentItem[];
    jobTitles: JobTitleItem[];
    notifications?: NotificationItem[];
    savedBy?: string;
  }
): Promise<{ success: boolean; path?: string; message?: string }> => {
  if (isGatewayMode()) {
    try {
      const res = await fetch('/api/nas?action=save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(snapshotData),
      });
      if (!res.ok) {
        const msg = await extractErrorMessage(res);
        throw new Error(msg);
      }
      return await res.json();
    } catch (err: any) {
      console.error('Lỗi khi lưu database lên MinIO NAS qua Gateway:', err);
      return {
        success: false,
        message: `Lỗi sao lưu qua Gateway: ${err.message || err}`
      };
    }
  }

  try {
    const now = new Date();
    const timestampStr = now.toISOString().replace(/[:.]/g, '-');
    
    const payload: DatabaseSnapshot = {
      version: '1.0.0',
      savedAt: now.toISOString(),
      savedBy: snapshotData.savedBy || 'Hệ thống tự động',
      documents: snapshotData.documents,
      users: snapshotData.users,
      departments: snapshotData.departments,
      jobTitles: snapshotData.jobTitles,
      notifications: snapshotData.notifications || [],
      meta: {
        totalDocuments: snapshotData.documents.length,
        totalUsers: snapshotData.users.length,
        systemName: 'TRUNGHAI CMS DOCUMENT APPROVAL SYSTEM'
      }
    };

    const jsonString = JSON.stringify(payload, null, 2);
    const textEncoder = new TextEncoder();
    const uint8Array = textEncoder.encode(jsonString);

    // 1. Lưu bản mới nhất: database/cms_database_latest.json
    await s3Client.send(new PutObjectCommand({
      Bucket: MINIO_BUCKET,
      Key: 'database/cms_database_latest.json',
      Body: uint8Array,
      ContentType: 'application/json',
      Metadata: {
        'saved-at': now.toISOString(),
        'total-docs': String(snapshotData.documents.length),
        'total-users': String(snapshotData.users.length)
      }
    }));

    // 2. Lưu bản sao lưu theo thời gian: database/backups/backup_YYYY-MM-DD_HH-mm-ss.json
    const backupKey = `database/backups/backup_${timestampStr}.json`;
    await s3Client.send(new PutObjectCommand({
      Bucket: MINIO_BUCKET,
      Key: backupKey,
      Body: uint8Array,
      ContentType: 'application/json'
    }));

    // 3. Tách lưu riêng các file JSON thực thể cho mục đích truy vấn phân tán
    const saveEntity = async (key: string, data: any) => {
      const bytes = textEncoder.encode(JSON.stringify(data, null, 2));
      await s3Client.send(new PutObjectCommand({
        Bucket: MINIO_BUCKET,
        Key: `database/${key}.json`,
        Body: bytes,
        ContentType: 'application/json'
      }));
    };

    await Promise.all([
      saveEntity('documents', snapshotData.documents),
      saveEntity('users', snapshotData.users),
      saveEntity('departments', snapshotData.departments),
      saveEntity('job_titles', snapshotData.jobTitles)
    ]);

    return {
      success: true,
      path: backupKey,
      message: `Đã sao lưu cơ sở dữ liệu lên NAS thành công vào "${backupKey}".`
    };
  } catch (err: any) {
    console.error('Lỗi khi lưu database lên MinIO NAS:', err);
    return {
      success: false,
      message: `Lỗi sao lưu lên NAS: ${err.message || err}`
    };
  }
};

/**
 * Tải cơ sở dữ liệu mới nhất từ MinIO Synology NAS
 */
export const fetchDatabaseFromNAS = async (backupKey?: string): Promise<DatabaseSnapshot | null> => {
  if (isGatewayMode()) {
    try {
      const url = backupKey 
        ? `/api/nas?action=fetch&key=${encodeURIComponent(backupKey)}` 
        : '/api/nas?action=fetch';
      const res = await fetch(url);
      if (!res.ok) {
        console.warn(`Gateway fetch failed: HTTP ${res.status}`);
        return null;
      }
      const data = await res.json();
      return data;
    } catch (err) {
      console.warn('Lỗi khi tải database từ MinIO NAS qua Gateway:', err);
      return null;
    }
  }

  try {
    const targetKey = backupKey || 'database/cms_database_latest.json';
    const res = await s3Client.send(new GetObjectCommand({
      Bucket: MINIO_BUCKET,
      Key: targetKey,
    }));

    if (!res.Body) return null;

    const text = await res.Body.transformToString();
    const data: DatabaseSnapshot = JSON.parse(text);
    return data;
  } catch (err) {
    console.warn('Chưa có hoặc không thể đọc database từ MinIO NAS:', err);
    return null;
  }
};

/**
 * Lấy danh sách các bản sao lưu database trên MinIO NAS
 */
export const listNASBackups = async (): Promise<NASBackupItem[]> => {
  if (isGatewayMode()) {
    try {
      const res = await fetch('/api/nas?action=backups');
      if (!res.ok) return [];
      return await res.json();
    } catch (err) {
      console.error('Lỗi lấy danh sách sao lưu từ MinIO qua Gateway:', err);
      return [];
    }
  }

  try {
    const res = await s3Client.send(new ListObjectsV2Command({
      Bucket: MINIO_BUCKET,
      Prefix: 'database/backups/',
    }));

    if (!res.Contents || res.Contents.length === 0) {
      return [];
    }

    return res.Contents
      .filter(item => item.Key && item.Key.endsWith('.json'))
      .map(item => ({
        key: item.Key || '',
        fileName: item.Key?.split('/').pop() || '',
        lastModified: item.LastModified ? item.LastModified.toISOString() : new Date().toISOString(),
        size: item.Size || 0
      }))
      .sort((a, b) => new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime());
  } catch (err) {
    console.error('Lỗi lấy danh sách sao lưu từ MinIO NAS:', err);
    return [];
  }
};

/**
 * Kiểm tra thông tin metadata của bản database mới nhất trên NAS
 */
export const getLatestNASDatabaseInfo = async (): Promise<{
  exists: boolean;
  lastModified?: string;
  size?: number;
  eTag?: string;
} | null> => {
  if (isGatewayMode()) {
    try {
      const res = await fetch('/api/nas?action=info');
      if (!res.ok) return null;
      return await res.json();
    } catch (err) {
      return null;
    }
  }

  try {
    const res = await s3Client.send(new HeadObjectCommand({
      Bucket: MINIO_BUCKET,
      Key: 'database/cms_database_latest.json'
    }));
    return {
      exists: true,
      lastModified: res.LastModified ? res.LastModified.toISOString() : undefined,
      size: res.ContentLength,
      eTag: res.ETag
    };
  } catch (err: any) {
    if (err.name === 'NotFound' || err.$metadata?.httpStatusCode === 404) {
      return { exists: false };
    }
    return null;
  }
};
