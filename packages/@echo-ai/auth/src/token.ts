import jwt, { type JwtPayload, TokenExpiredError } from 'jsonwebtoken';
import { getConfig } from '@echo-ai/config';

type SignOptions = {
  expiresIn?: string | number;
};

function getSecret(): string {
  const config = getConfig();
  return config.jwtSecret;
}

export function generateAccessToken(
  userId: string,
  email: string,
  options: SignOptions = { expiresIn: '1h' }
): string {
  const payload = { userId, email };
  return jwt.sign(payload, getSecret(), { expiresIn: options.expiresIn ?? '1h' });
}

export function generateVerificationToken(email: string): string {
  const payload = { email };
  return jwt.sign(payload, getSecret(), { expiresIn: '1h' });
}

export type VerifyTokenResult =
  | { ok: true; payload: string | JwtPayload }
  | { ok: false; reason: 'expired' | 'invalid' };

export function verifyToken(token: string): string | JwtPayload | null {
  const result = verifyTokenDetailed(token);
  return result.ok ? result.payload : null;
}

export function verifyTokenDetailed(token: string): VerifyTokenResult {
  try {
    const decoded = jwt.verify(token, getSecret());
    return { ok: true, payload: decoded };
  } catch (error) {
    if (error instanceof TokenExpiredError) {
      return { ok: false, reason: 'expired' };
    }
    return { ok: false, reason: 'invalid' };
  }
}
