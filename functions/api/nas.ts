import { 
  S3Client, 
  ListBucketsCommand, 
  PutObjectCommand, 
  GetObjectCommand, 
  ListObjectsV2Command,
  HeadObjectCommand 
} from '@aws-sdk/client-s3';

const DEFAULT_MINIO_ENDPOINT = 'http://113.161.53.133:9000';
const DEFAULT_MINIO_BUCKET = 'crm.trunghaico.vn';
const DEFAULT_MINIO_ACCESS_KEY = 'sysadmin';
const DEFAULT_MINIO_SECRET_KEY = 'THG@2026';

function createS3Client(env: any) {
  const endpoint = env?.VITE_MINIO_ENDPOINT || env?.MINIO_ENDPOINT || DEFAULT_MINIO_ENDPOINT;
  const accessKeyId = env?.VITE_MINIO_ACCESS_KEY || env?.MINIO_ACCESS_KEY || DEFAULT_MINIO_ACCESS_KEY;
  const secretAccessKey = env?.VITE_MINIO_SECRET_KEY || env?.MINIO_SECRET_KEY || DEFAULT_MINIO_SECRET_KEY;

  return new S3Client({
    endpoint,
    region: 'us-east-1',
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
    forcePathStyle: true,
  });
}

function getBucket(env: any) {
  return env?.VITE_MINIO_BUCKET || env?.MINIO_BUCKET || DEFAULT_MINIO_BUCKET;
}

export async function onRequest(context: any): Promise<Response> {
  const { request, env } = context;
  const url = new URL(request.url);
  const action = url.searchParams.get('action') || 'info';
  const bucket = getBucket(env);
  const s3Client = createS3Client(env);

  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': '*',
    'Content-Type': 'application/json; charset=utf-8',
  };

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    // 1. Test connection
    if (action === 'test') {
      const start = Date.now();
      const res = await s3Client.send(new ListBucketsCommand({}));
      const latencyMs = Date.now() - start;
      const bucketExists = res.Buckets?.some((b: any) => b.Name === bucket);

      return new Response(JSON.stringify({
        success: true,
        latencyMs,
        bucket,
        message: bucketExists
          ? `Kết nối MinIO NAS thành công qua Cloudflare Gateway (${latencyMs}ms). Bucket "${bucket}" sẵn sàng.`
          : `Đã kết nối tới NAS qua Cloudflare Gateway (${latencyMs}ms).`
      }), { headers: corsHeaders });
    }

    // 2. Fetch database snapshot or specific JSON file
    if (action === 'fetch') {
      const targetKey = url.searchParams.get('key') || 'database/cms_database_latest.json';
      try {
        const res = await s3Client.send(new GetObjectCommand({
          Bucket: bucket,
          Key: targetKey,
        }));
        if (!res.Body) {
          return new Response(JSON.stringify(null), { headers: corsHeaders });
        }
        const text = await res.Body.transformToString();
        return new Response(text, { 
          headers: {
            ...corsHeaders,
            'Cache-Control': 'no-cache, no-store, must-revalidate',
          } 
        });
      } catch (e: any) {
        return new Response(JSON.stringify(null), { headers: corsHeaders });
      }
    }

    // 3. Save database snapshot
    if (action === 'save' && request.method === 'POST') {
      const snapshotData = await request.json();
      const now = new Date();
      const timestampStr = now.toISOString().replace(/[:.]/g, '-');
      const backupKey = `database/backups/backup_${timestampStr}.json`;

      const payload = {
        version: '1.0.0',
        savedAt: now.toISOString(),
        savedBy: snapshotData.savedBy || 'Hệ thống tự động',
        documents: snapshotData.documents || [],
        users: snapshotData.users || [],
        departments: snapshotData.departments || [],
        jobTitles: snapshotData.jobTitles || [],
        notifications: snapshotData.notifications || [],
        meta: {
          totalDocuments: (snapshotData.documents || []).length,
          totalUsers: (snapshotData.users || []).length,
          systemName: 'TRUNGHAI CMS DOCUMENT APPROVAL SYSTEM'
        }
      };

      const uint8Array = new TextEncoder().encode(JSON.stringify(payload, null, 2));

      // 1. Save latest snapshot
      await s3Client.send(new PutObjectCommand({
        Bucket: bucket,
        Key: 'database/cms_database_latest.json',
        Body: uint8Array,
        ContentType: 'application/json',
        Metadata: {
          'saved-at': now.toISOString(),
          'total-docs': String(payload.meta.totalDocuments),
          'total-users': String(payload.meta.totalUsers)
        }
      }));

      // 2. Save historical backup
      await s3Client.send(new PutObjectCommand({
        Bucket: bucket,
        Key: backupKey,
        Body: uint8Array,
        ContentType: 'application/json',
      }));

      // 3. Save entity files
      const textEncoder = new TextEncoder();
      const saveEntity = async (key: string, data: any) => {
        const bytes = textEncoder.encode(JSON.stringify(data, null, 2));
        await s3Client.send(new PutObjectCommand({
          Bucket: bucket,
          Key: `database/${key}.json`,
          Body: bytes,
          ContentType: 'application/json',
        }));
      };

      await Promise.all([
        saveEntity('documents', snapshotData.documents || []),
        saveEntity('users', snapshotData.users || []),
        saveEntity('departments', snapshotData.departments || []),
        saveEntity('job_titles', snapshotData.jobTitles || [])
      ]);

      return new Response(JSON.stringify({
        success: true,
        path: backupKey,
        message: `Đã sao lưu lên MinIO NAS qua Cloudflare Gateway thành công vào "${backupKey}".`
      }), { headers: corsHeaders });
    }

    // 4. List backups
    if (action === 'backups') {
      const res = await s3Client.send(new ListObjectsV2Command({
        Bucket: bucket,
        Prefix: 'database/backups/',
      }));

      const items = (res.Contents || [])
        .filter((i: any) => i.Key && i.Key.endsWith('.json'))
        .map((i: any) => ({
          key: i.Key || '',
          fileName: i.Key?.split('/').pop() || '',
          lastModified: i.LastModified ? i.LastModified.toISOString() : new Date().toISOString(),
          size: i.Size || 0
        }))
        .sort((a: any, b: any) => new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime());

      return new Response(JSON.stringify(items), { headers: corsHeaders });
    }

    // 5. Upload file attachment
    if (action === 'upload' && request.method === 'POST') {
      const formData = await request.formData();
      const file = formData.get('file');
      if (!file || !(file instanceof File)) {
        return new Response(JSON.stringify({ error: 'No file provided' }), { status: 400, headers: corsHeaders });
      }

      const fileExt = file.name.split('.').pop() || 'dat';
      const cleanName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const filePath = `documents/${Date.now()}_${Math.random().toString(36).substring(2, 7)}_${cleanName}`;
      const contentType = file.type || (fileExt.toLowerCase() === 'pdf' ? 'application/pdf' : 'application/octet-stream');

      const arrayBuffer = await file.arrayBuffer();
      await s3Client.send(new PutObjectCommand({
        Bucket: bucket,
        Key: filePath,
        Body: new Uint8Array(arrayBuffer),
        ContentType: contentType,
      }));

      const gatewayUrl = `/api/nas?action=file&key=${encodeURIComponent(filePath)}`;
      const endpoint = env?.VITE_MINIO_ENDPOINT || env?.MINIO_ENDPOINT || DEFAULT_MINIO_ENDPOINT;
      const directUrl = `${endpoint.replace(/\/$/, '')}/${bucket}/${filePath}`;

      return new Response(JSON.stringify({
        url: gatewayUrl,
        directUrl: directUrl,
        path: filePath,
        size: file.size,
      }), { headers: corsHeaders });
    }

    // 6. Get latest database metadata info
    if (action === 'info') {
      try {
        const res = await s3Client.send(new HeadObjectCommand({
          Bucket: bucket,
          Key: 'database/cms_database_latest.json'
        }));
        return new Response(JSON.stringify({
          exists: true,
          lastModified: res.LastModified ? res.LastModified.toISOString() : undefined,
          size: res.ContentLength,
          eTag: res.ETag
        }), { headers: corsHeaders });
      } catch (e: any) {
        return new Response(JSON.stringify({ exists: false }), { headers: corsHeaders });
      }
    }

    // 7. Get or stream file attachment (to prevent Mixed Content for images & PDFs)
    if (action === 'file' || action === 'download') {
      const key = url.searchParams.get('key');
      if (!key) {
        return new Response('Missing key parameter', { status: 400, headers: corsHeaders });
      }
      try {
        const res = await s3Client.send(new GetObjectCommand({
          Bucket: bucket,
          Key: key,
        }));
        if (!res.Body) {
          return new Response('File not found', { status: 404, headers: corsHeaders });
        }
        
        const bytes = await res.Body.transformToByteArray();
        const contentType = res.ContentType || 'application/octet-stream';
        
        const headers = new Headers({
          'Content-Type': contentType,
          'Cache-Control': 'public, max-age=86400',
          'Access-Control-Allow-Origin': '*',
        });

        if (action === 'download') {
          const fileName = key.split('/').pop() || 'download';
          headers.set('Content-Disposition', `attachment; filename="${fileName}"`);
        }

        return new Response(bytes, {
          status: 200,
          headers
        });
      } catch (err: any) {
        return new Response(`Error retrieving file: ${err.message || err}`, { status: 404, headers: corsHeaders });
      }
    }

    return new Response(JSON.stringify({ error: 'Unknown action' }), { status: 400, headers: corsHeaders });
  } catch (err: any) {
    return new Response(JSON.stringify({
      success: false,
      error: err.message || String(err)
    }), { status: 500, headers: corsHeaders });
  }
}
