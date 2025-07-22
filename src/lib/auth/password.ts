import bcrypt from "bcryptjs";

export const hashPassword = async (password: string): Promise<string> => {
    const hashedPassword = await bcrypt.hash(password, process.env.HASH_SALT || 10);
    return hashedPassword;
}

export const comparePassword = async (password:string, hashedPassword: string): Promise<boolean> => {
    return await bcrypt.compare(password, hashedPassword)
}