"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import axios from '@/lib/axios';

export type Me = { userId: string; email?: string; name?: string } | null;

type Ctx = {
  me: Me;
  loading: boolean;
  refresh: () => Promise<void>;
  clear: () => void;
};

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
      const baseUrl = window.location.origin;
      const res = await axios.get(`${baseUrl}/api/me`, { headers: { Authorization: `Bearer ${token}` } });
      const data = (res?.data || null) as Me;
      setMe(data);
      try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch {}
    } catch {
      clear();
    } finally {
      setLoading(false);
    }
  }, [clear]);

  useEffect(() => {
    try {
      const cached = sessionStorage.getItem(STORAGE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached) as Me;
        setMe(parsed);
      }
    } catch {}
    try { if (localStorage.getItem('accessToken')) { refresh(); } } catch {}
  }, [refresh]);

  const value = useMemo<Ctx>(() => ({ me, loading, refresh, clear }), [me, loading, refresh, clear]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useUser() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useUser must be used within UserProvider');
  return ctx;
}

