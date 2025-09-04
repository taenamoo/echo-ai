'use client';

import { useEffect, useState, useCallback } from 'react';
import axios from '@/lib/axios';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import StatusBadge from '@/app/documents/components/StatusBadge';
import { formatDate } from '@/lib/ui/format';
import { useToast } from '@/lib/ui/ToastProvider';

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
  const { push } = useToast();
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      router.push('/');
    } else {
      setAccessToken(token);
    }
  }, [router]);

  const fetchDetail = useCallback(async (): Promise<DocDetail | null> => {
    if (!accessToken) return null;
    try {
      setLoading(true);
      setError('');
      const baseUrl = window.location.origin;
      const res = await axios.get(`${baseUrl}/api/documents/${documentId}` , {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      setDetail(res.data);
      return res.data as DocDetail;
    } catch (e: any) {
      setError(e.response?.data?.message || '문서 정보를 불러오지 못했습니다.');
      if (e.response?.status === 401) router.push('/');
      return null;
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
      const latest = await fetchDetail();
      const st = (latest?.status || '').toUpperCase();
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
        push({ message: '요약 작업이 큐에 등록되었습니다.', type: 'info', duration: 4000 });
        await pollUntilComplete();
      } else if (res.status >= 200 && res.status < 300) {
        await fetchDetail();
        push({ message: '요약이 완료되었습니다.', type: 'success' });
      } else {
        setError(res.data?.message || '요약 중 오류가 발생했습니다.');
        push({ message: res.data?.message || '요약 중 오류가 발생했습니다.', type: 'error' });
      }
    } catch (e: any) {
      setError(e.response?.data?.message || '요약 요청에 실패했습니다.');
      push({ message: e.response?.data?.message || '요약 요청에 실패했습니다.', type: 'error' });
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
      push({ message: '문서가 삭제되었습니다.', type: 'success' });
      router.push('/documents');
    } catch (e: any) {
      setError(e.response?.data?.message || '삭제에 실패했습니다.');
      push({ message: e.response?.data?.message || '삭제에 실패했습니다.', type: 'error' });
    }
  };

  if (!accessToken) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-md">
        <nav className="container mx-auto px-6 py-3 flex justify-between items-center">
          <h1 className="text-xl font-bold text-gray-800">Echo AI</h1>
          <div className="space-x-2">
            <Link href="/documents" aria-label="문서 목록으로 돌아가기" className="bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus-visible:ring-2 focus-visible:ring-blue-500">목록으로 돌아가기</Link>
            <button onClick={() => { localStorage.removeItem('accessToken'); window.location.href = '/'; }} aria-label="로그아웃" className="bg-red-500 text-white py-2 px-4 rounded-md hover:bg-red-600 focus-visible:ring-2 focus-visible:ring-red-500">로그아웃</button>
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
                <p className="text-sm text-gray-500">ID: {detail.documentId} · 생성일: {formatDate(detail.createdAt || null)} · 상태: <StatusBadge status={detail.status || 'UPLOADED'} /></p>
              </div>
              <div className="space-x-2">
                <Link href="/documents" aria-label="목록으로 돌아가기" className="bg-white border text-gray-700 py-2 px-4 rounded-md hover:bg-gray-50 focus-visible:ring-2 focus-visible:ring-gray-400">목록</Link>
                <button onClick={handleDelete} aria-label="문서 삭제" className="bg-gray-100 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-200 focus-visible:ring-2 focus-visible:ring-gray-400">삭제</button>
                <button onClick={handleSummarize} aria-label="문서 요약 실행" disabled={summarizing || detail.status === 'PROCESSING'} className="bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-400 focus-visible:ring-2 focus-visible:ring-blue-500">
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

// StatusBadge moved to shared component
