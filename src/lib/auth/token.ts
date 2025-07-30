import jwt from 'jsonwebtoken';

export const generateAccessToken = (userId: string, email: string): string => {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new Error('JWT_SECRET is not defined in environment variables.');
  }

  const payload = { userId, email };
  const token = jwt.sign(payload, secret, { expiresIn: '1d' });
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

export const verifyToken = (token: string): any => {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new Error('JWT_SECRET is not defined in environment variables.');
  }

  try {
    const decoded = jwt.verify(token, secret);
    return decoded;
  } catch (error) {
    throw new Error('Invalid or expired token');
  }
};
