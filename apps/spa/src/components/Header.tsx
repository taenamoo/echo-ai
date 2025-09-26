import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiBase, me } from '../api';

export default function Header() {
  const [authed, setAuthed] = useState<boolean>(!!localStorage.getItem('accessToken'));
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    setAuthed(!!token);
    if (token) {
      me().then((m) => setEmail(m?.email || null)).catch(() => setEmail(null));
    } else setEmail(null);
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'accessToken') {
        const t = e.newValue || localStorage.getItem('accessToken');
        setAuthed(!!t);
        if (t) me().then((m) => setEmail(m?.email || null)).catch(() => setEmail(null));
        else setEmail(null);
      }
    };
    const onLogout = () => { setAuthed(false); setEmail(null); };
    const onLogin = () => { setAuthed(true); me().then((m) => setEmail(m?.email || null)).catch(() => setEmail(null)); };
    window.addEventListener('storage', onStorage);
    window.addEventListener('auth:logout', onLogout as EventListener);
    window.addEventListener('auth:login', onLogin as EventListener);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('auth:logout', onLogout as EventListener);
      window.removeEventListener('auth:login', onLogin as EventListener);
    };
  }, []);
  return (
    <header className="w-full border-b bg-white h-14 sticky top-0 z-10" style={{ ['--header-height' as any]: '56px' }}>
      <div className="mx-auto max-w-6xl px-4 h-full flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/" className="font-semibold text-gray-800 flex items-center gap-2"><img src="/globe.svg" alt="Echo AI" width={20} height={20} /> Echo AI</Link>
          <nav className="hidden sm:flex items-center gap-3 text-sm text-gray-700">
            <Link to="/documents" className="hover:underline">문서</Link>
            <Link to="/study" className="hover:underline">스터디</Link>
          </nav>
        </div>
        <div className="flex items-center gap-3 text-sm">
          {email && <span className="text-gray-600 hidden sm:inline" aria-label="현재 사용자 이메일">{email}</span>}
          {authed ? (
            <Link to="/auth/logout" className="text-gray-700 hover:underline">로그아웃</Link>
          ) : (
            <>
              <Link to="/auth/login" className="text-gray-700 hover:underline">로그인</Link>
              <span className="text-gray-400">|</span>
              <Link to="/auth/signup" className="text-gray-700 hover:underline">회원가입</Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
