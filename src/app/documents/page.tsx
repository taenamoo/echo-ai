'use client';

import { useState, ChangeEvent, FormEvent, useEffect } from 'react';
import axios from 'axios';

// 각 단계별 상태를 정의합니다.
type UploadStatus = 'idle' | 'uploading' | 'summarizing' | 'success' | 'error';

export default function DocumentsPage() {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [summary, setSummary] = useState<string>('');
  const [status, setStatus] = useState<UploadStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');

  // 페이지 로드 시 인증 상태를 확인합니다.
  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      // 상대 경로 대신 전체 URL을 사용하도록 수정
      window.location.href = window.location.origin;
    } else {
      setAccessToken(token);
    }
  }, []);

  // 로그아웃 처리 함수
  const handleLogout = () => {
    localStorage.removeItem('accessToken');
    window.location.href = '/api-test'; // 로그인 페이지로 이동
  };

  // 파일 입력창에 변경이 생겼을 때 파일을 상태에 저장하는 함수
  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFile(e.target.files[0]);
    }
  };

  // 폼 제출(요약하기 버튼 클릭) 시 실행될 함수
  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!file) {
      setErrorMessage('파일을 선택해주세요.');
      return;
    }
    if (!accessToken) {
      setErrorMessage('인증 정보가 유효하지 않습니다. 다시 로그인해주세요.');
      return;
    }

    // 초기화
    setSummary('');
    setErrorMessage('');
    setStatus('uploading');

    try {
      const baseUrl = window.location.origin;
      const formData = new FormData();
      formData.append('file', file);

      // 1. 파일 업로드 API 호출
      const uploadResponse = await axios.post(`${baseUrl}/api/documents`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${accessToken}`
        },
      });

      const { documentId } = uploadResponse.data;
      setStatus('summarizing');

      // 2. AI 요약 API 호출
      const summarizeResponse = await axios.post(`${baseUrl}/api/documents/${documentId}/summarize`, {}, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });

      setSummary(summarizeResponse.data.summary);
      setStatus('success');

    } catch (error: any) {
      console.error('Error:', error);
      const message = error.response?.data?.message || '오류가 발생했습니다.';
      setErrorMessage(message);
      setStatus('error');
      if (error.response?.status === 401) { // 인증 오류 시 로그아웃 처리
        handleLogout();
      }
    } finally {
      const fileInput = document.getElementById('file-upload') as HTMLInputElement;
      if(fileInput) fileInput.value = '';
    }
  };

  // 현재 상태에 따라 버튼 텍스트를 동적으로 변경
  const getButtonText = () => {
    switch (status) {
      case 'uploading': return '업로드 중...';
      case 'summarizing': return 'AI 요약 중...';
      default: return '요약하기';
    }
  };

  // 인증 토큰을 확인하는 동안 로딩 화면을 보여줍니다.
  if (!accessToken) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-600">인증 정보를 확인 중입니다...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-white rounded-lg shadow-lg p-8 space-y-6">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-3xl font-bold text-gray-800">
            AI 문서 요약 서비스
          </h1>
          <button
            onClick={handleLogout}
            className="bg-red-500 text-white py-2 px-4 rounded-md hover:bg-red-600 transition"
          >
            로그아웃
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="file-upload" className="block text-sm font-medium text-gray-700 mb-2">
              요약할 파일을 선택하세요 (PDF, TXT 등)
            </label>
            <input
              id="file-upload"
              type="file"
              onChange={handleFileChange}
              className="block w-full text-sm text-gray-500
                file:mr-4 file:py-2 file:px-4
                file:rounded-full file:border-0
                file:text-sm file:font-semibold
                file:bg-blue-50 file:text-blue-700
                hover:file:bg-blue-100"
            />
          </div>

          <button
            type="submit"
            disabled={!file || status === 'uploading' || status === 'summarizing'}
            className="w-full bg-blue-600 text-white py-3 px-4 rounded-md font-semibold
              hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500
              disabled:bg-gray-400 disabled:cursor-not-allowed transition"
          >
            {getButtonText()}
          </button>
        </form>

        {(status !== 'idle' || errorMessage) && (
          <div className="mt-6 p-6 bg-gray-50 rounded-lg">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">요약 결과:</h2>
            {status === 'summarizing' && <p className="text-gray-600 animate-pulse">AI가 문서를 읽고 분석 중입니다...</p>}
            {status === 'success' && <p className="text-gray-700 whitespace-pre-wrap">{summary}</p>}
            {status === 'error' && <p className="text-red-600">{errorMessage}</p>}
          </div>
        )}
      </div>
    </div>
  );
}
