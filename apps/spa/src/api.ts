export function apiBase(): string {
  return import.meta.env.VITE_API_BASE_URL || 'http://localhost:8787';
}

export function authHeader(): HeadersInit {
  const t = localStorage.getItem('accessToken') || '';
  return t ? { authorization: `Bearer ${t}` } : {};
}

export async function api(path: string, opts: RequestInit & { json?: any } = {}) {
  const base = apiBase();
  const headers: Record<string, string> = { ...(opts.headers as any) };
  Object.assign(headers, authHeader());
  if (opts.json !== undefined) {
    headers['content-type'] = 'application/json; charset=utf-8';
  }
  const res = await fetch(base + path, {
    ...opts,
    headers,
    body: opts.json !== undefined ? JSON.stringify(opts.json) : opts.body,
  });
  const text = await res.text();
  let data: any = null; try { data = text ? JSON.parse(text) : null; } catch {}
  if (!res.ok) {
    if (res.status === 401) {
      try {
        localStorage.removeItem('accessToken');
        window.dispatchEvent(new CustomEvent('auth:session-expired'));
      } catch {}
    }
    const message = data?.message || `${res.status} Error`;
    const code = data?.code as (string | undefined);
    const details = data?.details as (unknown | undefined);
    throw new ApiError(res.status, message, code, details);
  }
  return data;
}

export class ApiError extends Error {
  status: number;
  code?: string;
  details?: unknown;
  constructor(status: number, message: string, code?: string, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export function isApiError(e: unknown): e is ApiError {
  return !!e && typeof e === 'object' && (e as any).name === 'ApiError';
}

export async function presign(filename: string, contentType: string, size?: number) {
  return api('/documents/presign', { method: 'POST', json: { filename, contentType, size } });
}

export async function createDocument(key: string, file: File, tags?: string[]) {
  return api('/documents', { method: 'POST', json: { key, filename: file.name, filetype: file.type || null, filesize: file.size || null, tags } });
}

export async function listDocuments() {
  return api('/documents');
}

export async function summarize(id: string) {
  return api(`/documents/${id}/summarize`, { method: 'POST' });
}

export async function chatHr(question: string) {
  return api('/chatHr', { method: 'POST', json: { question } });
}

export async function login(email: string, password: string) {
  return api('/auth/login', { method: 'POST', json: { email, password } });
}

export async function me() {
  return api('/me');
}

export async function s3PresignedUpload(url: string, fields: Record<string, string>, file: File) {
  const fd = new FormData();
  Object.entries(fields).forEach(([k, v]) => fd.append(k, v));
  fd.append('file', file);
  const res = await fetch(url, { method: 'POST', body: fd });
  if (!res.ok) throw new Error(`S3 업로드 실패: ${res.status}`);
}
