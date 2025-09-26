import type { NormalizedResponse } from './types';
import type { ZodError, ZodIssue } from 'zod';

export type ApiErrorBody = {
  message: string;
  code?: string;
  details?: unknown;
};

export function json(status: number, body: unknown): NormalizedResponse {
  return { status, headers: { 'content-type': 'application/json; charset=utf-8' }, body };
}

export function ok(body: unknown): NormalizedResponse { return json(200, body); }
export function created(body: unknown): NormalizedResponse { return json(201, body); }
export function accepted(body: unknown): NormalizedResponse { return json(202, body); }

export function error(status: number, message: string, code?: string, details?: unknown): NormalizedResponse {
  const body: ApiErrorBody = { message };
  if (code) body.code = code;
  if (typeof details !== 'undefined') body.details = details;
  return json(status, body);
}

export function badRequest(message: string, details?: unknown, code = 'BAD_REQUEST') {
  return error(400, message, code, details);
}
export function unauthorized(message: string, details?: unknown, code = 'UNAUTHORIZED') {
  return error(401, message, code, details);
}
export function forbidden(message: string, details?: unknown, code = 'FORBIDDEN') {
  return error(403, message, code, details);
}
export function notFound(message: string, details?: unknown, code = 'NOT_FOUND') {
  return error(404, message, code, details);
}
export function conflict(message: string, details?: unknown, code = 'CONFLICT') {
  return error(409, message, code, details);
}
export function unprocessableEntity(message: string, details?: unknown, code = 'UNPROCESSABLE_ENTITY') {
  return error(422, message, code, details);
}
export function tooManyRequests(message: string, details?: unknown, code = 'TOO_MANY_REQUESTS') {
  return error(429, message, code, details);
}
export function serverError(message = '서버 오류가 발생했습니다.', details?: unknown, code = 'INTERNAL_SERVER_ERROR') {
  return error(500, message, code, details);
}

export function zodIssues(err: ZodError | { issues: ZodIssue[] }): { issues: { path: string; code: string; message: string }[] } {
  const issues = (err as any)?.issues || [];
  return {
    issues: issues.map((i: ZodIssue) => ({
      path: Array.isArray(i.path) ? i.path.join('.') : String(i.path ?? ''),
      code: i.code,
      message: i.message,
    })),
  };
}

export function badRequestFromZod(err: ZodError, message = '요청 형식이 올바르지 않습니다.') {
  return badRequest(message, zodIssues(err), 'VALIDATION_ERROR');
}

