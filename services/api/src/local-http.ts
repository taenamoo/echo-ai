import http from 'node:http';
import { URL } from 'node:url';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { Auth, Documents, Presign, Study } from './index';

type Headers = Record<string, string | undefined>;

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (c) => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)));
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

function toHeaders(req: IncomingMessage): Headers {
  const out: Headers = {};
  const raw = req.headers || {};
  for (const [k, v] of Object.entries(raw)) {
    out[k.toLowerCase()] = Array.isArray(v) ? v.join(',') : (v as string | undefined);
  }
  return out;
}

function send(res: ServerResponse, statusCode: number, body?: string, headers?: Record<string, string>) {
  const allowOrigin = process.env.CORS_ALLOW_ORIGIN || 'http://localhost:5173';
  res.statusCode = statusCode;
  res.setHeader('Access-Control-Allow-Origin', allowOrigin);
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Headers', 'authorization,content-type');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,PATCH,OPTIONS');
  if (headers) for (const [k, v] of Object.entries(headers)) res.setHeader(k, v);
  res.end(body ?? '');
}

function notFound(res: ServerResponse) { send(res, 404, JSON.stringify({ message: 'Not Found' }), { 'content-type': 'application/json; charset=utf-8' }); }

function ok(res: ServerResponse, payload: any, headers?: Record<string, string>) {
  send(res, 200, JSON.stringify(payload ?? {}), { 'content-type': 'application/json; charset=utf-8', ...(headers || {}) });
}

function routeKey(method: string, rawPath: string): string {
  // Define route keys similar to API Gateway
  if (rawPath === '/auth/signup' && method === 'POST') return 'POST /auth/signup';
  if (rawPath === '/auth/login' && method === 'POST') return 'POST /auth/login';
  if (rawPath === '/me' && method === 'GET') return 'GET /me';
  if (rawPath === '/documents' && method === 'POST') return 'POST /documents';
  if (rawPath === '/documents' && method === 'GET') return 'GET /documents';
  if (rawPath === '/documents/presign' && method === 'POST') return 'POST /documents/presign';
  if (rawPath === '/study' && method === 'GET') return 'GET /study';
  if (rawPath === '/study' && method === 'POST') return 'POST /study';
  if (/^\/study\/[^\/]+$/.test(rawPath) && method === 'PUT') return 'PUT /study/{id}';
  if (/^\/study\/[^\/]+$/.test(rawPath) && method === 'DELETE') return 'DELETE /study/{id}';
  if (rawPath === '/study/quiz' && method === 'POST') return 'POST /study/quiz';
  if (rawPath === '/study/search' && method === 'POST') return 'POST /study/search';
  if (rawPath === '/study/analyze' && method === 'POST') return 'POST /study/analyze';
  if (/^\/documents\/[^\/]+$/.test(rawPath) && method === 'GET') return 'GET /documents/{id}';
  if (/^\/documents\/[^\/]+$/.test(rawPath) && method === 'DELETE') return 'DELETE /documents/{id}';
  if (/^\/documents\/[^\/]+\/summarize$/.test(rawPath) && method === 'POST') return 'POST /documents/{id}/summarize';
  return `${method} ${rawPath}`;
}

async function handle(req: IncomingMessage, res: ServerResponse) {
  try {
    const method = (req.method || 'GET').toUpperCase();
    const url = new URL(req.url || '/', `http://localhost`);
    const rawPath = url.pathname;

    if (method === 'OPTIONS') {
      send(res, 204);
      return;
    }

    const headers = toHeaders(req);
    const rawQueryString = url.searchParams.toString();
    const queryStringParameters = Object.fromEntries(url.searchParams.entries());
    const bodyRaw = (method === 'POST' || method === 'PUT' || method === 'PATCH') ? await readBody(req) : null;
    const rk = routeKey(method, rawPath);

    // Build minimal API Gateway v2 event
    const baseEvent: any = {
      version: '2.0',
      routeKey: rk,
      rawPath,
      rawQueryString,
      headers,
      queryStringParameters,
      body: bodyRaw,
      isBase64Encoded: false,
      requestContext: { http: { method } },
    };

    // Route
    if (rk === 'POST /auth/signup') {
      const r = await (Auth.signup as any)(baseEvent);
      send(res, r.statusCode || 200, r.body, r.headers);
      return;
    }
    if (rk === 'POST /auth/login') {
      const r = await (Auth.login as any)(baseEvent);
      send(res, r.statusCode || 200, r.body, r.headers);
      return;
    }
    if (rk === 'GET /me') {
      const r = await (Auth.me as any)(baseEvent);
      send(res, r.statusCode || 200, r.body, r.headers);
      return;
    }
    if (rk === 'POST /documents/presign') {
      const r = await (Presign.createPresign as any)(baseEvent);
      send(res, r.statusCode || 200, r.body, r.headers);
      return;
    }
    if (rk === 'POST /documents') {
      const r = await (Documents.create as any)(baseEvent);
      send(res, r.statusCode || 200, r.body, r.headers);
      return;
    }
    if (rk === 'GET /study') {
      const r = await (Study.list as any)(baseEvent);
      send(res, r.statusCode || 200, r.body, r.headers); return;
    }
    if (rk === 'POST /study') {
      const r = await (Study.create as any)(baseEvent);
      send(res, r.statusCode || 200, r.body, r.headers); return;
    }
    if (rk === 'PUT /study/{id}') {
      const id = rawPath.split('/')[2];
      const r = await (Study.update as any)({ ...baseEvent, pathParameters: { id } });
      send(res, r.statusCode || 200, r.body, r.headers); return;
    }
    if (rk === 'DELETE /study/{id}') {
      const id = rawPath.split('/')[2];
      const r = await (Study.remove as any)({ ...baseEvent, pathParameters: { id } });
      send(res, r.statusCode || 200, r.body, r.headers); return;
    }
    if (rk === 'POST /study/quiz') {
      const r = await (Study.quiz as any)(baseEvent);
      send(res, r.statusCode || 200, r.body, r.headers); return;
    }
    if (rk === 'POST /study/search') {
      const r = await (Study.search as any)(baseEvent);
      send(res, r.statusCode || 200, r.body, r.headers); return;
    }
    if (rk === 'POST /study/analyze') {
      const r = await (Study.analyze as any)(baseEvent);
      send(res, r.statusCode || 200, r.body, r.headers); return;
    }
    if (rk === 'GET /documents') {
      const r = await (Documents.list as any)(baseEvent);
      send(res, r.statusCode || 200, r.body, r.headers);
      return;
    }
    if (rk === 'GET /documents/{id}') {
      const id = rawPath.split('/')[2];
      const r = await (Documents.get as any)({ ...baseEvent, pathParameters: { id } });
      send(res, r.statusCode || 200, r.body, r.headers);
      return;
    }
    if (rk === 'DELETE /documents/{id}') {
      const id = rawPath.split('/')[2];
      const r = await (Documents.remove as any)({ ...baseEvent, pathParameters: { id } });
      send(res, r.statusCode || 200, r.body, r.headers);
      return;
    }
    if (rk === 'POST /documents/{id}/summarize') {
      const id = rawPath.split('/')[2];
      const r = await (Documents.summarize as any)({ ...baseEvent, pathParameters: { id } });
      send(res, r.statusCode || 200, r.body, r.headers);
      return;
    }

    notFound(res);
  } catch (err: any) {
    send(
      res,
      500,
      JSON.stringify({ message: '서버 오류가 발생했습니다.', error: err?.message || String(err) }),
      { 'content-type': 'application/json; charset=utf-8' }
    );
  }
}

const port = Number(process.env.PORT || 8787);
const server = http.createServer(handle);
server.listen(port, () => {
  console.log(`[api-local] listening on http://localhost:${port}`);
});
