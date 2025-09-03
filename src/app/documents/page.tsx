'use client';

import { useState, ChangeEvent, FormEvent, useEffect } from 'react';
import axios from 'axios';

type UploadStatus = 'idle' | 'uploading' | 'summarizing' | 'success' | 'error';

export default function DocumentsPage() {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [summary, setSummary] = useState<string>('');
  const [status, setStatus] = useState<UploadStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      // 상대 경로 대신 전체 URL을 사용하도록 수정
      window.location.href = window.location.origin;
    } else {
      setAccessToken(token);
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('accessToken');
    // 상대 경로 대신 전체 URL을 사용하도록 수정
    window.location.href = window.location.origin;
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!file || !accessToken) {
      setErrorMessage('파일을 선택하거나 다시 로그인해주세요.');
      return;
    }

    setSummary('');
    setErrorMessage('');
    setStatus('uploading');

    try {
      const baseUrl = window.location.origin;
      // 1) Presign 요청 (브라우저 직접 업로드)
      const presignRes = await axios.post(`${baseUrl}/api/documents/presign`, {
        filename: file.name,
        contentType: file.type || 'application/octet-stream',
        size: file.size,
      }, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      const { url, fields, key, documentId } = presignRes.data as {
        url: string;
        fields: Record<string, string>;
        key: string;
        documentId: string;
      };

      // 2) S3에 직접 업로드 (Presigned POST)
      const s3Form = new FormData();
      Object.entries(fields || {}).forEach(([k, v]) => s3Form.append(k, v));
      s3Form.append('file', file);
      await axios.post(url, s3Form);

      // 3) 메타데이터 저장 (DB 레코드 생성)
      await axios.post(`${baseUrl}/api/documents`, {
        key,
        filename: file.name,
        filetype: file.type,
        filesize: file.size,
      }, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      setStatus('summarizing');

      const summarizeResponse = await axios.post(`${baseUrl}/api/documents/${documentId}/summarize`, {}, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });

      setSummary(summarizeResponse.data.summaryText);
      setStatus('success');

    } catch (error: any) {
      const message = error.response?.data?.message || '오류가 발생했습니다.';
      setErrorMessage(message);
      setStatus('error');
      if (error.response?.status === 401) {
        handleLogout();
      }
    } finally {
      const fileInput = document.getElementById('file-upload') as HTMLInputElement;
      if(fileInput) fileInput.value = '';
    }
  };

  const getButtonText = () => {
    switch (status) {
      case 'uploading': return '업로드 중...';
      case 'summarizing': return 'AI 요약 중...';
      default: return '요약하기';
    }
  };

  if (!accessToken) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-600">인증 정보를 확인 중입니다...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation Header */}
      <header className="bg-white shadow-md">
        <nav className="container mx-auto px-6 py-3 flex justify-between items-center">
          <h1 className="text-xl font-bold text-gray-800">Echo AI</h1>
          <div>
            <button onClick={() => window.location.href='/documents'} className="bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 transition mr-2">
              AI 문서 요약
            </button>
            <button onClick={() => window.location.href='/study'} className="text-gray-700 hover:bg-gray-200 py-2 px-4 rounded-md transition mr-4">
              스터디 노트
            </button>
            <button onClick={handleLogout} className="bg-red-500 text-white py-2 px-4 rounded-md hover:bg-red-600 transition">
              로그아웃
            </button>
          </div>
        </nav>
      </header>

      {/* Main Content */}
      <main className="flex flex-col items-center justify-center p-4 mt-10">
        <div className="w-full max-w-2xl bg-white rounded-lg shadow-lg p-8 space-y-6">
          <h2 className="text-3xl font-bold text-center text-gray-800">
            AI 문서 요약 서비스
          </h2>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="file-upload" className="block text-sm font-medium text-gray-700 mb-2">
                요약할 파일을 선택하세요 (PDF, TXT 등)
              </label>
              <input
                id="file-upload"
                type="file"
                onChange={handleFileChange}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
            </div>

            <button
              type="submit"
              disabled={!file || status === 'uploading' || status === 'summarizing'}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-md font-semibold hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-400 disabled:cursor-not-allowed transition"
            >
              {getButtonText()}
            </button>
          </form>

          {(status !== 'idle' || errorMessage) && (
            <div className="mt-6 p-6 bg-gray-50 rounded-lg">
              <h3 className="text-xl font-semibold text-gray-800 mb-4">요약 결과:</h3>
              {status === 'summarizing' && <p className="text-gray-600 animate-pulse">AI가 문서를 읽고 분석 중입니다...</p>}
              {status === 'success' && <p className="text-gray-700 whitespace-pre-wrap">{summary}</p>}
              {status === 'error' && <p className="text-red-600">{errorMessage}</p>}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
