'use client';

import { useState, useEffect } from 'react';
import axios from '@/lib/axios';

export default function AuthPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [result, setResult] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (localStorage.getItem('accessToken')) {
      window.location.href = '/documents';
    }
  }, []);

  const handleSignUp = async () => {
    setIsLoading(true);
    setResult('요청 중...');
    try {
      const response = await axios.post('/auth/signup', { email, password });
      if (response.data.accessToken) {
        localStorage.setItem('accessToken', response.data.accessToken);
        window.location.href = '/documents';
      }
    } catch (error: any) {
      setResult(`오류 발생: ${error.response?.data?.message || error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async () => {
    setIsLoading(true);
    setResult('요청 중...');
    try {
      const response = await axios.post('/auth/login', { email, password });
      if (response.data.accessToken) {
        localStorage.setItem('accessToken', response.data.accessToken);
        window.location.href = '/documents';
      }
    } catch (error: any) {
      setResult(`오류 발생: ${error.response?.data?.message || error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Enter 키 입력을 처리하기 위한 form submit 핸들러
  const handleFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault(); // form의 기본 제출 동작(새로고침)을 막습니다.
    handleLogin(); // 로그인 함수를 호출합니다.
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-lg shadow-md p-8">
        <h1 className="text-2xl font-bold mb-6 text-center text-gray-800">
          AI 문서 요약 서비스
        </h1>
        
        {/* form 태그로 감싸고 onSubmit 이벤트를 연결합니다. */}
        <form onSubmit={handleFormSubmit}>
          <div className="mb-4">
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
              이메일
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="test@example.com"
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
              disabled={isLoading}
            />
          </div>
          <div className="mb-6">
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
              비밀번호
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="8자 이상 입력"
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
              disabled={isLoading}
            />
          </div>
          <div className="flex items-center justify-between gap-4 mb-6">
            <button
              type="button" // form 제출을 방지하기 위해 type="button"으로 명시
              onClick={handleSignUp}
              disabled={isLoading}
              className="w-full bg-green-500 text-white py-2 px-4 rounded-md hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition duration-150 ease-in-out disabled:bg-gray-400"
            >
              {isLoading ? '처리중...' : '회원가입'}
            </button>
            <button
              type="submit" // 이 버튼이 form을 제출하도록 type="submit"으로 변경
              disabled={isLoading}
              className="w-full bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition duration-150 ease-in-out disabled:bg-gray-400"
            >
              {isLoading ? '처리중...' : '로그인'}
            </button>
          </div>
        </form>

        {result && (
          <div className="mt-4">
            <pre className="mt-2 p-4 bg-gray-50 text-red-600 rounded-md text-sm whitespace-pre-wrap break-all">
              {result}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
