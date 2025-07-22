import jwt from 'jsonwebtoken';

export const generateAccessToken = (userId: string, email: string): string => {
    const secret = process.env.JWT_SECRET;

    if(!secret) {
        throw new Error('JWT_SECRET is not defined in environment variables.');
    }

    const payload = { userId, email };
    const token = jwt.sign(payload, secret, { expiresIn: '1d' });
    return token;
}