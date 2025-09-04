'use client';

import { useEffect } from 'react';
import { useToast } from '@/lib/ui/ToastProvider';

export function SessionExpiredListener() {
  const { push } = useToast();

  useEffect(() => {
    // 1) Query param check (?session=expired or ?reason=expired)
    try {
      if (typeof window !== 'undefined') {
        const url = new URL(window.location.href);
        const sessionExpired = url.searchParams.get('session') === 'expired' || url.searchParams.get('reason') === 'expired';
        if (sessionExpired) {
          push('세션이 만료되었습니다. 다시 로그인해주세요.', 'warning');
          // Clean the query without reload
          url.searchParams.delete('session');
          url.searchParams.delete('reason');
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
