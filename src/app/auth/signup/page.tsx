'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import axios from '@/lib/axios';

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
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
      const res = await axios.post('/api/auth/signup', { email, password });
      const token = res?.data?.accessToken as string | undefined;
      if (!token) {
        // 일부 플로우에서 자동 로그인을 하지 않을 수 있으므로, 토큰이 없으면 로그인 페이지로 이동
        router.replace('/auth/login');
        return;
      }
      localStorage.setItem('accessToken', token);
      router.replace('/documents');
    } catch (err: any) {
      const msg = err?.response?.data?.message || '회원가입에 실패했습니다.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-6">
      <div className="w-full max-w-md space-y-6">
        <div className="rounded-lg border bg-white p-6 shadow-sm">
          <h1 className="text-xl font-semibold mb-4">회원가입</h1>
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
                autoComplete="new-password"
                placeholder="최소 8자, 숫자+문자 포함, 공백 금지"
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
              {loading ? '가입 중...' : '회원가입'}
            </button>
          </form>
        </div>
        <p className="text-center text-sm text-gray-600">이미 계정이 있으신가요? <a href="/auth/login" className="text-blue-600 hover:underline">로그인</a></p>
      </div>
    </div>
  );
}

