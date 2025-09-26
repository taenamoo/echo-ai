import React, { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import StatusBadge from '../components/StatusBadge';
import { formatDate } from '../lib/format';
import { useToast } from '../providers/ToastProvider';
import { api, summarize } from '../api';

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

export default function DocumentDetail() {
  const { id: documentId } = useParams();
  const nav = useNavigate();
  const { push } = useToast();
  const [detail, setDetail] = useState<DocDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [summarizing, setSummarizing] = useState(false);

  const fetchDetail = useCallback(async (): Promise<DocDetail | null> => {
    if (!documentId) return null;
    try {
      setLoading(true); setError('');
      const res = await api(`/documents/${documentId}`);
      setDetail(res);
      return res as DocDetail;
    } catch (e: any) {
      setError(e.message || '문서 정보를 불러오지 못했습니다.');
      return null;
    } finally { setLoading(false); }
  }, [documentId]);

  useEffect(() => { void fetchDetail(); }, [fetchDetail]);

  const pollUntilComplete = async () => {
    const start = Date.now();
    const limitMs = 60000;
    while (Date.now() - start < limitMs) {
      await new Promise((r) => setTimeout(r, 2000));
      const latest = await fetchDetail();
      const st = (latest?.status || '').toUpperCase();
      if (st === 'COMPLETE' || st === 'FAILED') break;
    }
  };

  async function onSummarize() {
    if (!documentId) return;
    try {
      setSummarizing(true); setError('');
      const res = await summarize(documentId).catch((e) => ({ error: e?.message } as any));
      if (res && (res as any).summaryText) {
        await fetchDetail();
        push({ message: '요약이 완료되었습니다.', type: 'success' });
      } else {
        push({ message: '요약 작업이 큐에 등록되었습니다.', type: 'info', duration: 4000 });
        await pollUntilComplete();
      }
    } catch (e: any) {
      setError(e.message || '요약 요청에 실패했습니다.');
      push({ message: e.message || '요약 요청에 실패했습니다.', type: 'error' });
    } finally { setSummarizing(false); }
  }

  async function onDelete() {
    if (!documentId) return;
    try {
      await api(`/documents/${documentId}`, { method: 'DELETE' });
      push({ message: '문서가 삭제되었습니다.', type: 'success' });
      nav('/documents', { replace: true });
    } catch (e: any) {
      setError(e.message || '삭제에 실패했습니다.');
      push({ message: e.message || '삭제에 실패했습니다.', type: 'error' });
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
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
                <Link to="/documents" aria-label="목록으로 돌아가기" title="목록으로 돌아가기" className="inline-flex items-center gap-1 bg-white border text-gray-700 py-2 px-4 rounded-md hover:bg-gray-50 focus-visible:ring-2 focus-visible:ring-gray-400">⬅️ 목록</Link>
                <button onClick={onDelete} aria-label="문서 삭제" title="삭제" className="inline-flex items-center gap-1 bg-gray-100 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-200 focus-visible:ring-2 focus-visible:ring-gray-400">🗑 삭제</button>
                <button onClick={onSummarize} aria-label="문서 요약 실행" title="요약 실행" disabled={summarizing || detail.status === 'PROCESSING'} className="inline-flex items-center gap-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-400 focus-visible:ring-2 focus-visible:ring-blue-500">
                  {summarizing ? '⏳ 요약 중' : '📝 요약 실행'}
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
      <Footer />
    </div>
  );
}
