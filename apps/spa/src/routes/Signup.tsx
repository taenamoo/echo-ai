import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Layout from '../components/Layout';
import { signup } from '../signupApi';

export default function Signup() {
  const nav = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError(null);
    try {
      const res = await signup(email, password, name);
      localStorage.setItem('accessToken', res.accessToken);
      nav('/documents', { replace: true });
    } catch (e: any) {
      setError(e.message || '회원가입 실패');
    } finally { setBusy(false); }
  }

  return (
    <Layout mainClassName="flex items-center justify-center">
      <div className="w-full max-w-md space-y-6">
        <div className="rounded-lg border bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold mb-4">회원가입</h2>
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label htmlFor="signup-email" className="block text-sm font-medium text-gray-700">이메일</label>
              <input id="signup-email" value={email} onChange={(e) => setEmail(e.target.value)} type="email" className="mt-1 block w-full rounded-md border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" autoComplete="email" required />
            </div>
            <div>
              <label htmlFor="signup-password" className="block text-sm font-medium text-gray-700">비밀번호</label>
              <input id="signup-password" value={password} type="password" onChange={(e) => setPassword(e.target.value)} className="mt-1 block w-full rounded-md border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" autoComplete="new-password" required />
            </div>
            <div>
              <label htmlFor="signup-name" className="block text-sm font-medium text-gray-700">이름</label>
              <input id="signup-name" value={name} onChange={(e) => setName(e.target.value)} className="mt-1 block w-full rounded-md border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" autoComplete="name" required />
            </div>
            {error && <div className="rounded-md border border-red-400 bg-red-50 text-red-700 px-3 py-2" role="alert">{error}</div>}
            <button disabled={busy} type="submit" className="w-full rounded-md bg-blue-600 text-white py-2 hover:bg-blue-700 disabled:opacity-50">{busy ? '가입 중...' : '가입'}</button>
          </form>
        </div>
        <div className="text-center text-sm text-gray-600">이미 계정이 있으신가요? <Link to="/auth/login" className="text-blue-600 hover:underline">로그인</Link></div>
      </div>
    </Layout>
  );
}
