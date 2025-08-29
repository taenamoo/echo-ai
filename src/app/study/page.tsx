'use client';

import { useState, useEffect, FormEvent, useRef, MouseEvent, TouchEvent } from 'react';
import axios from 'axios';
import './study.css'; // CSS 파일 임포트

// 스터디 데이터의 타입 구조를 정의합니다.
interface Study {
  study_id: string;
  title: string;
  content: string;
  good_example: string;
  bad_example: string;
  study_order: number;
  parent_id: string | null;
  ai_suggestion?: string;
  children?: Study[];
  [key: string]: any;
}

// 메인 컨텐츠 영역에 표시될 뷰의 종류를 정의합니다. (상세보기, 생성, 수정)
type ViewMode = 'detail' | 'create' | 'edit';

// ============================================================================
// AI 검색 버튼 및 채팅 모달 컴포넌트
// ============================================================================
const AiSearchButton = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState({ x: window.innerWidth - 80, y: window.innerHeight - 80 });
  const [isDragging, setIsDragging] = useState(false);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [searchTerm, setSearchTerm] = useState('');
  const [conversation, setConversation] = useState<{ role: 'user' | 'ai', text: string }[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const accessToken = localStorage.getItem('accessToken');

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [conversation]);

  const handleSearch = async (e: FormEvent) => {
    e.preventDefault();
    if (!searchTerm.trim() || !accessToken || isSearching) return;
    
    const userMessage = { role: 'user' as const, text: searchTerm };
    setConversation(prev => [...prev, userMessage]);
    setSearchTerm('');
    setIsSearching(true);

    try {
      const { data } = await axios.post('/api/study/search', 
        { searchTerm: userMessage.text },
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      const aiMessage = { role: 'ai' as const, text: data.result };
      setConversation(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error("AI search failed", error);
      const errorMessage = { role: 'ai' as const, text: '검색 중 오류가 발생했습니다.' };
      setConversation(prev => [...prev, errorMessage]);
    } finally {
      setIsSearching(false);
    }
  };
  
  const handleMouseDown = (e: MouseEvent<HTMLButtonElement>) => {
    if (buttonRef.current) {
      setIsDragging(true);
      const rect = buttonRef.current.getBoundingClientRect();
      setOffset({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    }
  };
  
  const handleTouchStart = (e: TouchEvent<HTMLButtonElement>) => {
     if (buttonRef.current) {
      setIsDragging(true);
      const rect = buttonRef.current.getBoundingClientRect();
      const touch = e.touches[0];
      setOffset({ x: touch.clientX - rect.left, y: touch.clientY - rect.top });
    }
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (isDragging) {
      e.preventDefault();
      setPosition({ x: e.clientX - offset.x, y: e.clientY - offset.y });
    }
  };

  const handleTouchMove = (e: TouchEvent) => {
     if (isDragging) {
      e.preventDefault();
      const touch = e.touches[0];
      setPosition({ x: touch.clientX - offset.x, y: touch.clientY - offset.y });
    }
  }

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleDoubleClick = () => {
    setIsOpen(true);
    setConversation([]);
    setSearchTerm('');
  };

  useEffect(() => {
    const handleGlobalMouseMove = (e: globalThis.MouseEvent) => handleMouseMove(e as unknown as MouseEvent);
    const handleGlobalTouchMove = (e: globalThis.TouchEvent) => handleTouchMove(e as unknown as TouchEvent);
    const handleGlobalMouseUp = () => handleMouseUp();
    
    if (isDragging) {
      window.addEventListener('mousemove', handleGlobalMouseMove);
      window.addEventListener('touchmove', handleGlobalTouchMove);
      window.addEventListener('mouseup', handleGlobalMouseUp);
      window.addEventListener('touchend', handleGlobalMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleGlobalMouseMove);
      window.removeEventListener('touchmove', handleGlobalTouchMove);
      window.removeEventListener('mouseup', handleGlobalMouseUp);
      window.removeEventListener('touchend', handleGlobalMouseUp);
    };
  }, [isDragging, offset]);

  return (
    <>
      <button
        ref={buttonRef}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        onMouseUp={handleMouseUp}
        onTouchEnd={handleMouseUp}
        onDoubleClick={handleDoubleClick}
        className="fixed z-50 w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 text-white rounded-full flex items-center justify-center shadow-lg shadow-indigo-500/50 animate-pulse cursor-grab active:cursor-grabbing"
        style={{ left: `${position.x}px`, top: `${position.y}px` }}
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
        </svg>
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-40 flex items-center justify-center" onClick={() => setIsOpen(false)}>
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl h-3/4 flex flex-col" onClick={e => e.stopPropagation()}>
            <header className="p-4 border-b flex justify-between items-center">
              <h3 className="text-xl font-bold text-gray-800">AI 스터디 검색</h3>
              <button onClick={() => setIsOpen(false)} className="text-gray-500 hover:text-gray-800">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </header>
            <div ref={chatContainerRef} className="flex-grow p-6 overflow-y-auto space-y-4">
              {conversation.map((msg, index) => (
                <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-lg p-3 rounded-lg ${msg.role === 'user' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-black'}`}>
                    <p className="whitespace-pre-wrap" dangerouslySetInnerHTML={{ __html: msg.text.replace(/### (.*)/g, '<h3 class="font-bold text-lg mb-2">$1</h3>') }}></p>
                  </div>
                </div>
              ))}
              {isSearching && (
                 <div className="flex justify-start">
                   <div className="max-w-lg p-3 rounded-lg bg-gray-200 text-black">
                     <p className="animate-pulse">AI가 답변을 생성 중입니다...</p>
                   </div>
                 </div>
              )}
            </div>
            <footer className="p-4 border-t">
              <form onSubmit={handleSearch} className="flex gap-2">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  placeholder="궁금한 것을 질문해보세요..."
                  className="flex-grow p-2 border rounded text-black"
                  disabled={isSearching}
                />
                <button type="submit" disabled={isSearching} className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 disabled:bg-gray-400">
                  전송
                </button>
              </form>
            </footer>
          </div>
        </div>
      )}
    </>
  );
};


// ============================================================================
// 스터디 페이지 메인 컴포넌트
// ============================================================================
export default function StudyPage() {
  const [studies, setStudies] = useState<Study[]>([]);
  const [selectedStudy, setSelectedStudy] = useState<Study | null>(null);
  const [mode, setMode] = useState<ViewMode>('create');
  const [isLoading, setIsLoading] = useState(true);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [formParentId, setFormParentId] = useState<string | null>(null);

  // [수정] studyIdToSelect 파라미터를 추가하여, 데이터 로딩 후 특정 노드를 선택하도록 변경
  const fetchStudies = async (token: string, studyIdToSelect?: string) => {
    try {
      setIsLoading(true);
      const { data } = await axios.get('/api/study', { headers: { Authorization: `Bearer ${token}` } });
      const sortStudies = (items: Study[]): Study[] => {
        items.sort((a, b) => a.study_order - b.study_order);
        items.forEach(item => {
          if (item.children && item.children.length > 0) item.children = sortStudies(item.children);
        });
        return items;
      };
      const sortedStudies = sortStudies(data);
      setStudies(sortedStudies);

      let studyToSelect: Study | null = null;
      // 선택할 ID가 지정된 경우, 전체 목록에서 해당 노드를 찾습니다.
      if (studyIdToSelect) {
        const findStudy = (items: Study[]): Study | null => {
            for (const item of items) {
                if (item.study_id === studyIdToSelect) return item;
                if (item.children) {
                    const found = findStudy(item.children);
                    if (found) return found;
                }
            }
            return null;
        }
        studyToSelect = findStudy(sortedStudies);
      }

      if (studyToSelect) {
        setSelectedStudy(studyToSelect);
      } else if (sortedStudies.length > 0) {
        // 선택할 ID가 없으면 기본적으로 첫 번째 항목을 선택합니다.
        const firstItem = sortedStudies[0].children && sortedStudies[0].children.length > 0 ? sortedStudies[0].children[0] : sortedStudies[0];
        setSelectedStudy(firstItem);
      } else {
        // 데이터가 없으면 생성 모드로 전환합니다.
        setSelectedStudy(null);
        setMode('create');
        setFormParentId(null);
      }
      setMode('detail'); // 항상 상세 보기 모드로 시작
    } catch (error) { console.error("Failed to fetch studies", error); } 
    finally { setIsLoading(false); }
  };

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) { window.location.href = window.location.origin; } 
    else { setAccessToken(token); fetchStudies(token); }
  }, []);

  const handleSelectStudy = (study: Study) => {
    setSelectedStudy(study);
    setMode('detail');
  };

  const handleAddNew = (parentId: string | null = null) => {
    setSelectedStudy(null);
    setFormParentId(parentId);
    setMode('create');
  };

  const handleDelete = async (study: Study) => {
    const message = study.parent_id ? `"${study.title}" 항목을 삭제하시겠습니까?` : `상위 메뉴 "${study.title}"와 모든 하위 메뉴를 삭제하시겠습니까?`;
    if (window.confirm(message) && accessToken) {
      try {
        await axios.delete(`/api/study/${study.study_id}`, { headers: { Authorization: `Bearer ${accessToken}` } });
        await fetchStudies(accessToken);
      } catch (error) { alert('삭제에 실패했습니다.'); }
    }
  };

  const StudyForm = ({ study, parentId, onSave, onCancel }: { study: Partial<Study> | null, parentId: string | null, onSave: (savedStudy: Study) => void, onCancel: () => void }) => {
    const isSubMenu = !!parentId || !!study?.parent_id;
    const [formData, setFormData] = useState({
      title: study?.title || '',
      content: study?.content || '',
      good_example: study?.good_example || '',
      bad_example: study?.bad_example || '',
      study_order: study?.study_order || studies.length + 1,
      parent_id: parentId || study?.parent_id || null,
    });
    const [isAnalyzing, setIsAnalyzing] = useState(false);

    const handleSubmit = async (e: FormEvent) => {
      e.preventDefault();
      if (!accessToken) return;

      const url = study?.study_id ? `/api/study/${study.study_id}` : '/api/study';
      const method = study?.study_id ? 'put' : 'post';

      try {
        const { data: savedStudy } = await axios[method](url, formData, { headers: { Authorization: `Bearer ${accessToken}` } });
        
        if (isSubMenu) {
          setIsAnalyzing(true);
          const { data: analyzeData } = await axios.post('/api/study/analyze', formData, { headers: { Authorization: `Bearer ${accessToken}` } });
          
          const finalData = { ...savedStudy, ai_suggestion: analyzeData.suggestion };
          await axios.put(`/api/study/${savedStudy.study_id}`, finalData, { headers: { Authorization: `Bearer ${accessToken}` } });
          onSave(finalData);
        } else {
          onSave(savedStudy);
        }
      } catch (error) {
        alert('저장에 실패했습니다.');
      } finally {
        setIsAnalyzing(false);
      }
    };

    return (
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="form-group">
          <label htmlFor="title">제목</label>
          <input id="title" type="text" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} disabled={isSubMenu && !!study} className="form-input" required />
        </div>
        {isSubMenu && (
          <>
            <div className="form-group">
              <label htmlFor="content">내용</label>
              <textarea id="content" value={formData.content} onChange={e => setFormData({...formData, content: e.target.value})} className="form-textarea h-24"></textarea>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="form-group">
                <label htmlFor="good_example">좋은 예시</label>
                <textarea id="good_example" value={formData.good_example} onChange={e => setFormData({...formData, good_example: e.target.value})} className="form-textarea h-40"></textarea>
              </div>
              <div className="form-group">
                <label htmlFor="bad_example">나쁜 예시</label>
                <textarea id="bad_example" value={formData.bad_example} onChange={e => setFormData({...formData, bad_example: e.target.value})} className="form-textarea h-40"></textarea>
              </div>
            </div>
          </>
        )}
        <div className="form-group">
          <label htmlFor="study_order">순서</label>
          <input id="study_order" type="number" value={formData.study_order} onChange={e => setFormData({...formData, study_order: Number(e.target.value)})} className="form-input" required />
        </div>
        <div className="flex gap-4 pt-4">
          <button type="button" onClick={onCancel} className="btn btn-secondary w-full">취소</button>
          <button type="submit" disabled={isAnalyzing} className="btn btn-primary w-full">
            {isAnalyzing ? 'AI 분석 중...' : (study?.study_id ? '수정하기' : '등록하기')}
          </button>
        </div>
      </form>
    );
  };
  
  if (isLoading || !accessToken) return <div className="flex h-screen items-center justify-center">로딩 중...</div>;

  return (
    <>
      <div className="study-container">
        <aside className="sidebar">
          <h2 className="sidebar-header">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v11.494m-9-5.747h18" /></svg>
            스터디 목록
          </h2>
          <nav>
            {studies.map(mainMenu => (
              <div key={mainMenu.study_id} className="mb-1">
                <div className={`menu-item ${selectedStudy?.study_id === mainMenu.study_id ? 'active' : ''}`}>
                  <a onClick={() => handleSelectStudy(mainMenu)} className="flex-grow">{mainMenu.title}</a>
                  <div className="menu-item-actions">
                    <button onClick={(e) => { e.stopPropagation(); handleAddNew(mainMenu.study_id); }} className="btn-icon text-blue-500">+</button>
                    <button onClick={(e) => { e.stopPropagation(); handleDelete(mainMenu); }} className="btn-icon text-red-500">x</button>
                  </div>
                </div>
                {mainMenu.children && mainMenu.children.length > 0 && (
                  <div className="submenu-container">
                    {mainMenu.children.map(subMenu => (
                       <div key={subMenu.study_id} className={`menu-item submenu-item ${selectedStudy?.study_id === subMenu.study_id ? 'active' : ''}`}>
                        <a onClick={() => handleSelectStudy(subMenu)} className="flex-grow">- {subMenu.title}</a>
                         <div className="menu-item-actions">
                           <button onClick={(e) => { e.stopPropagation(); handleDelete(subMenu); }} className="btn-icon text-red-500">x</button>
                         </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </nav>
          <button onClick={() => handleAddNew(null)} className="btn btn-success w-full mt-6">+ 새 상위 메뉴</button>
        </aside>

        <main className="main-content">
          {mode === 'detail' && selectedStudy && (
            <div className="content-card">
              <div className="card-header">
                <h1 className="card-title">{selectedStudy.title}</h1>
                <button onClick={() => setMode('edit')} className="btn btn-warning">수정</button>
              </div>
              
              <div className="detail-section content-section">
                <div className="detail-section-header">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                  <span>내용</span>
                </div>
                <div className="detail-section-content">
                  {selectedStudy.content || "등록된 내용이 없습니다."}
                </div>
              </div>

              {selectedStudy.parent_id && (
                <>
                  <div className="example-grid mt-8">
                    <div className="detail-section good-example">
                       <div className="detail-section-header">
                         <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.085a2 2 0 00-1.736.97l-1.9 4.222M7 20v-5.555M7 20H3a2 2 0 01-2-2v-4a2 2 0 012-2h4" /></svg>
                         <span>좋은 예시</span>
                       </div>
                       <pre className="detail-section-content">{selectedStudy.good_example}</pre>
                    </div>
                    <div className="detail-section bad-example">
                       <div className="detail-section-header">
                         <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14H5.236a2 2 0 01-1.789-2.894l3.5-7A2 2 0 018.738 3h4.017c.163 0 .326.02.485.06L17 4m-7 10v5.555m7-5.555v-5.555M17 4H3a2 2 0 00-2 2v4a2 2 0 002 2h4" /></svg>
                         <span>나쁜 예시</span>
                       </div>
                       <pre className="detail-section-content">{selectedStudy.bad_example}</pre>
                    </div>
                  </div>
                  {selectedStudy.ai_suggestion && (
                    <div className="detail-section ai-suggestion mt-8">
                      <div className="detail-section-header">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>
                        <span>AI 추가의견</span>
                      </div>
                      <p className="detail-section-content">{selectedStudy.ai_suggestion}</p>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {(mode === 'create' || mode === 'edit') && (
            <div className="content-card">
              <h1 className="card-title mb-6">
                {mode === 'create' ? (formParentId ? '새 하위 메뉴 등록' : '새 상위 메뉴 등록') : `"${selectedStudy?.title}" 수정`}
              </h1>
              <StudyForm 
                study={mode === 'edit' ? selectedStudy : null} 
                parentId={formParentId} 
                onSave={(savedStudy) => { 
                  // [수정] onSave 콜백에서 study_id를 전달하여 fetchStudies가 해당 항목을 선택하도록 함
                  fetchStudies(accessToken!, savedStudy.study_id); 
                }}
                onCancel={() => {
                  if (selectedStudy) setMode('detail');
                  else handleAddNew(null);
                }}
              />
            </div>
          )}
        </main>
        
        <AiSearchButton />
      </div>
    </>
  );
}
