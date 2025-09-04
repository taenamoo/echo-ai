'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useUser } from '@/lib/auth/UserContext';

export default function HeaderBar() {
  const [hasToken, setHasToken] = useState<boolean>(false);
  const { me, refresh } = useUser();

  useEffect(() => {
    try {
      setHasToken(!!localStorage.getItem('accessToken'));
    } catch {
      setHasToken(false);
    }
    // ensure user info is loaded once per session
    try { if (localStorage.getItem('accessToken')) refresh(); } catch {}
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
          {me?.email && <span className="text-gray-600 hidden sm:inline" aria-label="현재 사용자 이메일">{me.email}</span>}
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
