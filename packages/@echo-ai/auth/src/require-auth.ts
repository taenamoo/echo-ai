import { verifyToken, verifyTokenDetailed } from './token';

export type AuthStatus =
  | { status: 'ok'; userId: string }
  | { status: 'missing' | 'expired' | 'invalid' };

export const AUTH_ERROR_MESSAGE: Record<'missing' | 'expired' | 'invalid', string> = {
  missing: '인증 토큰이 없습니다.',
  expired: '만료된 토큰입니다.',
  invalid: '유효하지 않은 토큰입니다.',
};

function extractBearerToken(header: string | null | undefined): string | null {
  if (!header) return null;
  if (header.startsWith('Bearer ')) return header.substring(7);
  const [maybeToken] = header.split(' ');
  return maybeToken?.trim() || null;
}

export function getUserIdFromAuthorization(header: string | null | undefined): string | null {
  const token = extractBearerToken(header);
  if (!token) return null;
  const decoded = verifyToken(token);
  const userId = (decoded as any)?.userId;
  return typeof userId === 'string' ? userId : null;
}

export function getAuthStatusFromAuthorization(header: string | null | undefined): AuthStatus {
  const token = extractBearerToken(header);
  if (!token) return { status: 'missing' };
  const res = verifyTokenDetailed(token);
  if (!res.ok) return { status: res.reason };
  const payload = res.payload as any;
  const userId = payload?.userId;
  if (!userId || typeof userId !== 'string') return { status: 'invalid' };
  return { status: 'ok', userId };
}

export type RequireAuthResult =
  | { ok: true; userId: string }
  | { ok: false; reason: 'missing' | 'expired' | 'invalid'; message: string };

export function requireAuthFromAuthorization(header: string | null | undefined): RequireAuthResult {
  const status = getAuthStatusFromAuthorization(header);
  if (status.status !== 'ok') {
    const message = AUTH_ERROR_MESSAGE[status.status];
    return { ok: false, reason: status.status, message };
  }
  return { ok: true, userId: status.userId };
}
