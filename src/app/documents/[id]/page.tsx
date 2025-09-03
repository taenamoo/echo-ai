'use client';

import { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import Link from 'next/link';

type DocDetail = {
  documentId: string;
  filename: string;
  filetype?: string | null;
  filesize?: number | null;
  status?: 'UPLOADED' | 'PENDING' | 'PROCESSING' | 'COMPLETE' | 'FAILED';
  summaryText?: string;
  createdAt?: string;
  updatedAt?: string;
};

export default function DocumentDetailPage({ params }: { params: { id: string } }) {
  const documentId = params.id;
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [detail, setDetail] = useState<DocDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [summarizing, setSummarizing] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      window.location.href = window.location.origin;
    } else {
      setAccessToken(token);
    }
  }, []);

  const fetchDetail = useCallback(async () => {
    if (!accessToken) return;
    try {
      setLoading(true);
      setError('');
      const baseUrl = window.location.origin;
      const res = await axios.get(`${baseUrl}/api/documents/${documentId}` , {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      setDetail(res.data);
    } catch (e: any) {
      setError(e.response?.data?.message || '문서 정보를 불러오지 못했습니다.');
      if (e.response?.status === 401) window.location.href = window.location.origin;
    } finally {
      setLoading(false);
    }
  }, [accessToken, documentId]);

  useEffect(() => { fetchDetail(); }, [fetchDetail]);

  const pollUntilComplete = async () => {
    // Poll detail status every 2s up to ~1 min
    const start = Date.now();
    const limitMs = 60000;
    while (Date.now() - start < limitMs) {
      await new Promise(r => setTimeout(r, 2000));
      await fetchDetail();
      const st = (detail?.status || '').toUpperCase();
      if (st === 'COMPLETE' || st === 'FAILED') break;
    }
  };

  const handleSummarize = async () => {
    if (!accessToken) return;
    try {
      setSummarizing(true);
      setError('');
      const baseUrl = window.location.origin;
      const res = await axios.post(`${baseUrl}/api/documents/${documentId}/summarize`, {}, {
        headers: { Authorization: `Bearer ${accessToken}` },
        validateStatus: () => true,
      });
      if (res.status === 202) {
        // queued async mode
        await pollUntilComplete();
      } else if (res.status >= 200 && res.status < 300) {
        await fetchDetail();
      } else {
        setError(res.data?.message || '요약 중 오류가 발생했습니다.');
      }
    } catch (e: any) {
      setError(e.response?.data?.message || '요약 요청에 실패했습니다.');
    } finally {
      setSummarizing(false);
    }
  };

  const handleDelete = async () => {
    if (!accessToken) return;
    try {
      const baseUrl = window.location.origin;
      await axios.delete(`${baseUrl}/api/documents/${documentId}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      window.location.href = '/documents';
    } catch (e: any) {
      setError(e.response?.data?.message || '삭제에 실패했습니다.');
    }
  };

  if (!accessToken) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-md">
        <nav className="container mx-auto px-6 py-3 flex justify-between items-center">
          <h1 className="text-xl font-bold text-gray-800">Echo AI</h1>
          <div className="space-x-2">
            <Link href="/documents" className="bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600">목록</Link>
            <button onClick={() => { localStorage.removeItem('accessToken'); window.location.href = '/'; }} className="bg-red-500 text-white py-2 px-4 rounded-md hover:bg-red-600">로그아웃</button>
          </div>
        </nav>
      </header>

      <main className="container mx-auto px-6 py-8">
        {loading ? (
          <p className="text-gray-600">로딩 중...</p>
        ) : error ? (
          <p className="text-red-600">{error}</p>
        ) : !detail ? (
          <p className="text-gray-600">문서를 찾을 수 없습니다.</p>
        ) : (
          <div className="bg-white rounded-lg shadow p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-800">{detail.filename}</h2>
                <p className="text-sm text-gray-500">ID: {detail.documentId} · 상태: <StatusBadge status={detail.status || 'UPLOADED'} /></p>
              </div>
              <div className="space-x-2">
                <button onClick={handleDelete} className="bg-gray-100 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-200">삭제</button>
                <button onClick={handleSummarize} disabled={summarizing || detail.status === 'PROCESSING'} className="bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-400">
                  {summarizing ? '요약 중...' : '요약 실행'}
                </button>
              </div>
            </div>

            <div className="mt-4">
              <h3 className="text-xl font-semibold text-gray-800 mb-2">요약 결과</h3>
              {detail.summaryText ? (
                <pre className="whitespace-pre-wrap text-gray-800 bg-gray-50 p-4 rounded border">{detail.summaryText}</pre>
              ) : (
                <p className="text-gray-600">요약 내용이 없습니다. 상단의 요약 실행을 눌러 생성하세요.</p>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const s = status.toUpperCase();
  const color = s === 'COMPLETE' ? 'bg-green-100 text-green-800' : s === 'PROCESSING' ? 'bg-yellow-100 text-yellow-800' : s === 'FAILED' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800';
  const label = s;
  return <span className={`inline-block px-2 py-1 text-xs rounded ${color}`}>{label}</span>;
}

