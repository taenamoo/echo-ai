import { api } from './api';

export async function signup(email: string, password: string, name?: string) {
  return api('/auth/signup', { method: 'POST', json: { email, password, name } });
}

