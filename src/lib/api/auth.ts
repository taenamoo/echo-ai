import { NextRequest } from 'next/server';
import { verifyToken, verifyTokenDetailed } from '@/lib/auth/token';

export function getUserIdFromRequest(req: NextRequest): string | null {
  const auth = req.headers.get('authorization');
  const token = auth?.startsWith('Bearer ') ? auth.split(' ')[1] : auth?.split(' ')[0];
  if (!token) return null;
  const decoded = verifyToken(token);
  if (!decoded || !decoded.userId) return null;
  return decoded.userId as string;
}

export type AuthStatus =
  | { status: 'ok'; userId: string }
  | { status: 'missing' | 'expired' | 'invalid' };

export function getAuthStatus(req: NextRequest): AuthStatus {
  const auth = req.headers.get('authorization');
  const token = auth?.startsWith('Bearer ') ? auth.split(' ')[1] : auth?.split(' ')[0];
  if (!token) return { status: 'missing' };
  const res = verifyTokenDetailed(token);
  if (!res.ok) return { status: res.reason };
  const payload = res.payload as any;
  const userId = payload?.userId;
  if (!userId || typeof userId !== 'string') return { status: 'invalid' };
  return { status: 'ok', userId };
}
