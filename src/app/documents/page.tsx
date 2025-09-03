'use client';

import { useState, ChangeEvent, FormEvent, useEffect } from 'react';
import axios from 'axios';
import StatusBadge from '@/app/documents/components/StatusBadge';
import { formatDate, formatSize } from '@/lib/ui/format';

type UploadStatus = 'idle' | 'uploading' | 'summarizing' | 'success' | 'error';

export default function DocumentsPage() {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [summary, setSummary] = useState<string>('');
  const [status, setStatus] = useState<UploadStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [items, setItems] = useState<any[]>([]);
  const [nextCursor, setNextCursor] = useState<string | undefined>(undefined);
  const [loadingList, setLoadingList] = useState<boolean>(false);
  const [summarizingId, setSummarizingId] = useState<string | null>(null);

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

  const fetchList = async (cursor?: string) => {
    if (!accessToken) return;
    setLoadingList(true);
    try {
      const baseUrl = window.location.origin;
      const url = new URL(`${baseUrl}/api/documents`);
      url.searchParams.set('limit', '20');
      if (cursor) url.searchParams.set('cursor', cursor);
      const res = await axios.get(url.toString(), {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });
      const data = res.data as { items: any[]; nextCursor?: string };
      setItems(cursor ? [...items, ...(data.items || [])] : (data.items || []));
      setNextCursor(data.nextCursor);
    } catch (e: any) {
      setErrorMessage(e.response?.data?.message || '목록을 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    if (accessToken) fetchList();
  }, [accessToken]);

  const handleDelete = useDeleteHandler(accessToken, async () => {
    await fetchList();
  });

  const handleSummarize = async (documentId: string) => {
    if (!accessToken) return;
    try {
      setSummarizingId(documentId);
      const baseUrl = window.location.origin;
      const res = await axios.post(`${baseUrl}/api/documents/${documentId}/summarize`, {}, {
        headers: { Authorization: `Bearer ${accessToken}` },
        validateStatus: () => true,
      });
      if (res.status === 202) {
        // mark as processing; polling will refresh
        setItems((prev) => prev.map((it) => it.documentId === documentId ? { ...it, status: 'PROCESSING' } : it));
      } else if (res.status >= 200 && res.status < 300) {
        // completed synchronously; refresh list to get status
        await fetchList();
      } else {
        setErrorMessage(res.data?.message || '요약 요청에 실패했습니다.');
      }
    } catch (e: any) {
      setErrorMessage(e.response?.data?.message || '요약 요청 중 오류가 발생했습니다.');
    } finally {
      setSummarizingId(null);
    }
  };

  // Auto-poll when there are PROCESSING items
  useEffect(() => {
    if (!accessToken) return;
    const hasProcessing = items.some((it) => String(it.status || '').toUpperCase() === 'PROCESSING');
    if (!hasProcessing) return;
    const id = setInterval(() => {
      fetchList();
    }, 5000);
    return () => clearInterval(id);
  }, [items, accessToken]);

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

      // 업로드 성공 후 목록 갱신
      await fetchList();
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
      default: return '업로드';
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
                accept=".txt,.md,.markdown,.pdf,text/plain,text/markdown,application/pdf"
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

          {errorMessage && (
            <div className="mt-4 p-4 bg-red-50 text-red-700 rounded">{errorMessage}</div>
          )}

          <section className="mt-8">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xl font-semibold text-gray-800">내 문서</h3>
              <button disabled={loadingList} onClick={() => fetchList()} className="text-sm text-gray-600 hover:text-gray-800">새로고침</button>
            </div>
            <div className="overflow-x-auto border rounded">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-100 text-gray-700">
                  <tr>
                    <th className="text-left p-3">파일명</th>
                    <th className="text-left p-3">크기</th>
                    <th className="text-left p-3">생성일</th>
                    <th className="text-left p-3">상태</th>
                    <th className="text-right p-3">액션</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((it) => (
                    <tr key={it.documentId} className="border-t">
                      <td className="p-3 text-gray-800">{it.filename}</td>
                      <td className="p-3 text-gray-600">{formatSize(it.filesize)}</td>
                      <td className="p-3 text-gray-600">{formatDate(it.createdAt)}</td>
                      <td className="p-3"><StatusBadge status={it.status || 'UPLOADED'} /></td>
                      <td className="p-3 text-right space-x-2">
                        <button onClick={() => window.location.href = `/documents/${it.documentId}`} className="bg-blue-600 text-white py-1 px-3 rounded hover:bg-blue-700">상세</button>
                        <button onClick={() => handleSummarize(it.documentId)} disabled={String(it.status||'').toUpperCase()==='PROCESSING' || summarizingId===it.documentId} className="bg-emerald-600 text-white py-1 px-3 rounded hover:bg-emerald-700 disabled:bg-gray-400">
                          {summarizingId===it.documentId ? '요약 중...' : '요약'}
                        </button>
                        <button onClick={() => handleDelete(it.documentId)} className="bg-gray-100 text-gray-700 py-1 px-3 rounded hover:bg-gray-200">삭제</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {nextCursor && (
              <div className="mt-4 text-center">
                <button disabled={loadingList} onClick={() => fetchList(nextCursor)} className="text-sm bg-white border px-4 py-2 rounded hover:bg-gray-50">더 불러오기</button>
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}

// local helper bound to component state via closure
function useDeleteHandler(accessToken: string | null, onAfter?: () => void) {
  return async (documentId: string) => {
    if (!accessToken) {
      window.location.href = '/';
      return;
    }
    try {
      const baseUrl = window.location.origin;
      await axios.delete(`${baseUrl}/api/documents/${documentId}`, { headers: { Authorization: `Bearer ${accessToken}` } });
      onAfter?.();
    } catch (e: any) {
      alert(e.response?.data?.message || '삭제 중 오류가 발생했습니다.');
    }
  };
}

function DocumentsPageInnerDeleteHook() { return null; }
