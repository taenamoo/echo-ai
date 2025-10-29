import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { me as apiMe } from '../api';

export type Me = { userId: string; email?: string; name?: string } | null;

type Ctx = { me: Me; loading: boolean; refresh: () => Promise<void>; clear: () => void };

const Ctx = createContext<Ctx | null>(null);
const STORAGE_KEY = 'me';

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [me, setMe] = useState<Me>(null);
  const [loading, setLoading] = useState(false);

  const clear = useCallback(() => {
    try { sessionStorage.removeItem(STORAGE_KEY); } catch {}
    setMe(null);
  }, []);

  const refresh = useCallback(async () => {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
      if (!token) { clear(); return; }
      setLoading(true);
      const m = await apiMe();
      setMe(m || null);
      try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(m || null)); } catch {}
    } catch { clear(); }
    finally { setLoading(false); }
  }, [clear]);

  useEffect(() => {
    try {
      const cached = sessionStorage.getItem(STORAGE_KEY);
      if (cached) setMe(JSON.parse(cached) as Me);
    } catch {}
    try { if (localStorage.getItem('accessToken')) { void refresh(); } } catch {}
  }, [refresh]);

  const value = useMemo<Ctx>(() => ({ me, loading, refresh, clear }), [me, loading, refresh, clear]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useUser() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useUser must be used within UserProvider');
  return ctx;
}

