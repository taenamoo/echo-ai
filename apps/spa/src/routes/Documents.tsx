import React, {
  ChangeEvent,
  FormEvent,
  useEffect,
  useMemo,
  useState,
} from 'react';
import Layout from '../components/Layout';
import StatusBadge from '../components/StatusBadge';
import { formatDate, formatSize } from '../lib/format';
import { useToast } from '../providers/ToastProvider';
import {
  presign,
  s3PresignedUpload,
  createDocument,
  summarize,
  api,
  isApiError,
} from '../api';

export default function Documents() {
  const { push } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<
    'idle' | 'uploading' | 'success' | 'error'
  >('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [items, setItems] = useState<any[]>([]);
  const [nextCursor, setNextCursor] = useState<string | undefined>();
  const [loadingList, setLoadingList] = useState(false);
  const [summarizingId, setSummarizingId] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [progress, setProgress] = useState<Record<string, number>>({});
  const [selectedNames, setSelectedNames] = useState<string[]>([]);
  const [selectedTotalBytes, setSelectedTotalBytes] = useState<number>(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortKey, setSortKey] = useState<
    'createdAt' | 'updatedAt' | 'filename' | 'filesize'
  >('createdAt');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const maxUploadLabel = useMemo(() => {
    const n = Number(import.meta.env.VITE_MAX_UPLOAD_SIZE_MB || 25);
    return isNaN(n) ? '25 MB' : `${n} MB`;
  }, []);

  async function fetchList(cursor?: string) {
    setLoadingList(true);
    try {
      const qs = new URLSearchParams();
      qs.set('limit', '20');
      if (cursor) qs.set('cursor', cursor);
      if (searchTerm) qs.set('q', searchTerm);
      if (sortKey) qs.set('sortKey', sortKey);
      if (sortDir) qs.set('sortDir', sortDir);
      const data = await api('/documents?' + qs.toString());
      setItems(cursor ? [...items, ...(data.items || [])] : data.items || []);
      setNextCursor(data.nextCursor);
    } catch (e: any) {
      if (isApiError(e))
        setErrorMessage(`${e.message}${e.code ? ' (' + e.code + ')' : ''}`);
      else
        setErrorMessage(e.message || '목록을 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoadingList(false);
    }
  }

  useEffect(() => {
    void fetchList();
  }, [searchTerm, sortKey, sortDir]);

  function onFileChange(e: ChangeEvent<HTMLInputElement>) {
    if (e.target.files && e.target.files.length > 0) {
      const filesArr = Array.from(e.target.files);
      const { valid, message } = validateFilesClient(filesArr);
      if (!valid) {
        setErrorMessage(message || '허용되지 않는 파일이 포함되어 있습니다.');
        setFile(null);
        setSelectedNames([]);
        setSelectedTotalBytes(0);
        return;
      }
      setFile(filesArr[0]);
      setSelectedNames(filesArr.map((f) => f.name));
      setSelectedTotalBytes(
        filesArr.reduce((acc, f) => acc + (f.size || 0), 0)
      );
    } else {
      setFile(null);
      setSelectedNames([]);
      setSelectedTotalBytes(0);
    }
  }

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
    const files = Array.from(e.dataTransfer.files || []);
    if (files.length === 0) return;
    const v = validateFilesClient(files);
    if (!v.valid) {
      setErrorMessage(v.message || '허용되지 않는 파일이 포함되어 있습니다.');
      return;
    }
    setFile(files[0]);
    setSelectedNames(files.map((f) => f.name));
    await uploadFiles(files);
  };

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const input = document.getElementById(
      'file-upload'
    ) as HTMLInputElement | null;
    const files = input?.files;
    if (!files || files.length === 0) {
      setErrorMessage('파일을 선택하세요.');
      return;
    }
    await uploadFiles(Array.from(files));
    if (input) input.value = '';
  }

  async function uploadFiles(files: File[]) {
    setErrorMessage('');
    setStatus('uploading');
    try {
      for (const f of files) {
        const v = validateFilesClient([f]);
        if (!v.valid) {
          push({
            message: `업로드 불가: ${f.name} - ${v.message}`,
            type: 'warning',
          });
          continue;
        }
        try {
          const p = await presign(
            f.name,
            f.type || 'application/octet-stream',
            f.size
          );
          const key = f.name;
          setProgress((prev) => ({ ...prev, [key]: 0 }));
          await s3PresignedUpload(p.url, p.fields, f);
          await createDocument(p.key, f);
          push({ message: `업로드 완료: ${f.name}`, type: 'success' });
          setProgress((prev) => ({ ...prev, [key]: 100 }));
        } catch (ex: any) {
          push({
            message: `업로드 실패: ${f.name} - ${ex.message || '오류'}`,
            type: 'error',
          });
        }
      }
      await fetchList();
      setStatus('success');
    } catch (err: any) {
      setErrorMessage(err.message || '오류가 발생했습니다.');
      setStatus('error');
    } finally {
      setProgress({});
      setSelectedNames([]);
    }
  }

  async function onSummarize(documentId: string) {
    setSummarizingId(documentId);
    const res = await summarize(documentId).catch(() => null);
    if (res && res.summaryText)
      setItems((prev) =>
        prev.map((it) =>
          it.documentId === documentId
            ? { ...it, status: 'COMPLETE', summaryText: res.summaryText }
            : it
        )
      );
    else
      setItems((prev) =>
        prev.map((it) =>
          it.documentId === documentId ? { ...it, status: 'PROCESSING' } : it
        )
      );
    setSummarizingId(null);
  }

  async function onDelete(documentId: string) {
    try {
      await api(`/documents/${documentId}`, { method: 'DELETE' });
      await fetchList();
      push({ message: '문서가 삭제되었습니다.', type: 'success' });
    } catch (e: any) {
      push({ message: e.message || '삭제 중 오류', type: 'error' });
    }
  }

  useEffect(() => {
    const hasProcessing = items.some(
      (it) => String(it.status || '').toUpperCase() === 'PROCESSING'
    );
    if (!hasProcessing) return;
    const id = setInterval(() => {
      void fetchList();
    }, 5000);
    return () => clearInterval(id);
  }, [items]);

  return (
    <Layout>
      <div className="w-full max-w-3xl sm:max-w-4xl md:max-w-5xl lg:max-w-6xl xl:max-w-7xl mx-auto bg-white rounded-lg shadow-lg p-6 md:p-8 mb-4">
        <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-center text-gray-800">
          AI 문서 요약 서비스
        </h2>

        <form onSubmit={onSubmit} className="mb-4">
          <div className="mb-4">
            <label
              htmlFor="file-upload"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              요약할 파일을 선택하세요 (PDF, TXT 등)
            </label>
            <div
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              onDrop={onDrop}
              role="button"
              tabIndex={0}
              className={`w-full border-2 ${isDragging ? 'border-blue-500' : 'border-dashed border-gray-300'} rounded-md p-4 md:p-6 text-center text-sm md:text-base text-gray-600 focus-visible:ring-2 focus-visible:ring-blue-500`}
            >
              여기로 파일을 드래그하여 업로드하거나 아래에서 선택하세요.
              <input
                id="file-upload"
                type="file"
                accept=".txt,.md,.markdown,.pdf,text/plain,text/markdown,application/pdf"
                multiple
                onChange={onFileChange}
                className="block mt-4 w-full text-sm text-gray-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={!file || status === 'uploading'}
            className="w-full bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50"
            aria-disabled={!file || status === 'uploading'}
          >
            {status === 'uploading' ? '업로드 중...' : '업로드'}
          </button>
          {selectedNames.length > 0 && (
            <div className="text-sm text-gray-600">
              선택 파일({selectedNames.length}개, 총{' '}
              {formatSize(selectedTotalBytes)})
            </div>
          )}
          {Object.keys(progress).length > 0 && (
            <div className="space-y-1">
              {Object.entries(progress).map(([name, pct]) => (
                <div key={name} className="text-sm text-gray-600">
                  {name}: {pct}%
                </div>
              ))}
            </div>
          )}
          {errorMessage && (
            <div
              className="rounded-md border border-red-400 bg-red-50 text-red-700 px-3 py-2"
              role="alert"
            >
              {errorMessage}
            </div>
          )}
        </form>

        <section>
          <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
            <div className="flex gap-2 items-center">
              <input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="검색(파일명)"
                className="px-3 py-2 border rounded w-56"
              />
              <select
                value={sortKey}
                onChange={(e) => setSortKey(e.target.value as any)}
                className="px-3 py-2 border rounded"
              >
                <option value="createdAt">생성일</option>
                <option value="updatedAt">업데이트일</option>
                <option value="filename">파일명</option>
                <option value="filesize">크기</option>
              </select>
              <select
                value={sortDir}
                onChange={(e) => setSortDir(e.target.value as any)}
                className="px-3 py-2 border rounded"
              >
                <option value="desc">내림차순</option>
                <option value="asc">오름차순</option>
              </select>
            </div>
            <div className="text-sm text-gray-500">
              최대 업로드 크기: {maxUploadLabel}
            </div>
          </div>

          <div className="mt-4 rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="hidden md:grid grid-cols-[minmax(0,3fr)_repeat(4,minmax(0,1.2fr))_minmax(0,1.6fr)] gap-4 border-b border-slate-200 px-6 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <span>파일명</span>
              <span>크기</span>
              <span>상태</span>
              <span>생성일</span>
              <span>업데이트</span>
              <span className="text-right">액션</span>
            </div>
            <div className="divide-y divide-slate-200">
              {items.map((it) => (
                <div
                  key={it.documentId}
                  className="grid gap-5 px-4 py-5 md:grid-cols-[minmax(0,3fr)_repeat(4,minmax(0,1.2fr))_minmax(0,1.6fr)] md:px-6 md:py-6"
                >
                  <div className="flex flex-col gap-2 text-slate-800">
                    <span className="text-xs font-medium uppercase text-slate-400 md:hidden">
                      파일명
                    </span>
                    <span
                      className="max-w-[520px] break-words font-semibold"
                      title={it.filename}
                    >
                      {it.filename}
                    </span>
                    <details className="summary-toggle mt-2 text-sm text-slate-600 md:hidden">
                      <summary className="cursor-pointer inline-flex items-center gap-1 text-slate-700">
                        <span className="icon-closed text-gray-500">▶</span>
                        <span className="icon-open text-gray-500">▼</span>
                        <span className="label-closed">요약 보기</span>
                        <span className="label-open">요약 닫기</span>
                      </summary>
                      <div className="mt-2 whitespace-pre-wrap">
                        {it.summaryText || '요약 내용이 없습니다.'}
                      </div>
                    </details>
                  </div>

                  <div className="hidden flex-col gap-1 text-slate-600 md:flex">
                    <span className="text-xs font-medium uppercase text-slate-400">
                      크기
                    </span>
                    <span>{formatSize(it.filesize)}</span>
                  </div>

                  <div className="hidden flex-col gap-1 text-slate-600 md:flex">
                    <span className="text-xs font-medium uppercase text-slate-400">
                      상태
                    </span>
                    <StatusBadge status={it.status} />
                  </div>

                  <div className="hidden flex-col gap-1 text-slate-600 md:flex">
                    <span className="text-xs font-medium uppercase text-slate-400">
                      생성일
                    </span>
                    <span>{formatDate(it.createdAt)}</span>
                  </div>

                  <div className="hidden flex-col gap-1 text-slate-600 md:flex">
                    <span className="text-xs font-medium uppercase text-slate-400">
                      업데이트
                    </span>
                    <span>{formatDate(it.updatedAt)}</span>
                  </div>

                  <div className="flex flex-wrap items-start justify-start gap-2 md:justify-end">
                    <button
                      onClick={() =>
                        (window.location.href = `/documents/${it.documentId}`)
                      }
                      className="inline-flex items-center gap-1 w-10 rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
                    >
                      📄 상세
                    </button>
                    <button
                      onClick={() => onSummarize(it.documentId)}
                      disabled={
                        String(it.status || '').toUpperCase() ===
                          'PROCESSING' || summarizingId === it.documentId
                      }
                      className="inline-flex items-center gap-1 w-10 rounded-md bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
                    >
                      📝 {summarizingId === it.documentId ? '요약 중' : '요약'}
                    </button>
                    <button
                      onClick={() => onDelete(it.documentId)}
                      className="inline-flex items-center gap-1 w-10 rounded-md bg-slate-100 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200"
                    >
                      🗑 삭제
                    </button>
                  </div>

                  <div className="grid gap-2 text-sm text-slate-600 md:hidden">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium uppercase text-slate-400">
                        크기
                      </span>
                      <span>{formatSize(it.filesize)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium uppercase text-slate-400">
                        상태
                      </span>
                      <StatusBadge status={it.status} />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium uppercase text-slate-400">
                        생성일
                      </span>
                      <span>{formatDate(it.createdAt)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium uppercase text-slate-400">
                        업데이트
                      </span>
                      <span>{formatDate(it.updatedAt)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          {nextCursor && (
            <div className="mt-4 text-center">
              <button
                disabled={loadingList}
                onClick={() => fetchList(nextCursor)}
                className="text-sm bg-white border px-4 py-2 rounded hover:bg-gray-50"
              >
                더 불러오기
              </button>
            </div>
          )}
        </section>
      </div>
    </Layout>
  );
}

function validateFilesClient(files: File[]): {
  valid: boolean;
  message?: string;
} {
  const MAX_MB = Number(import.meta.env.VITE_MAX_UPLOAD_SIZE_MB || 25);
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
    if (!ALLOWED.has(f.type))
      return { valid: false, message: '허용되지 않은 파일 형식입니다.' };
    if (f.size > MAX)
      return {
        valid: false,
        message: `파일 크기가 제한(${Math.round(MAX / 1024 / 1024)}MB)을 초과했습니다.`,
      };
  }
  return { valid: true };
}
