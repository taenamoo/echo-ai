'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import axios from '@/lib/axios';

export default function LoginPage() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const reason = params.get('reason') || params.get('session');
  const showExpiredBanner = reason === 'expired';

  useEffect(() => {
    // If already logged in, go to documents
    try {
      const token = localStorage.getItem('accessToken');
      if (token) router.replace('/documents');
    } catch (e) {
      console.warn('Failed to access localStorage:', e);
    }
  }, [router]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await axios.post('/api/auth/login', { email, password });
      const token = res?.data?.accessToken as string | undefined;
      if (!token) throw new Error('로그인 응답에 토큰이 없습니다.');
      localStorage.setItem('accessToken', token);
      router.replace('/documents');
    } catch (err: any) {
      const msg = err?.response?.data?.message || '로그인에 실패했습니다.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-6">
      <div className="w-full max-w-md space-y-6">
        {showExpiredBanner && (
          <div className="rounded-md border border-yellow-400 bg-yellow-50 text-yellow-800 px-4 py-3" role="status">
            세션이 만료되었습니다. 다시 로그인해주세요.
          </div>
        )}

        <div className="rounded-lg border bg-white p-6 shadow-sm">
          <h1 className="text-xl font-semibold mb-4">로그인</h1>
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">이메일</label>
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
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">비밀번호</label>
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
              <div className="rounded-md border border-red-400 bg-red-50 text-red-700 px-3 py-2" role="alert">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-md bg-blue-600 text-white py-2 hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? '로그인 중...' : '로그인'}
            </button>
          </form>
        </div>
        <p className="text-center text-sm text-gray-600">계정이 없으신가요? 회원가입은 추후 제공됩니다.</p>
      </div>
    </div>
  );
}
