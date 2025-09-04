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
            // Optionally, show a simple alert to guide re-login
            // eslint-disable-next-line no-alert
            alert('세션이 만료되었거나 유효하지 않습니다. 다시 로그인해주세요.');
            window.location.href = '/';
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

