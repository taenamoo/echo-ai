import Axios from 'axios';

// Shared axios instance with 401 handling for expired/invalid tokens
const axios = Axios.create();

axios.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    const message: string | undefined = error?.response?.data?.message;
    if (status === 401) {
      // Standardized messages from server
      const isExpired = message === '만료된 토큰입니다.';
      const isInvalid = message === '유효하지 않은 토큰입니다.' || message === '인증 토큰이 없습니다.';
      if (isExpired || isInvalid) {
        try {
          if (typeof window !== 'undefined') {
            localStorage.removeItem('accessToken');
            // Dispatch a lightweight event so UI can show toast/modal if desired
            try { window.dispatchEvent(new CustomEvent('auth:session-expired')); } catch {}
            // Redirect to login with reason hint for UX handling
            const target = '/auth/login?reason=expired';
            window.location.href = target;
          }
        } catch {
          // ignore storage errors
        }
      }
    }
    return Promise.reject(error);
  }
);

export default axios;
