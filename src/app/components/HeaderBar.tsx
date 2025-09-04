'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import axios from '@/lib/axios';

export default function HeaderBar() {
  const [hasToken, setHasToken] = useState<boolean>(false);
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    try {
      setHasToken(!!localStorage.getItem('accessToken'));
    } catch {
      setHasToken(false);
    }
    // fetch /api/me when token exists
    (async () => {
      try {
        const token = localStorage.getItem('accessToken');
        if (!token) return;
        const baseUrl = window.location.origin;
        const res = await axios.get(`${baseUrl}/api/me`, { headers: { Authorization: `Bearer ${token}` } });
        setEmail(res.data?.email || null);
      } catch {
        // ignore
      }
    })();
  }, []);

  return (
    <header className="w-full border-b bg-white">
      <div className="mx-auto max-w-6xl px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/" className="font-semibold text-gray-800">Echo AI</Link>
          <nav className="hidden sm:flex items-center gap-3 text-sm text-gray-700">
            <Link href="/documents" className="hover:underline">문서</Link>
            <Link href="/study" className="hover:underline">스터디</Link>
          </nav>
        </div>
        <div className="flex items-center gap-3 text-sm">
          {email && <span className="text-gray-600 hidden sm:inline" aria-label="현재 사용자 이메일">{email}</span>}
          {hasToken ? (
            <Link href="/auth/logout" className="text-gray-700 hover:underline">로그아웃</Link>
          ) : (
            <>
              <Link href="/auth/login" className="text-gray-700 hover:underline">로그인</Link>
              <span className="text-gray-400">|</span>
              <Link href="/auth/signup" className="text-gray-700 hover:underline">회원가입</Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
