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
      // 일부 환경(시크릿 모드, 스토리지 제한)에서는 localStorage 접근이 실패할 수 있습니다.
      // 또한 키가 존재하지 않는 경우도 무시해도 무방합니다. UX를 저해하지 않기 위해 오류를 삼킵니다.
    } finally {
      router.replace('/auth/login');
    }
  }, [router, push]);

  return null;
}
