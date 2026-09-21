import { AwsClient } from 'aws4fetch';
import { connect } from 'cloudflare:sockets';

const DEFAULT_MINIO_ENDPOINT = 'http://trunghaico.synology.me:9000';
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

interface SocketResponse {
  status: number;
  statusText: string;
  headers: Headers;
  body: Uint8Array;
  ok: boolean;
  text: () => Promise<string>;
  json: () => Promise<any>;
}

function decodeChunked(input: Uint8Array): Uint8Array {
  const chunks: Uint8Array[] = [];
  let pos = 0;
  while (pos < input.length) {
    let crlf = -1;
    for (let i = pos; i < input.length - 1; i++) {
      if (input[i] === 13 && input[i + 1] === 10) {
        crlf = i;
        break;
      }
    }
    if (crlf === -1) break;
    const sizeStr = new TextDecoder().decode(input.subarray(pos, crlf)).trim();
    const size = parseInt(sizeStr, 16);
    if (isNaN(size) || size === 0) break;
    pos = crlf + 2;
    if (pos + size <= input.length) {
      chunks.push(input.subarray(pos, pos + size));
    }
    pos += size + 2;
  }
  const total = chunks.reduce((acc, c) => acc + c.length, 0);
  const res = new Uint8Array(total);
  let off = 0;
  for (const c of chunks) {
    res.set(c, off);
    off += c.length;
  }
  return res;
}

/**
 * Thực hiện yêu cầu HTTP trực tiếp qua TCP Socket của Cloudflare Workers.
 * Cơ chế này giúp kết nối trực tiếp đến cổng 9000 của NAS mà không bị Cloudflare fetch()
 * tự động loại bỏ cổng hoặc chặn mã lỗi 1003 (Direct IP access).
 */
async function socketHttp(
  reqUrl: string,
  options: {
    method: string;
    headers?: Record<string, string> | Headers;
    body?: Uint8Array | string;
  }
): Promise<SocketResponse> {
  const url = new URL(reqUrl);
  const hostname = url.hostname;
  const port = parseInt(url.port || '9000', 10);
  const path = url.pathname + url.search;

  const socket = connect({ hostname, port });
  const writer = socket.writable.getWriter();

  let headerStr = `${options.method} ${path} HTTP/1.1\r\n`;
  headerStr += `Host: ${hostname}:${port}\r\n`;
  headerStr += `Connection: close\r\n`;

  const headersObj = options.headers instanceof Headers 
    ? Object.fromEntries(options.headers.entries()) 
    : (options.headers || {});

  const reqBodyBytes = options.body 
    ? (typeof options.body === 'string' ? new TextEncoder().encode(options.body) : options.body)
    : null;

  for (const [k, v] of Object.entries(headersObj)) {
    const lk = k.toLowerCase();
    if (lk !== 'host' && lk !== 'connection') {
      headerStr += `${k}: ${v}\r\n`;
    }
  }

  if (reqBodyBytes && !headersObj['content-length'] && !headersObj['Content-Length']) {
    headerStr += `Content-Length: ${reqBodyBytes.length}\r\n`;
  }
  headerStr += '\r\n';

  await writer.write(new TextEncoder().encode(headerStr));
  if (reqBodyBytes && reqBodyBytes.length > 0) {
    const CHUNK_SIZE = 32 * 1024;
    for (let i = 0; i < reqBodyBytes.length; i += CHUNK_SIZE) {
      const chunk = reqBodyBytes.subarray(i, Math.min(i + CHUNK_SIZE, reqBodyBytes.length));
      await writer.write(chunk);
    }
  }
  await writer.close();

  const reader = socket.readable.getReader();
  const chunks: Uint8Array[] = [];
  let totalLen = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) {
      chunks.push(value);
      totalLen += value.length;
    }
  }

  const fullBytes = new Uint8Array(totalLen);
  let offset = 0;
  for (const c of chunks) {
    fullBytes.set(c, offset);
    offset += c.length;
  }

  let headerEnd = -1;
  for (let i = 0; i < fullBytes.length - 3; i++) {
    if (
      fullBytes[i] === 13 &&
      fullBytes[i + 1] === 10 &&
      fullBytes[i + 2] === 13 &&
      fullBytes[i + 3] === 10
    ) {
      headerEnd = i;
      break;
    }
  }

  if (headerEnd === -1) {
    const preview = new TextDecoder().decode(fullBytes.subarray(0, 200));
    throw new Error(`MinIO socket response has no boundary (total bytes: ${totalLen}): ${preview}`);
  }

  const headerText = new TextDecoder().decode(fullBytes.subarray(0, headerEnd));
  let resBodyBytes = fullBytes.subarray(headerEnd + 4);

  const lines = headerText.split('\r\n');
  const statusLine = lines[0] || '';
  const statusParts = statusLine.split(' ');
  const status = parseInt(statusParts[1] || '200', 10);
  const statusText = statusParts.slice(2).join(' ') || 'OK';

  const headers = new Headers();
  for (let i = 1; i < lines.length; i++) {
    const colIdx = lines[i].indexOf(':');
    if (colIdx > 0) {
      const k = lines[i].substring(0, colIdx).trim();
      const v = lines[i].substring(colIdx + 1).trim();
      headers.append(k, v);
    }
  }

  if (headers.get('transfer-encoding')?.includes('chunked')) {
    resBodyBytes = decodeChunked(resBodyBytes);
  }

  return {
    status,
    statusText,
    headers,
    body: resBodyBytes,
    ok: status >= 200 && status < 300,
    text: async () => new TextDecoder().decode(resBodyBytes),
    json: async () => JSON.parse(new TextDecoder().decode(resBodyBytes)),
  };
}

/**
 * Ký request AWS Signature v4 và gửi qua socketHttp
 */
async function signedSocketFetch(
  aws: AwsClient,
  urlStr: string,
  init?: {
    method?: string;
    headers?: Record<string, string>;
    body?: Uint8Array | string;
  }
): Promise<SocketResponse> {
  const method = init?.method || 'GET';
  const signed = await aws.sign(urlStr, {
    method,
    headers: init?.headers,
    body: init?.body,
  });

  return await socketHttp(signed.url, {
    method,
    headers: signed.headers,
    body: init?.body,
  });
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
      const res = await signedSocketFetch(aws, `${endpoint}/${bucket}?location`);
      const latencyMs = Date.now() - start;

      if (!res.ok && res.status !== 200) {
        const errText = await res.text();
        throw new Error(`MinIO NAS returned status ${res.status}: ${errText.substring(0, 200)}`);
      }

      return new Response(JSON.stringify({
        success: true,
        latencyMs,
        bucket,
        endpoint,
        message: `Kết nối MinIO NAS thành công qua Cloudflare Socket Gateway (${latencyMs}ms). Bucket "${bucket}" sẵn sàng.`
      }), { headers: corsHeaders });
    }

    // 2. Fetch database snapshot or specific JSON file
    if (action === 'fetch') {
      const targetKey = url.searchParams.get('key') || 'database/cms_database_latest.json';
      try {
        const res = await signedSocketFetch(aws, `${endpoint}/${bucket}/${targetKey}`);
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

      // 1. Lưu bản mới nhất
      const putLatest = await signedSocketFetch(aws, `${endpoint}/${bucket}/database/cms_database_latest.json`, {
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

      // 2. Lưu bản sao lưu theo thời gian
      const putBackup = await signedSocketFetch(aws, `${endpoint}/${bucket}/${backupKey}`, {
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

      // 3. Lưu riêng các thực thể
      const saveEntity = (key: string, data: any) => {
        return signedSocketFetch(aws, `${endpoint}/${bucket}/database/${key}.json`, {
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
      const res = await signedSocketFetch(aws, `${endpoint}/${bucket}?list-type=2&prefix=database/backups/`);
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
      const paramName = url.searchParams.get('name');
      let fileName = paramName || `file_${Date.now()}.dat`;
      let contentType = url.searchParams.get('type') || request.headers.get('content-type') || 'application/octet-stream';
      let uint8: Uint8Array;

      // Handle raw binary upload (avoids Cloudflare formData binary corruption)
      if (paramName || !request.headers.get('content-type')?.includes('multipart/form-data')) {
        const arrayBuffer = await request.arrayBuffer();
        uint8 = new Uint8Array(arrayBuffer);
      } else {
        const formData = await request.formData();
        const file = formData.get('file');
        if (!file) {
          return new Response(JSON.stringify({ error: 'No file provided' }), { status: 400, headers: corsHeaders });
        }
        if (file instanceof File) {
          fileName = file.name;
          contentType = file.type || contentType;
          uint8 = new Uint8Array(await file.arrayBuffer());
        } else {
          uint8 = new TextEncoder().encode(String(file));
        }
      }

      const fileExt = fileName.split('.').pop() || 'dat';
      const cleanName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
      const filePath = `documents/${Date.now()}_${Math.random().toString(36).substring(2, 7)}_${cleanName}`;
      const finalContentType = contentType.includes('multipart') 
        ? (fileExt.toLowerCase() === 'pdf' ? 'application/pdf' : 'application/octet-stream') 
        : contentType;

      const uploadRes = await signedSocketFetch(aws, `${endpoint}/${bucket}/${filePath}`, {
        method: 'PUT',
        headers: {
          'Content-Type': finalContentType,
        },
        body: uint8,
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
        size: uint8.byteLength,
      }), { headers: corsHeaders });
    }

    // 6. Get latest database metadata info
    if (action === 'info') {
      try {
        const res = await signedSocketFetch(aws, `${endpoint}/${bucket}/database/cms_database_latest.json`, {
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

    // 7. Get or stream file attachment
    if (action === 'file' || action === 'download') {
      const key = url.searchParams.get('key');
      if (!key) {
        return new Response('Missing key parameter', { status: 400, headers: corsHeaders });
      }
      try {
        const res = await signedSocketFetch(aws, `${endpoint}/${bucket}/${key}`);
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
      endpoint,
      error: err.message || String(err)
    }), { status: 500, headers: corsHeaders });
  }
}
