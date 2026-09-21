import { AwsClient } from 'aws4fetch';

const DEFAULT_MINIO_ENDPOINT = 'http://113.161.53.133:9000';
const DEFAULT_MINIO_BUCKET = 'crm.trunghaico.vn';
const DEFAULT_MINIO_ACCESS_KEY = 'sysadmin';
const DEFAULT_MINIO_SECRET_KEY = 'THG@2026';

function getAwsClient(env: any): AwsClient {
  const accessKeyId = env?.VITE_MINIO_ACCESS_KEY || env?.MINIO_ACCESS_KEY || DEFAULT_MINIO_ACCESS_KEY;
  const secretAccessKey = env?.VITE_MINIO_SECRET_KEY || env?.MINIO_SECRET_KEY || DEFAULT_MINIO_SECRET_KEY;

  return new AwsClient({
    accessKeyId,
    secretAccessKey,
    service: 's3',
    region: 'us-east-1',
  });
}

function getEndpoint(env: any): string {
  const endpoint = env?.VITE_MINIO_ENDPOINT || env?.MINIO_ENDPOINT || DEFAULT_MINIO_ENDPOINT;
  return endpoint.replace(/\/$/, '');
}

function getBucket(env: any): string {
  return env?.VITE_MINIO_BUCKET || env?.MINIO_BUCKET || DEFAULT_MINIO_BUCKET;
}

export async function onRequest(context: any): Promise<Response> {
  const { request, env } = context;
  const url = new URL(request.url);
  const action = url.searchParams.get('action') || 'info';
  const bucket = getBucket(env);
  const endpoint = getEndpoint(env);
  const aws = getAwsClient(env);

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
      const res = await aws.fetch(`${endpoint}/${bucket}`);
      const latencyMs = Date.now() - start;

      if (!res.ok && res.status !== 200) {
        const errText = await res.text();
        throw new Error(`MinIO NAS returned status ${res.status}: ${errText.substring(0, 200)}`);
      }

      return new Response(JSON.stringify({
        success: true,
        latencyMs,
        bucket,
        message: `Kết nối MinIO NAS thành công qua Cloudflare Gateway (${latencyMs}ms). Bucket "${bucket}" sẵn sàng.`
      }), { headers: corsHeaders });
    }

    // 2. Fetch database snapshot or specific JSON file
    if (action === 'fetch') {
      const targetKey = url.searchParams.get('key') || 'database/cms_database_latest.json';
      try {
        const res = await aws.fetch(`${endpoint}/${bucket}/${targetKey}`);
        if (!res.ok) {
          return new Response(JSON.stringify(null), { headers: corsHeaders });
        }
        const text = await res.text();
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

      const jsonString = JSON.stringify(payload, null, 2);

      // 1. Save latest snapshot
      const putLatest = await aws.fetch(`${endpoint}/${bucket}/database/cms_database_latest.json`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: jsonString,
      });

      if (!putLatest.ok) {
        const errText = await putLatest.text();
        throw new Error(`Lưu database/cms_database_latest.json thất bại (HTTP ${putLatest.status}): ${errText.substring(0, 200)}`);
      }

      // 2. Save historical backup
      const putBackup = await aws.fetch(`${endpoint}/${bucket}/${backupKey}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: jsonString,
      });

      if (!putBackup.ok) {
        const errText = await putBackup.text();
        throw new Error(`Lưu ${backupKey} thất bại (HTTP ${putBackup.status}): ${errText.substring(0, 200)}`);
      }

      // 3. Save entity files
      const saveEntity = (key: string, data: any) => {
        return aws.fetch(`${endpoint}/${bucket}/database/${key}.json`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(data, null, 2),
        });
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
      const res = await aws.fetch(`${endpoint}/${bucket}?list-type=2&prefix=database/backups/`);
      if (!res.ok) {
        return new Response(JSON.stringify([]), { headers: corsHeaders });
      }

      const xml = await res.text();
      const items: any[] = [];
      const contentRegex = /<Contents>([\s\S]*?)<\/Contents>/g;
      let match;
      while ((match = contentRegex.exec(xml)) !== null) {
        const block = match[1];
        const keyMatch = /<Key>(.*?)<\/Key>/.exec(block);
        const lastModMatch = /<LastModified>(.*?)<\/LastModified>/.exec(block);
        const sizeMatch = /<Size>(\d+)<\/Size>/.exec(block);

        const key = keyMatch ? keyMatch[1] : '';
        if (key && key.endsWith('.json')) {
          items.push({
            key,
            fileName: key.split('/').pop() || '',
            lastModified: lastModMatch ? lastModMatch[1] : new Date().toISOString(),
            size: sizeMatch ? parseInt(sizeMatch[1], 10) : 0,
          });
        }
      }

      items.sort((a, b) => new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime());
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
      const uploadRes = await aws.fetch(`${endpoint}/${bucket}/${filePath}`, {
        method: 'PUT',
        headers: {
          'Content-Type': contentType,
        },
        body: arrayBuffer,
      });

      if (!uploadRes.ok) {
        const errText = await uploadRes.text();
        throw new Error(`Upload file lên NAS thất bại (HTTP ${uploadRes.status}): ${errText.substring(0, 200)}`);
      }

      const gatewayUrl = `/api/nas?action=file&key=${encodeURIComponent(filePath)}`;
      const directUrl = `${endpoint}/${bucket}/${filePath}`;

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
        const res = await aws.fetch(`${endpoint}/${bucket}/database/cms_database_latest.json`, {
          method: 'HEAD'
        });

        if (res.ok) {
          const lastModified = res.headers.get('last-modified') || undefined;
          const contentLength = res.headers.get('content-length');
          const eTag = res.headers.get('etag') || undefined;

          return new Response(JSON.stringify({
            exists: true,
            lastModified,
            size: contentLength ? parseInt(contentLength, 10) : undefined,
            eTag
          }), { headers: corsHeaders });
        }

        return new Response(JSON.stringify({ exists: false }), { headers: corsHeaders });
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
        const res = await aws.fetch(`${endpoint}/${bucket}/${key}`);
        if (!res.ok) {
          return new Response('File not found', { status: 404, headers: corsHeaders });
        }
        
        const contentType = res.headers.get('content-type') || 'application/octet-stream';
        const headers = new Headers({
          'Content-Type': contentType,
          'Cache-Control': 'public, max-age=86400',
          'Access-Control-Allow-Origin': '*',
        });

        if (action === 'download') {
          const fileName = key.split('/').pop() || 'download';
          headers.set('Content-Disposition', `attachment; filename="${fileName}"`);
        }

        return new Response(res.body, {
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
