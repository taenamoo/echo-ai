'use client'; // 이 컴포넌트가 클라이언트 측에서 실행되도록 명시합니다.

import { useState } from 'react';
import axios from 'axios';

export default function ApiTestPage() {
  // 이메일과 비밀번호 입력을 위한 상태(state)
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  // API 응답 결과를 표시하기 위한 상태
  const [result, setResult] = useState('');

  // 회원가입 버튼 클릭 시 실행될 함수
  const handleSignUp = async () => {
    try {
      setResult('요청 중...');
      const response = await axios.post('/api/auth/signup', {
        email,
        password,
      });
      setResult(JSON.stringify(response.data, null, 2));
    } catch (error: any) {
      setResult(`오류 발생: ${error.response?.data?.message || error.message}`);
    }
  };

  // 로그인 버튼 클릭 시 실행될 함수
  const handleLogin = async () => {
    try {
      setResult('요청 중...');
      const response = await axios.post('/api/auth/login', {
        email,
        password,
      });
      setResult(JSON.stringify(response.data, null, 2));
    } catch (error: any) {
      setResult(`오류 발생: ${error.response?.data?.message || error.message}`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-lg shadow-md p-8">
        <h1 className="text-2xl font-bold mb-6 text-center text-gray-800">
          API 테스트 페이지
        </h1>

        {/* 이메일 입력창 */}
        <div className="mb-4">
          <label
            htmlFor="email"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            이메일
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="test@example.com"
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
          />
        </div>

        {/* 비밀번호 입력창 */}
        <div className="mb-6">
          <label
            htmlFor="password"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            비밀번호
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="8자 이상 입력"
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
          />
        </div>

        {/* 버튼 그룹 */}
        <div className="flex items-center justify-between gap-4 mb-6">
          <button
            onClick={handleSignUp}
            className="w-full bg-green-500 text-white py-2 px-4 rounded-md hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition duration-150 ease-in-out"
          >
            회원가입
          </button>
          <button
            onClick={handleLogin}
            className="w-full bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition duration-150 ease-in-out"
          >
            로그인
          </button>
        </div>

        {/* 결과 표시 영역 */}
        <div className="mt-4">
          <h2 className="text-lg font-semibold text-gray-800">API 응답:</h2>
          <pre className="mt-2 p-4 bg-gray-50 text-black rounded-md text-sm whitespace-pre-wrap break-all">
            {result || '여기에 결과가 표시됩니다.'}
          </pre>
        </div>
      </div>
    </div>
  );
}
