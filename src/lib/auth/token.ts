import jwt from 'jsonwebtoken';

type SignOpts = {
  expiresIn?: string | number;
};

export const generateAccessToken = (
  userId: string,
  email: string,
  opts: SignOpts = { expiresIn: '1h' }
): string => {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new Error('JWT_SECRET is not defined in environment variables.');
  }

  const payload = { userId, email };
  const token = jwt.sign(payload, secret, { expiresIn: opts.expiresIn ?? '1h' });
  return token;
};

export const generateVerificationToken = (email: string): string => {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new Error('JWT_SECRET is not defined in environment variables.');
  }

  const payload = { email };
  const token = jwt.sign(payload, secret, { expiresIn: '1h' });
  return token;
};

export const verifyToken = (token: string): any | null => {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new Error('JWT_SECRET is not defined in environment variables.');
  }

  const res = verifyTokenDetailed(token);
  return res.ok ? res.payload : null;
};

export type VerifyTokenResult =
  | { ok: true; payload: any }
  | { ok: false; reason: 'expired' | 'invalid' };

export const verifyTokenDetailed = (token: string): VerifyTokenResult => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is not defined in environment variables.');
  }
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
