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

  try {
    const decoded = jwt.verify(token, secret);
    return decoded;
  } catch (error: any) {
    // Normalize to null so callers can consistently return 401
    if (error?.name === 'TokenExpiredError') {
      // Optionally log or handle expiration specifically
      return null;
    }
    return null;
  }
};
