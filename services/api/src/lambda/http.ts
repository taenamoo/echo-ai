import type { APIGatewayProxyResultV2 } from 'aws-lambda';

export function json(statusCode: number, body: unknown, headers: Record<string, string> = {}): APIGatewayProxyResultV2 {
  return {
    statusCode,
    headers: { 'content-type': 'application/json; charset=utf-8', ...headers },
    body: JSON.stringify(body),
  };
}

export function ok(body: unknown) { return json(200, body); }
export function created(body: unknown) { return json(201, body); }
export function accepted(body: unknown) { return json(202, body); }
export function badRequest(message = '잘못된 요청입니다.') { return json(400, { message }); }
export function unauthorized(message = '인증이 필요합니다.') { return json(401, { message }); }
export function forbidden(message = '권한이 없습니다.') { return json(403, { message }); }
export function notFound(message = '리소스를 찾을 수 없습니다.') { return json(404, { message }); }
export function serverError(message = '서버 오류가 발생했습니다.') { return json(500, { message }); }

export function parseJson<T = any>(raw: string | null | undefined): T | null {
  if (!raw) return null;
  try { return JSON.parse(raw) as T; } catch { return null; }
}

export function getAuthToken(headers: Record<string, string | undefined>): string | null {
  const auth = headers['authorization'] || headers['Authorization'];
  if (!auth) return null;
  return auth.startsWith('Bearer ') ? auth.substring(7) : auth;
}
