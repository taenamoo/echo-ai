import type { APIGatewayProxyResultV2 } from 'aws-lambda';
import type { NormalizedResponse } from '@echo-ai/api-core';

const defaultOrigins = ['http://localhost:5173'];

const allowedOrigins = (() => {
  const raw = process.env.ALLOWED_ORIGINS;
  if (raw && raw.trim().length > 0) {
    return raw
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return defaultOrigins;
})();

const allowHeaders =
  process.env.CORS_ALLOW_HEADERS || 'authorization,content-type';
const allowMethods =
  process.env.CORS_ALLOW_METHODS || 'GET,POST,PUT,DELETE,OPTIONS';

function normalizeHeaderName(name: string): string {
  return name.toLowerCase();
}

function ensureContentType(headers: Record<string, string>) {
  const hasContentType = Object.keys(headers).some(
    (key) => normalizeHeaderName(key) === 'content-type'
  );
  if (!hasContentType) {
    headers['content-type'] = 'application/json; charset=utf-8';
  }
}

function mergeVary(current: string | undefined, value: string): string {
  if (!current || current.trim().length === 0) return value;
  const parts = current
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.some((p) => p.toLowerCase() === value.toLowerCase())) {
    return current;
  }
  return `${current}, ${value}`;
}

function resolveOrigin(
  requestHeaders: Record<string, string | undefined>
): string | undefined {
  const originHeader =
    requestHeaders?.origin ??
    requestHeaders?.Origin ??
    requestHeaders?.['x-forwarded-origin'];
  if (!originHeader) return undefined;
  const trimmed = originHeader.trim();
  if (trimmed.length === 0) return undefined;
  if (allowedOrigins.includes('*')) {
    return '*';
  }
  if (allowedOrigins.includes(trimmed)) {
    return trimmed;
  }
  return undefined;
}

function applyCorsHeaders(
  requestHeaders: Record<string, string | undefined>,
  baseHeaders: Record<string, string>
): Record<string, string> {
  const headers: Record<string, string> = { ...baseHeaders };
  ensureContentType(headers);

  const responseValue = resolveOrigin(requestHeaders);
  if (responseValue) {
    headers['Access-Control-Allow-Origin'] = responseValue;
    if (responseValue !== '*') {
      headers['Vary'] = mergeVary(headers['Vary'], 'Origin');
    }
    headers['Access-Control-Allow-Headers'] ??= allowHeaders;
    headers['Access-Control-Allow-Methods'] ??= allowMethods;
  }

  return headers;
}

function serializeBody(body: unknown): string {
  if (typeof body === 'string') {
    return body;
  }
  if (body === undefined) {
    return '';
  }
  return JSON.stringify(body ?? {});
}

export function toApiGatewayResponse(
  response: NormalizedResponse,
  requestHeaders: Record<string, string | undefined>
): APIGatewayProxyResultV2 {
  const headers = applyCorsHeaders(requestHeaders, {
    ...(response.headers || {}),
  });
  return {
    statusCode: response.status,
    headers,
    body: serializeBody(response.body),
  };
}

export function jsonResponse(
  statusCode: number,
  body: unknown,
  requestHeaders: Record<string, string | undefined>,
  extraHeaders: Record<string, string> = {}
): APIGatewayProxyResultV2 {
  const headers = applyCorsHeaders(requestHeaders, {
    'content-type': 'application/json; charset=utf-8',
    ...extraHeaders,
  });
  return {
    statusCode,
    headers,
    body: serializeBody(body),
  };
}
