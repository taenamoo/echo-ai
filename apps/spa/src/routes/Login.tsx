import React, { useEffect, useState } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import Layout from '../components/Layout';
import { login, me } from '../api';

export default function Login() {
  const nav = useNavigate();
  const [params] = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const reason = params.get('reason') || params.get('session');
  const showExpiredBanner = reason === 'expired';

  useEffect(() => {
    try {
      const token = localStorage.getItem('accessToken');
      if (token) nav('/documents', { replace: true });
    } catch {}
  }, [nav]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await login(email, password);
      localStorage.setItem('accessToken', res.accessToken);
      await me();
      nav('/documents', { replace: true });
    } catch (e: any) {
      setError(e.message || '로그인 실패');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Layout mainClassName="flex items-center justify-center">
      <div className="w-full max-w-md space-y-6">
        {showExpiredBanner && (
          <div
            className="rounded-md border border-yellow-400 bg-yellow-50 text-yellow-800 px-4 py-3"
            role="status"
          >
            세션이 만료되었습니다. 다시 로그인해주세요.
          </div>
        )}
        <div className="rounded-lg  bg-white p-6 shadow-sm text-gray-900">
          <h1 className="text-xl font-semibold mb-4">로그인</h1>
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium !text-gray-800"
              >
                이메일
              </label>
              <input
                id="email"
                type="email"
                className="mt-1 block w-full rounded-md border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium !text-gray-800"
              >
                비밀번호
              </label>
              <input
                id="password"
                type="password"
                className="mt-1 block w-full rounded-md border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>
            {error && (
              <div
                className="rounded-md border border-red-400 bg-red-50 text-red-700 px-3 py-2"
                role="alert"
              >
                {error}
              </div>
            )}
            <button
              type="submit"
              disabled={busy}
              className="w-full mt-4 rounded-md bg-blue-600 text-white py-2 hover:bg-blue-700 disabled:opacity-50"
            >
              {busy ? '로그인 중...' : '로그인'}
            </button>
          </form>
        </div>
        <p className="text-center text-sm text-gray-600">
          계정이 없으신가요?{' '}
          <Link to="/auth/signup" className="text-blue-600 hover:underline">
            회원가입
          </Link>
        </p>
      </div>
    </Layout>
  );
}
