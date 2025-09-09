import jwt from 'jsonwebtoken';
import { config } from '@/lib/config';

type SignOpts = {
  expiresIn?: string | number;
};

const secret = config.jwtSecret;

export const generateAccessToken = (
  userId: string,
  email: string,
  opts: SignOpts = { expiresIn: '1h' }
): string => {
  const payload = { userId, email };
  const token = jwt.sign(payload, secret, { expiresIn: opts.expiresIn ?? '1h' });
  return token;
};

export const generateVerificationToken = (email: string): string => {
  const payload = { email };
  const token = jwt.sign(payload, secret, { expiresIn: '1h' });
  return token;
};

export const verifyToken = (token: string): any | null => {
  const res = verifyTokenDetailed(token);
  return res.ok ? res.payload : null;
};

export type VerifyTokenResult =
  | { ok: true; payload: any }
  | { ok: false; reason: 'expired' | 'invalid' };

export const verifyTokenDetailed = (token: string): VerifyTokenResult => {
  try {
    const decoded = jwt.verify(token, secret);
    return { ok: true, payload: decoded };
  } catch (error: any) {
    if (error?.name === 'TokenExpiredError') {
      return { ok: false, reason: 'expired' };
    }
    return { ok: false, reason: 'invalid' };
  }
};
