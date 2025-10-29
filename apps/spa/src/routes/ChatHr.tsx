import {
  useState,
  useEffect,
  useRef,
  FormEvent,
  ChangeEvent,
  useCallback,
} from 'react';
import {
  api,
  presign,
  s3PresignedUpload,
  createDocument,
  isApiError,
} from '../api';
import Layout from '../components/Layout';
import { useToast } from '../providers/ToastProvider';
import { formatSize } from '../lib/format';

type SourceReference = {
  documentId: string;
  filename: string;
  chunkIndex: number;
  snippet: string;
};

type Message = {
  role: 'user' | 'ai';
  text: string;
  sources?: SourceReference[];
};

type HrDocument = {
  documentId: string;
  filename: string;
  createdAt: string;
  status?: string;
  summaryText?: string | null;
};

const MAX_SELECTED_DOCUMENTS = 3;

const HrDocumentUploadModal = ({
  onClose,
  onRefresh,
  documents,
  isLoadingList,
}: {
  onClose: () => void;
  onRefresh: () => Promise<void>;
  documents: HrDocument[];
  isLoadingList: boolean;
}) => {
  const { push } = useToast();
  const [files, setFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [status, setStatus] = useState<
    'idle' | 'uploading' | 'success' | 'error'
  >('idle');
  const [progress, setProgress] = useState<Record<string, number>>({});
  const [errorMessage, setErrorMessage] = useState('');

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(Array.from(e.target.files));
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files) {
      setFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handleDeleteDocument = async (documentId: string) => {
    if (!window.confirm('정말로 이 문서를 삭제하시겠습니까?')) return;
    try {
      await api(`/hr-documents/${documentId}`, { method: 'DELETE' });
      push({ message: '문서가 삭제되었습니다.', type: 'success' });
      await onRefresh();
    } catch (error) {
      push({ message: '문서 삭제에 실패했습니다.', type: 'error' });
    }
  };

  const handleUpload = async () => {
    if (files.length === 0) return;

    setStatus('uploading');
    setErrorMessage('');
    setProgress({});

    for (const file of files) {
      try {
        const presigned = await presign(file.name, file.type, file.size);
        await s3PresignedUpload(presigned.url, presigned.fields, file);
        await createDocument(presigned.key, file, ['hr']);
        push({
          message: `${file.name} 파일이 업로드되었습니다.`,
          type: 'success',
        });
      } catch (error) {
        const message = isApiError(error)
          ? error.message
          : '알 수 없는 오류가 발생했습니다.';
        setErrorMessage((prev) => prev + `${file.name}: ${message}\n`);
        push({ message: `${file.name} 업로드에 실패했습니다.`, type: 'error' });
        setStatus('error');
        return;
      }
    }

    setStatus('success');
    push({
      message: '모든 HR 문서가 성공적으로 업로드되었습니다.',
      type: 'info',
    });
    setFiles([]);
    await onRefresh();
    onClose();
  };

  return (
    <div
      className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-xl w-full max-w-2xl p-6 flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-2xl.font-bold mb-4">HR 문서 등록</h2>

        <div className="overflow-y-auto pr-2">
          <p className="text-gray-600 mb-6">
            챗봇이 학습할 HR 관련 문서를 업로드하세요. (예: 사내 규정, 복지 정책
            PDF)
          </p>
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
              isDragging
                ? 'border-sky-500 bg-sky-50'
                : 'border-gray-300 bg-gray-50'
            }`}
          >
            <p className="text-gray-500 mb-2">
              파일을 드래그하거나 아래에서 선택하세요.
            </p>
            <input
              type="file"
              multiple
              onChange={handleFileChange}
              className="text-sm"
            />
            {files.length > 0 && (
              <p className="mt-3 text-xs text-gray-500">
                선택된 파일: {files.map((f) => f.name).join(', ')}
              </p>
            )}
          </div>

          <div className="my-6">
            <h3 className="font-semibold mb-3">업로드된 HR 문서</h3>
            {isLoadingList ? (
              <p className="text-sm text-gray-500">목록을 불러오는 중...</p>
            ) : documents.length > 0 ? (
              <ul className="space-y-2">
                {documents.map((doc) => (
                  <li
                    key={doc.documentId}
                    className="flex justify-between items-center bg-gray-50 p-2 rounded-md text-sm"
                  >
                    <div>
                      <span className="text-gray-800">{doc.filename}</span>
                      <span className="ml-2 text-xs text-gray-500">
                        상태: {(doc.status || '').toUpperCase() || 'UNKNOWN'}
                      </span>
                    </div>
                    <button
                      onClick={() => handleDeleteDocument(doc.documentId)}
                      className="text-red-500 hover:text-red-700 p-1 rounded-full"
                      aria-label={`${doc.filename} 삭제`}
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-4 w-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-gray-500">업로드된 문서가 없습니다.</p>
            )}
          </div>

          {files.length > 0 && (
            <div className="mb-4 space-y-2">
              <h3 className="font-semibold">선택된 파일:</h3>
              <ul className="text-sm text-gray-700 list-disc list-inside">
                {files.map((f, i) => (
                  <li key={i}>
                    {f.name} ({formatSize(f.size)})
                  </li>
                ))}
              </ul>
            </div>
          )}

          {status === 'uploading' && (
            <div className="space-y-1 mb-4">
              {files.map((file) => (
                <div key={file.name} className="text-sm">
                  <span>{file.name}: </span>
                  <progress
                    value={progress[file.name] || 0}
                    max={file.size}
                    className="w-full"
                  />
                </div>
              ))}
            </div>
          )}

          {errorMessage && (
            <div
              className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4"
              role="alert"
            >
              <strong className="font-bold">오류:</strong>
              <span className="block sm:inline whitespace-pre-wrap">
                {errorMessage}
              </span>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4 border-t mt-auto">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded bg-gray-200 text-gray-800 hover:bg-gray-300"
            >
              취소
            </button>
            <button
              onClick={handleUpload}
              disabled={files.length === 0 || status === 'uploading'}
              className="px-4 py-2 rounded bg-sky-600 text-white hover:bg-sky-700 disabled:bg-gray-400"
            >
              {status === 'uploading' ? '업로드 중...' : '업로드'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default function ChatHrPage() {
  const { push } = useToast();
  const [conversation, setConversation] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [hrDocuments, setHrDocuments] = useState<HrDocument[]>([]);
  const [isLoadingDocuments, setIsLoadingDocuments] = useState(true);
  const [selectedDocIds, setSelectedDocIds] = useState<string[]>([]);

  const refreshDocuments = useCallback(async () => {
    setIsLoadingDocuments(true);
    try {
      const data = await api('/hr-documents');
      setHrDocuments(data.items || []);
    } catch (error) {
      push({
        message: 'HR 문서 목록을 불러오는데 실패했습니다.',
        type: 'error',
      });
    } finally {
      setIsLoadingDocuments(false);
    }
  }, [push]);

  useEffect(() => {
    void refreshDocuments();
  }, [refreshDocuments]);

  useEffect(() => {
    setConversation([
      {
        role: 'ai',
        text: '안녕하세요! 저는 HR 전문가 챗봇입니다. 위쪽에서 참고할 HR 문서를 하나 이상 선택한 뒤 질문을 입력해 주세요.',
      },
    ]);
  }, []);

  useEffect(() => {
    setSelectedDocIds((prev) =>
      prev.filter((id) =>
        hrDocuments.some(
          (doc) =>
            doc.documentId === id &&
            (doc.status || '').toUpperCase() === 'COMPLETE'
        )
      )
    );
  }, [hrDocuments]);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop =
        chatContainerRef.current.scrollHeight;
    }
  }, [conversation]);

  const handleDocumentToggle = useCallback(
    (documentId: string) => {
      setSelectedDocIds((prev) => {
        if (prev.includes(documentId)) {
          return prev.filter((id) => id !== documentId);
        }
        if (prev.length >= MAX_SELECTED_DOCUMENTS) {
          push({
            message: `최대 ${MAX_SELECTED_DOCUMENTS}개의 문서만 선택할 수 있습니다.`,
            type: 'error',
          });
          return prev;
        }
        return [...prev, documentId];
      });
    },
    [push]
  );

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const trimmed = inputMessage.trim();
    if (!trimmed || isLoading) return;
    if (selectedDocIds.length === 0) {
      push({
        message: '답변을 받을 문서를 최소 한 개 선택해주세요.',
        type: 'error',
      });
      return;
    }

    const userMessage: Message = { role: 'user', text: trimmed };
    setConversation((prev) => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      const data = await api('/chatHr', {
        method: 'POST',
        json: { question: trimmed, documentIds: selectedDocIds },
      });
      const aiMessage: Message = {
        role: 'ai',
        text: data.reply,
        sources: Array.isArray(data.sources) ? data.sources : [],
      };
      setConversation((prev) => [...prev, aiMessage]);
    } catch (error) {
      console.error('ChatHR failed', error);
      const errorMessage: Message = {
        role: 'ai',
        text: '죄송합니다, 답변을 가져오는 중 오류가 발생했습니다.',
      };
      setConversation((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Layout>
      <div className="flex flex-col h-full max-w-4xl mx-auto bg-white shadow-lg rounded-lg">
        <header className="p-4 border-b flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">HR 전문가 챗봇</h1>
            <p className="text-sm text-gray-500">
              인사(HR) 관련 궁금한 점을 무엇이든 물어보세요.
            </p>
          </div>
          {/* <button
            onClick={() => setIsUploadModalOpen(true)}
            className="px-4 py-2 rounded bg-teal-600 text-white hover:bg-teal-700 flex items-center gap-2"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
              />
            </svg>
            HR 문서 관리
          </button> */}
        </header>
        <section className="m-6 px-6 py-4 border-b bg-gray-50">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-700">
              참고할 문서를 선택하세요 (최대 {MAX_SELECTED_DOCUMENTS}개)
            </h2>
            <div className="flex items-center gap-2 text-xs">
              <button
                type="button"
                onClick={() => refreshDocuments()}
                className="text-sky-600 hover:underline"
              >
                새로고침
              </button>
              {/* <button
                type="button"
                onClick={() => setIsUploadModalOpen(true)}
                className="text-teal-700 hover:underline"
              >
                문서 업로드
              </button> */}
            </div>
          </div>
          {isLoadingDocuments ? (
            <p className="text-xs text-gray-500">
              HR 문서를 불러오는 중입니다...
            </p>
          ) : hrDocuments.length === 0 ? (
            <p className="text-xs text-gray-500">
              등록된 HR 문서가 없습니다. 문서를 업로드하고 요약을 완료하면
              챗봇이 참고할 수 있습니다.
            </p>
          ) : (
            <div className="max-h-40 overflow-y-auto space-y-2 pr-1 w-full">
              {hrDocuments.map((doc) => {
                const status = (doc.status || '').toUpperCase();
                const isComplete = status === 'COMPLETE';
                const checked = selectedDocIds.includes(doc.documentId);
                return (
                  <label
                    key={doc.documentId}
                    className={`flex w-full items-start gap-3 rounded-md border border-gray-200 bg-white p-3 text-sm ${
                      !isComplete ? 'opacity-60' : ''
                    }`}
                  >
                    <input
                      type="checkbox"
                      className="mt-1 !w-10"
                      disabled={!isComplete}
                      checked={checked}
                      onChange={() => handleDocumentToggle(doc.documentId)}
                    />
                    <div className="flex-1">
                      <p className="font-medium text-gray-800">
                        {doc.filename}
                      </p>
                      <p className="text-xs text-gray-500">
                        상태: {status || 'UNKNOWN'}
                        {doc.summaryText
                          ? ` · 요약: ${doc.summaryText.slice(0, 60)}${
                              doc.summaryText.length > 60 ? '…' : ''
                            }`
                          : ''}
                      </p>
                    </div>
                  </label>
                );
              })}
            </div>
          )}
          {selectedDocIds.length > 0 && (
            <p className="mt-2 text-xs text-gray-500">
              선택된 문서:{' '}
              {selectedDocIds
                .map(
                  (id) =>
                    hrDocuments.find((doc) => doc.documentId === id)
                      ?.filename || id
                )
                .join(', ')}
            </p>
          )}
        </section>
        <main ref={chatContainerRef} className="flex-grow p-6 overflow-y-auto">
          <div className="mb-4">
            {conversation.map((msg, index) => (
              <div
                key={index}
                className={`flex items-start gap-3 mb-2 ${
                  msg.role === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                {msg.role === 'ai' && (
                  <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center font-bold text-gray-600 shrink-0">
                    AI
                  </div>
                )}
                <div
                  className={`max-w-lg p-4 rounded-lg shadow-sm ${
                    msg.role === 'user'
                      ? 'bg-sky-500 text-white'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{msg.text}</p>
                  {msg.role === 'ai' &&
                    msg.sources &&
                    msg.sources.length > 0 && (
                      <div className="mt-3 border-t border-gray-200 pt-2">
                        <p className="text-xs font-semibold text-gray-500">
                          출처
                        </p>
                        <ul className="mt-1 space-y-1 text-xs text-gray-500">
                          {msg.sources.map((source, sourceIndex) => (
                            <li key={`${source.documentId}-${sourceIndex}`}>
                              {source.filename} (문서 ID: {source.documentId},
                              청크 {source.chunkIndex + 1})
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex items-start gap-3 justify-start mb-2">
                <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center font-bold text-gray-600 shrink-0">
                  AI
                </div>
                <div className="max-w-lg p-4 rounded-lg shadow-sm bg-gray-100 text-gray-800">
                  <p className="animate-pulse">답변을 생성 중입니다...</p>
                </div>
              </div>
            )}
          </div>
        </main>
        <footer className="p-4 border-t bg-gray-50">
          <form onSubmit={handleSubmit} className="flex gap-3">
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder="메시지를 입력하세요..."
              className="flex-grow p-3 border rounded-lg text-gray-800 focus:ring-2 focus:ring-sky-500 transition"
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={isLoading || selectedDocIds.length === 0}
              className="bg-sky-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-sky-700 disabled:bg-gray-400 transition-colors"
            >
              전송
            </button>
          </form>
        </footer>
      </div>
      {isUploadModalOpen && (
        <HrDocumentUploadModal
          onClose={() => setIsUploadModalOpen(false)}
          onRefresh={refreshDocuments}
          documents={hrDocuments}
          isLoadingList={isLoadingDocuments}
        />
      )}
    </Layout>
  );
}
