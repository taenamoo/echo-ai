import Axios from 'axios';

// Shared axios instance with 401 handling for expired/invalid tokens
const axios = Axios.create();

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, '');
if (apiBaseUrl) {
  axios.defaults.baseURL = apiBaseUrl;
} else {
  if (typeof window !== 'undefined') {
    // eslint-disable-next-line no-console
    console.warn('NEXT_PUBLIC_API_BASE_URL가 설정되지 않아 API 요청이 실패할 수 있습니다.');
  }
}

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
            // Dispatch lightweight events so UI updates immediately in same tab
            try { window.dispatchEvent(new CustomEvent('auth:session-expired')); } catch {}
            try { window.dispatchEvent(new CustomEvent('auth:logout')); } catch {}
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
