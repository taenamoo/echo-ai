'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/lib/ui/ToastProvider';

export default function LogoutPage() {
  const router = useRouter();
  const { push } = useToast();

  useEffect(() => {
    try {
      localStorage.removeItem('accessToken');
      push('로그아웃되었습니다.', 'info');
    } catch (e) {
      // ignore
    } finally {
      router.replace('/auth/login');
    }
  }, [router, push]);

  return null;
}

