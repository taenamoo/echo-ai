import bcrypt from "bcryptjs";

export const hashPassword = async (password: string): Promise<string> => {
    const hashedPassword = await bcrypt.hash(password, process.env.HASH_SALT || 10);
    return hashedPassword;
}

export const comparePassword = async (password:string, hashedPassword: string): Promise<boolean> => {
    return await bcrypt.compare(password, hashedPassword)
}

export function validatePasswordPolicy(password: string): { ok: boolean; message?: string } {
    if (typeof password !== 'string') {
        return { ok: false, message: '비밀번호가 올바르지 않습니다.' };
    }
    if (password.length < 8) {
        return { ok: false, message: '비밀번호는 최소 8자 이상이어야 합니다.' };
    }
    if (/\s/.test(password)) {
        return { ok: false, message: '비밀번호에 공백을 포함할 수 없습니다.' };
    }
    if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
        return { ok: false, message: '비밀번호는 숫자와 문자를 모두 포함해야 합니다.' };
    }
    return { ok: true };
}
