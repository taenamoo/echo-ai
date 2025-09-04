'use client';

import React, { useState, ChangeEvent, FormEvent, useEffect } from 'react';
import axios from '@/lib/axios';
import StatusBadge from '@/app/documents/components/StatusBadge';
import { formatDate, formatSize } from '@/lib/ui/format';
import { useToast } from '@/lib/ui/ToastProvider';

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
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [progress, setProgress] = useState<Record<string, number>>({});
  const [selectedNames, setSelectedNames] = useState<string[]>([]);
  const [selectedTotalBytes, setSelectedTotalBytes] = useState<number>(0);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [sortKey, setSortKey] = useState<'createdAt'|'updatedAt'|'filename'|'filesize'>('createdAt');
  const [sortDir, setSortDir] = useState<'asc'|'desc'>('desc');

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
    if (e.target.files && e.target.files.length > 0) {
      const filesArr = Array.from(e.target.files);
      // Keep first for button enablement, but we'll process all on submit
      // client-side pre-validation
      const { valid, message } = validateFilesClient(filesArr);
      if (!valid) {
        setErrorMessage(message || '허용되지 않는 파일이 포함되어 있습니다.');
        setFile(null);
        setSelectedNames([]);
        setSelectedTotalBytes(0);
        return;
      }
      setFile(filesArr[0]);
      setSelectedNames(filesArr.map(f => f.name));
      setSelectedTotalBytes(filesArr.reduce((acc, f) => acc + (f.size || 0), 0));
    } else {
      setFile(null);
      setSelectedNames([]);
      setSelectedTotalBytes(0);
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
      if (searchTerm) url.searchParams.set('q', searchTerm);
      if (sortKey) url.searchParams.set('sortKey', sortKey);
      if (sortDir) url.searchParams.set('sortDir', sortDir);
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
  }, [accessToken, searchTerm, sortKey, sortDir]);

  const { push: pushToast } = useToast();
  const handleDelete = useDeleteHandler(
    accessToken,
    async () => {
      await fetchList();
      pushToast({ message: '문서가 삭제되었습니다.', type: 'success' });
    },
    (msg) => pushToast({ message: msg, type: 'error' })
  );

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
        // completed synchronously; update from response
        const summaryText = res.data?.summaryText;
        setItems((prev) => prev.map((it) => it.documentId === documentId ? { ...it, status: 'COMPLETE', summaryText } : it));
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

  const { push } = useToast();

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const input = document.getElementById('file-upload') as HTMLInputElement | null;
    const files = input?.files;
    if (!files || files.length === 0 || !accessToken) {
      setErrorMessage('파일을 선택하거나 다시 로그인해주세요.');
      return;
    }

    setSummary('');
    setErrorMessage('');
    setStatus('uploading');

    try {
      const baseUrl = window.location.origin;
      // Sequentially process files
      for (let i = 0; i < files.length; i++) {
        const f = files.item(i)!;
        // validate each file again before upload
        const v = validateFilesClient([f]);
        if (!v.valid) {
          push({ message: `업로드 불가: ${f.name} - ${v.message}`, type: 'warning' });
          continue;
        }
        try {
          // 1) Presign 요청
          const presignRes = await axios.post(`${baseUrl}/api/documents/presign`, {
            filename: f.name,
            contentType: f.type || 'application/octet-stream',
            size: f.size,
          }, {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json'
            }
          });
          const { url, fields, key } = presignRes.data as { url: string; fields: Record<string, string>; key: string };

          // 2) S3 업로드
          const s3Form = new FormData();
          Object.entries(fields || {}).forEach(([k, v]) => s3Form.append(k, v));
          s3Form.append('file', f);
          setProgress(prev => ({ ...prev, [f.name]: 0 }));
          await axios.post(url, s3Form, {
            onUploadProgress: (evt: { loaded: number; total?: number }) => {
              if (evt.total) {
                const pct = Math.round((evt.loaded * 100) / evt.total);
                setProgress(prev => ({ ...prev, [f.name]: pct }));
              }
            }
          });

          // 3) 메타 저장
          await axios.post(`${baseUrl}/api/documents`, {
            key,
            filename: f.name,
            filetype: f.type,
            filesize: f.size,
          }, {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json'
            }
          });

          push({ message: `업로드 완료: ${f.name}`, type: 'success' });
          setProgress(prev => ({ ...prev, [f.name]: 100 }));
        } catch (ex: any) {
          console.log('Upload error', ex);
          const msg = ex.response?.data?.message || '업로드 중 오류가 발생했습니다.';
          push({ message: `업로드 실패: ${f.name} - ${msg}`, type: 'error' });
        }
      }

      // 전체 처리 후 목록 갱신
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
      setProgress({});
      setSelectedNames([]);
    }
  };

  // Drag-and-drop handlers
  const onDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };
  const onDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };
  const onDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (!accessToken) return;
    const dt = e.dataTransfer;
    const files = dt.files;
    if (!files || files.length === 0) return;
    const arr = Array.from(files);
    const v = validateFilesClient(arr);
    if (!v.valid) {
      setErrorMessage(v.message || '허용되지 않는 파일이 포함되어 있습니다.');
      return;
    }
    // Reflect first file to enable button and list names for clarity
    setFile(files.item(0) || null);
    setSelectedNames(arr.map(f => f.name));
    // Build a transient input-like object to reuse handler logic
    const baseUrl = window.location.origin;
    setSummary('');
    setErrorMessage('');
    setStatus('uploading');
    try {
      for (let i = 0; i < files.length; i++) {
        const f = files.item(i)!;
        const v = validateFilesClient([f]);
        if (!v.valid) {
          push({ message: `업로드 불가: ${f.name} - ${v.message}`, type: 'warning' });
          continue;
        }
        try {
          const presignRes = await axios.post(`${baseUrl}/api/documents/presign`, {
            filename: f.name,
            contentType: f.type || 'application/octet-stream',
            size: f.size,
          }, { headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' } });
          const { url, fields, key } = presignRes.data as { url: string; fields: Record<string, string>; key: string };
          const s3Form = new FormData();
          Object.entries(fields || {}).forEach(([k, v]) => s3Form.append(k, v));
          s3Form.append('file', f);
          setProgress(prev => ({ ...prev, [f.name]: 0 })); // Initialize progress for the current file
          await axios.post(url, s3Form, { onUploadProgress: (evt: { loaded: number; total?: number }) => {
            if (evt.total) setProgress(prev => ({ ...prev, [f.name]: Math.round((evt.loaded * 100) / evt.total) }));
          }});
          await axios.post(`${baseUrl}/api/documents`, { key, filename: f.name, filetype: f.type, filesize: f.size }, { headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' } });
          push({ message: `업로드 완료: ${f.name}`, type: 'success' });
          setProgress(prev => ({ ...prev, [f.name]: 100 }));
        } catch (ex: any) {
          const msg = ex.response?.data?.message || '업로드 중 오류가 발생했습니다.';
          push({ message: `업로드 실패: ${f.name} - ${msg}`, type: 'error' });
        }
      }
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
      setProgress({});
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
      {/* Main Content */}
      <main className="container mx-auto p-4">
        <div className="w-full max-w-3xl sm:max-w-4xl md:max-w-5xl lg:max-w-6xl xl:max-w-7xl mx-auto bg-white rounded-lg shadow-lg p-6 md:p-8 space-y-6">
          <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-center text-gray-800">
            AI 문서 요약 서비스
          </h2>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="file-upload" className="block text-sm font-medium text-gray-700 mb-2">
                요약할 파일을 선택하세요 (PDF, TXT 등)
              </label>
              <div
                onDragOver={onDragOver}
                onDragLeave={onDragLeave}
                onDrop={onDrop}
                role="button"
                aria-label="파일을 드래그 앤 드롭하여 업로드"
                tabIndex={0}
                className={`w-full border-2 ${isDragging ? 'border-blue-500' : 'border-dashed border-gray-300'} rounded-md p-4 md:p-6 text-center text-sm md:text-base text-gray-600 focus-visible:ring-2 focus-visible:ring-blue-500`}
              >
                여기로 파일을 드래그하여 업로드하거나 아래에서 선택하세요.
              </div>
              <input
                id="file-upload"
                type="file"
                accept=".txt,.md,.markdown,.pdf,text/plain,text/markdown,application/pdf"
                multiple
                onChange={handleFileChange}
                aria-label="업로드할 파일 선택"
                className="block w-full text-sm text-gray-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
            </div>

            <button
              type="submit"
              disabled={!file || status === 'uploading'}
              aria-disabled={!file || status === 'uploading'}
              aria-label="선택한 파일 업로드"
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-md font-semibold hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500 disabled:bg-gray-400 disabled:cursor-not-allowed transition"
            >
              {getButtonText()}
            </button>
          </form>

          {errorMessage && (
            <div className="mt-4 p-4 bg-red-50 text-red-700 rounded">{errorMessage}</div>
          )}

          {selectedNames.length > 0 && (
            <div className="mt-2 text-sm text-gray-600" aria-live="polite">
              선택된 파일: {selectedNames.length === 1 ? selectedNames[0] : `${selectedNames.length}개`} · 총 용량: {formatSize(selectedTotalBytes)} · 최대(파일당): {getMaxUploadLabel()}
            </div>
          )}

          {Object.keys(progress).length > 0 && (
            <div className="space-y-2" aria-live="polite">
              {Object.entries(progress).map(([name, pct]) => (
                <div key={name} className="w-full">
                  <div className="flex justify-between text-xs text-gray-600 mb-1">
                    <span className="truncate max-w-[70%]" title={name}>{name}</span>
                    <span>{pct ?? 0}%</span>
                  </div>
                  <div className="h-2 w-full bg-gray-200 rounded">
                    <div className="h-2 bg-blue-600 rounded" style={{ width: `${pct || 0}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}

          <section className="mt-8">
            <div className="flex items-center justify-between mb-3 gap-3 flex-wrap">
              <h3 className="text-xl font-semibold text-gray-800">내 문서</h3>
              <div className="flex items-center gap-2 ml-auto">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="파일명 검색"
                  aria-label="파일명 검색"
                  className="border rounded px-2 py-1 text-sm"
                />
                <select
                  value={`${sortKey}_${sortDir}`}
                  onChange={(e) => {
                    const [k, d] = e.target.value.split('_') as any;
                    setSortKey(k);
                    setSortDir(d);
                  }}
                  aria-label="정렬 옵션"
                  className="border rounded px-2 py-1 text-sm bg-white"
                >
                  <option value="createdAt_desc">생성일 최신순</option>
                  <option value="createdAt_asc">생성일 오래된순</option>
                  <option value="updatedAt_desc">업데이트 최신순</option>
                  <option value="updatedAt_asc">업데이트 오래된순</option>
                  <option value="filename_asc">파일명 A→Z</option>
                  <option value="filename_desc">파일명 Z→A</option>
                  <option value="filesize_desc">파일크기 큰순</option>
                  <option value="filesize_asc">파일크기 작은순</option>
                </select>
                <button disabled={loadingList} onClick={() => fetchList()} className="text-sm text-gray-600 hover:text-gray-800">새로고침</button>
              </div>
            </div>
            <div className="border rounded overflow-hidden md:overflow-x-auto">
              <table className="min-w-full table-fixed text-sm md:text-base">
                <thead className="bg-gray-100 text-gray-700">
                  <tr>
                    <th className="text-left p-3 whitespace-nowrap w-1/2 md:w-2/5">파일명</th>
                    <th className="text-left p-3 whitespace-nowrap w-16">크기</th>
                    <th className="text-left p-3 whitespace-nowrap w-24">생성일</th>
                    <th className="text-left p-3 whitespace-nowrap md:w-2/5 hidden md:table-cell">요약</th>
                    <th className="text-left p-3 whitespace-nowrap w-20">상태</th>
                    <th className="text-right p-3 whitespace-nowrap w-32 hidden md:table-cell">액션</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((it) => (
                    <React.Fragment key={it.documentId}>
                    <tr className="border-t align-top">
                      <td className="p-3 text-gray-800 line-clamp-2 sm:truncate sm:whitespace-nowrap max-w-[140px] sm:max-w-[220px] md:max-w-[320px] lg:max-w-none" title={it.filename}>{it.filename}</td>
                      <td className="p-3 text-gray-600">{formatSize(it.filesize)}</td>
                      <td className="p-3 text-gray-600 whitespace-nowrap">{formatDate(it.createdAt)}</td>
                      <td className="p-3 text-gray-600 hidden md:table-cell">
                        <div className="break-words md:line-clamp-1 lg:line-clamp-2" title={it.summaryText || ''}>{it.summaryText || ''}</div>
                      </td>
                      <td className="p-3"><StatusBadge status={it.status || 'UPLOADED'} /></td>
                      <td className="p-3 hidden md:table-cell">
                        <div className="flex items-center justify-end gap-2 whitespace-nowrap">
                          <button
                            onClick={() => window.location.href = `/documents/${it.documentId}`}
                            aria-label={`문서 상세 보기 ${it.filename}`}
                            title="상세 보기"
                            className="inline-flex items-center h-8 px-3 rounded-md text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 focus-visible:ring-2 focus-visible:ring-blue-500"
                          >
                            <span className="mr-1">📄</span>
                            상세
                          </button>
                          <button
                            onClick={() => handleSummarize(it.documentId)}
                            aria-label={`문서 요약 실행 ${it.filename}`}
                            title="요약 실행"
                            disabled={String(it.status||'').toUpperCase()==='PROCESSING' || summarizingId===it.documentId}
                            className="inline-flex items-center h-8 px-3 rounded-md text-sm font-medium bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60 focus-visible:ring-2 focus-visible:ring-emerald-500"
                          >
                            <span className="mr-1">📝</span>
                            {summarizingId===it.documentId ? '요약 중' : '요약'}
                          </button>
                          <button
                            onClick={() => handleDelete(it.documentId)}
                            aria-label={`문서 삭제 ${it.filename}`}
                            title="삭제"
                            className="inline-flex items-center h-8 px-3 rounded-md text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 focus-visible:ring-2 focus-visible:ring-gray-400"
                          >
                            <span className="mr-1">🗑</span>
                            삭제
                          </button>
                        </div>
                      </td>
                    </tr>
                    <tr className="md:hidden border-b">
                      <td className="p-3 text-gray-700" colSpan={6}>
                        <details className="summary-toggle">
                          <summary className="cursor-pointer inline-flex items-center gap-1 text-gray-700 hover:text-gray-900">
                            <span className="icon-closed text-gray-500">▶</span>
                            <span className="icon-open text-gray-500">▼</span>
                            <span className="label-closed">요약 보기</span>
                            <span className="label-open">요약 닫기</span>
                          </summary>
                          <div className="mt-2 text-gray-700 whitespace-pre-wrap">{it.summaryText || '요약 내용이 없습니다.'}</div>
                          <div className="mt-3 flex items-center gap-2">
                            <button
                              onClick={() => window.location.href = `/documents/${it.documentId}`}
                              aria-label={`문서 상세 보기 ${it.filename}`}
                              className="inline-flex items-center h-8 px-3 rounded-md text-sm font-medium bg-blue-600 text-white hover:bg-blue-700"
                            >
                              📄 상세
                            </button>
                            <button
                              onClick={() => handleSummarize(it.documentId)}
                              aria-label={`문서 요약 실행 ${it.filename}`}
                              disabled={String(it.status||'').toUpperCase()==='PROCESSING' || summarizingId===it.documentId}
                              className="inline-flex items-center h-8 px-3 rounded-md text-sm font-medium bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60"
                            >
                              📝 {summarizingId===it.documentId ? '요약 중' : '요약'}
                            </button>
                            <button
                              onClick={() => handleDelete(it.documentId)}
                              aria-label={`문서 삭제 ${it.filename}`}
                              className="inline-flex items-center h-8 px-3 rounded-md text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200"
                            >
                              🗑 삭제
                            </button>
                          </div>
                        </details>
                      </td>
                    </tr>
                    </React.Fragment>
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

function truncate(text?: string | null, n: number = 80) {
  if (!text) return '';
  return text.length > n ? text.slice(0, n) + '…' : text;
}

function getMaxUploadLabel() {
  const n = Number(process.env.NEXT_PUBLIC_MAX_UPLOAD_SIZE_MB || 25);
  return isNaN(n) ? '25 MB' : `${n} MB`;
}

function validateFilesClient(files: File[]): { valid: boolean; message?: string } {
  const MAX_MB = Number(process.env.NEXT_PUBLIC_MAX_UPLOAD_SIZE_MB || 25);
  const MAX = isNaN(MAX_MB) ? 25 * 1024 * 1024 : MAX_MB * 1024 * 1024;
  const ALLOWED = new Set([
    'text/plain',
    'text/markdown',
    'application/pdf',
    'image/png',
    'image/jpeg',
    'image/gif',
  ]);
  for (const f of files) {
    if (!ALLOWED.has(f.type)) {
      return { valid: false, message: '허용되지 않은 파일 형식입니다.' };
    }
    if (f.size > MAX) {
      return { valid: false, message: `파일 크기가 제한(${Math.round(MAX/1024/1024)}MB)을 초과했습니다.` };
    }
  }
  return { valid: true };
}

// removed: client-side filter/sort helper (server now handles q/sort)

// local helper bound to component state via closure
function useDeleteHandler(accessToken: string | null, onAfter?: () => void, onError?: (message: string) => void) {
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
      const msg = e.response?.data?.message || '삭제 중 오류가 발생했습니다.';
      onError?.(msg);
    }
  };
}

function DocumentsPageInnerDeleteHook() { return null; }
