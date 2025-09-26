import { useEffect } from 'react';
import { useToast } from '../providers/ToastProvider';

export function SessionExpiredListener() {
  const { push } = useToast();
  useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        const url = new URL(window.location.href);
        const expired = url.searchParams.get('session') === 'expired' || url.searchParams.get('reason') === 'expired';
        if (expired) {
          push('세션이 만료되었습니다. 다시 로그인해주세요.', 'warning');
          url.searchParams.delete('session');
          url.searchParams.delete('reason');
          window.history.replaceState({}, '', url.toString());
        }
      }
    } catch {}
    const onExpired = () => push('세션이 만료되었습니다. 다시 로그인해주세요.', 'warning');
    window.addEventListener('auth:session-expired', onExpired as EventListener);
    return () => window.removeEventListener('auth:session-expired', onExpired as EventListener);
  }, [push]);
  return null;
}

