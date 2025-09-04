'use client';

import { useEffect } from 'react';
import { useToast } from '@/lib/ui/ToastProvider';

export function SessionExpiredListener() {
  const { push } = useToast();

  useEffect(() => {
    // 1) Query param check (?session=expired)
    try {
      if (typeof window !== 'undefined') {
        const url = new URL(window.location.href);
        if (url.searchParams.get('session') === 'expired') {
          push('세션이 만료되었습니다. 다시 로그인해주세요.', 'warning');
          // Clean the query without reload
          url.searchParams.delete('session');
          window.history.replaceState({}, '', url.toString());
        }
      }
    } catch { /* ignore */ }

    // 2) Listen for dispatched event from axios interceptor
    const onExpired = () => push('세션이 만료되었습니다. 다시 로그인해주세요.', 'warning');
    window.addEventListener('auth:session-expired', onExpired as EventListener);
    return () => {
      window.removeEventListener('auth:session-expired', onExpired as EventListener);
    };
  }, [push]);

  return null;
}

