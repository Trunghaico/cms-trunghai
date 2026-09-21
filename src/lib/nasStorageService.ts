import { 
  S3Client, 
  ListBucketsCommand, 
  PutObjectCommand, 
  GetObjectCommand, 
  ListObjectsV2Command,
  HeadObjectCommand
} from '@aws-sdk/client-s3';
import { DocumentItem, User, DepartmentItem, JobTitleItem, NotificationItem } from '../types';

export const MINIO_ENDPOINT = import.meta.env.VITE_MINIO_ENDPOINT || 'http://113.161.53.133:9000';
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

// Khởi tạo S3 Client tương thích MinIO trên Synology NAS
export const s3Client = new S3Client({
  endpoint: MINIO_ENDPOINT,
  region: 'us-east-1',
  credentials: {
    accessKeyId: MINIO_ACCESS_KEY,
    secretAccessKey: MINIO_SECRET_KEY,
  },
  forcePathStyle: true, // Bắt buộc đối với MinIO
});

/**
 * Kiểm tra kết nối tới MinIO Server trên Synology NAS
 */
export const testNASConnection = async (): Promise<{
  success: boolean;
  latencyMs: number;
  bucket: string;
  message: string;
}> => {
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
  try {
    const fileName = customFileName || (file instanceof File ? file.name : `file_${Date.now()}.bin`);
    const fileExt = fileName.split('.').pop() || 'dat';
    const cleanName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
    const filePath = `documents/${Date.now()}_${Math.random().toString(36).substring(2, 7)}_${cleanName}`;
    const contentType = file.type || (fileExt.toLowerCase() === 'pdf' ? 'application/pdf' : 'application/octet-stream');

    // Chuyển đổi File/Blob sang Uint8Array cho AWS S3 Client
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
  try {
    const targetKey = backupKey || 'database/cms_database_latest.json';
    const res = await s3Client.send(new GetObjectCommand({
      Bucket: MINIO_BUCKET,
      Key: targetKey,
    }));

    if (!res.Body) return null;

    // Đọc Body từ stream sang string
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

