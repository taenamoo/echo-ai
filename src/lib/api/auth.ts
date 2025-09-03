import { NextRequest } from 'next/server';
import { verifyToken } from '@/lib/auth/token';

export function getUserIdFromRequest(req: NextRequest): string | null {
  const auth = req.headers.get('authorization');
  const token = auth?.startsWith('Bearer ') ? auth.split(' ')[1] : auth?.split(' ')[0];
  if (!token) return null;
  const decoded = verifyToken(token);
  if (!decoded || !decoded.userId) return null;
  return decoded.userId as string;
}

