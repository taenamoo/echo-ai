import { z } from 'zod';

export const LoginSchema = z.object({
  email: z.string().min(1),
  password: z.string().min(1),
});

export const SignupSchema = z.object({
  email: z.string().min(1),
  password: z.string().min(1),
  name: z.string().optional(),
});

export type LoginBody = z.infer<typeof LoginSchema>;
export type SignupBody = z.infer<typeof SignupSchema>;

