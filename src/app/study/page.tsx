'use client';

import { useState, useEffect, FormEvent, useRef, MouseEvent, TouchEvent } from 'react';
import axios from 'axios';
import LearningRoadmap from './learningRoadmap';
import ConceptModal from './conceptModal';

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
  reference_links?: string[];
  [key: string]: any;
}

// 퀴즈 데이터 타입을 정의합니다.
interface Quiz {
  question: string;
  options: string[];
  answer: string;
  explanation: string;
}

// 메인 컨텐츠 영역에 표시될 뷰의 종류를 정의합니다. (상세보기, 생성, 수정)
type ViewMode = 'detail' | 'create' | 'edit';
type ActiveTab = 'studyNote' | 'roadmap';

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
        className="fixed z-50 w-16 h-16 bg-gradient-to-br from-sky-500 to-indigo-600 text-white rounded-full flex items-center justify-center shadow-lg shadow-sky-500/50 animate-pulse cursor-grab active:cursor-grabbing"
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
                  <div className={`max-w-lg p-3 rounded-lg ${msg.role === 'user' ? 'bg-sky-500 text-white' : 'bg-gray-100 text-gray-800'}`}>
                    <p className="whitespace-pre-wrap" dangerouslySetInnerHTML={{ __html: msg.text.replace(/### (.*)/g, '<h3 class="font-bold text-lg mb-2">$1</h3>') }}></p>
                  </div>
                </div>
              ))}
              {isSearching && (
                 <div className="flex justify-start">
                   <div className="max-w-lg p-3 rounded-lg bg-gray-100 text-gray-800">
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
                  className="flex-grow p-2 border rounded-md text-gray-800 focus:ring-2 focus:ring-sky-500"
                  disabled={isSearching}
                />
                <button type="submit" disabled={isSearching} className="bg-sky-600 text-white px-4 py-2 rounded-md hover:bg-sky-700 disabled:bg-gray-400 transition-colors">
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
  const [mode, setMode] = useState<ViewMode>('detail');
  const [isLoading, setIsLoading] = useState(true);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [formParentId, setFormParentId] = useState<string | null>(null);
  const [isQuizModalOpen, setIsQuizModalOpen] = useState(false);
  const [quizData, setQuizData] = useState<Quiz[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [isAnswerChecked, setIsAnswerChecked] = useState(false);
  const [isGeneratingQuiz, setIsGeneratingQuiz] = useState(false);
  const [activeTab, setActiveTab] = useState<ActiveTab>('studyNote');
  const [isConceptModalOpen, setIsConceptModalOpen] = useState(false);
  const [conceptInfo, setConceptInfo] = useState({ url: '', title: '' });


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
        const firstItem = sortedStudies[0].children && sortedStudies[0].children.length > 0 ? sortedStudies[0].children[0] : sortedStudies[0];
        setSelectedStudy(firstItem);
      } else {
        setSelectedStudy(null);
        setMode('create');
        setFormParentId(null);
      }
      if (!studyIdToSelect) {
          setMode('detail');
      }
    } catch (error) { console.error("Failed to fetch studies", error); } 
    finally { setIsLoading(false); }
  };

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) { window.location.href = window.location.origin; } 
    else { setAccessToken(token); fetchStudies(token); }
  }, []);

  const handleOpenConceptModal = (url: string, title: string) => {
    setConceptInfo({ url, title });
    setIsConceptModalOpen(true);
  };

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
        await fetchStudies(accessToken, studies.length > 1 ? studies[0].study_id : undefined);
      } catch (error) { alert('삭제에 실패했습니다.'); }
    }
  };
  
  const handleGenerateQuiz = async () => {
    if (!selectedStudy || !accessToken) return;
    setIsGeneratingQuiz(true);
    setQuizData([]);
    setCurrentQuestionIndex(0);
    setSelectedAnswer(null);
    setIsAnswerChecked(false);
    setIsQuizModalOpen(true);
    try {
      const { data } = await axios.post('/api/study/quiz', {
        content: selectedStudy.content,
        count: 3
      }, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      setQuizData(data.quiz || []);
    } catch (error) {
      console.error("Quiz generation failed", error);
      setQuizData([]);
    } finally {
      setIsGeneratingQuiz(false);
    }
  };

  const handleAnswerCheck = () => {
    setIsAnswerChecked(true);
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < quizData.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
      setSelectedAnswer(null);
      setIsAnswerChecked(false);
    }
  };
  
  const handleRetryQuiz = () => {
      setSelectedAnswer(null);
      setIsAnswerChecked(false);
  };

  const handleLogout = () => {
    localStorage.removeItem('accessToken');
    window.location.href = '/';
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
      reference_links: study?.reference_links || [],
    });
    const [newLink, setNewLink] = useState('');
    const [isAnalyzing, setIsAnalyzing] = useState(false);

    const handleAddLink = () => {
        if (newLink && !formData.reference_links.includes(newLink)) {
            setFormData(prev => ({ ...prev, reference_links: [...prev.reference_links, newLink] }));
            setNewLink('');
        }
    };

    const handleRemoveLink = (linkToRemove: string) => {
        setFormData(prev => ({ ...prev, reference_links: prev.reference_links.filter(link => link !== linkToRemove) }));
    };

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

    const FormInput = ({ id, label, ...props }: any) => (
        <div>
            <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
            <input id={id} {...props} className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition" />
        </div>
    );
    const FormTextarea = ({ id, label, ...props }: any) => (
         <div>
            <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
            <textarea id={id} {...props} className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition h-24" />
        </div>
    );

    return (
      <form onSubmit={handleSubmit} className="space-y-6">
        <FormInput id="title" label="제목" type="text" value={formData.title} onChange={(e:any) => setFormData({...formData, title: e.target.value})} disabled={isSubMenu && !!study} required />
        
        {isSubMenu && (
          <>
            <FormTextarea id="content" label="내용" value={formData.content} onChange={(e:any) => setFormData({...formData, content: e.target.value})} />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormTextarea id="good_example" label="좋은 예시" value={formData.good_example} onChange={(e:any) => setFormData({...formData, good_example: e.target.value})} className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition h-40" />
                <FormTextarea id="bad_example" label="나쁜 예시" value={formData.bad_example} onChange={(e:any) => setFormData({...formData, bad_example: e.target.value})} className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition h-40" />
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">참고 링크</label>
                <div className="flex gap-2">
                    <input type="url" value={newLink} onChange={e => setNewLink(e.target.value)} placeholder="https://..." className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition"/>
                    <button type="button" onClick={handleAddLink} className="bg-sky-500 text-white font-semibold py-2 px-4 rounded-lg hover:bg-sky-600 transition-colors shrink-0">추가</button>
                </div>
                <ul className="mt-2 space-y-1">
                    {formData.reference_links.map((link, index) => (
                        <li key={index} className="flex items-center justify-between text-sm bg-gray-50 p-2 rounded-md">
                            <a href={link} target="_blank" rel="noopener noreferrer" className="text-sky-600 truncate hover:underline">{link}</a>
                            <button type="button" onClick={() => handleRemoveLink(link)} className="text-red-500 font-bold ml-2">x</button>
                        </li>
                    ))}
                </ul>
            </div>
          </>
        )}
        <FormInput id="study_order" label="순서" type="number" value={formData.study_order} onChange={(e:any) => setFormData({...formData, study_order: Number(e.target.value)})} required />
        <div className="flex gap-4 pt-4 border-t mt-6">
          <button type="button" onClick={onCancel} className="w-full bg-gray-200 text-gray-800 font-bold py-3 px-4 rounded-lg hover:bg-gray-300 transition-colors">취소</button>
          <button type="submit" disabled={isAnalyzing} className="w-full bg-sky-500 text-white font-bold py-3 px-4 rounded-lg hover:bg-sky-600 transition-colors disabled:bg-gray-400">
            {isAnalyzing ? 'AI 분석 중...' : (study?.study_id ? '수정하기' : '등록하기')}
          </button>
        </div>
      </form>
    );
  };
  
  if (isLoading || !accessToken) return <div className="flex h-screen items-center justify-center bg-gray-100 text-gray-600">로딩 중...</div>;

  return (
    <>
      <div className="flex flex-col h-screen bg-gray-100 font-sans">
        <header className="bg-white shadow-sm sticky top-0 z-20">
            <div className="container mx-auto px-4">
                <div className="flex justify-between items-center py-3">
                    <div className="flex items-center gap-2">
                        <svg className="w-8 h-8 text-sky-500" viewBox="0 0 1200 1200" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <g clipPath="url(#clip0_3_2)"><path d="M1200 600C1200 931.371 931.371 1200 600 1200C268.629 1200 0 931.371 0 600C0 268.629 268.629 0 600 0C931.371 0 1200 268.629 1200 600Z" fill="#61DAFB"/><path d="M600 1200C542.839 1200 488.199 1184.22 439.199 1154.52C425.138 1146.91 409.781 1148.91 398.026 1159.18C339.062 1210.05 268.629 1200 268.629 1200C268.629 1200 339.062 1110.05 398.026 1059.18C409.781 1048.91 425.138 1046.91 439.199 1054.52C488.199 1084.22 542.839 1100 600 1100C765.685 1100 900 965.685 900 800C900 634.315 765.685 500 600 500C434.315 500 300 634.315 300 800C300 965.685 434.315 1100 600 1100V1200Z" fill="#000000" fillOpacity="0.2"/><path d="M936.425 455.344C848.75 322.219 705.813 250 550 250C487.688 250 427.656 261.219 371.188 282.094L440.031 396.125C474.5 382.5 511.406 375 550 375C635.031 375 714.594 406.469 771.75 460.844L936.425 455.344ZM263.575 744.656C351.25 877.781 494.187 950 650 950C712.312 950 772.344 938.781 828.812 917.906L759.969 803.875C725.5 817.5 688.594 825 650 825C564.969 825 485.406 793.531 428.25 739.156L263.575 744.656ZM455.344 263.575L396.125 440.031C382.5 474.5 375 511.406 375 550C375 635.031 406.469 714.594 460.844 771.75L455.344 936.425C322.219 848.75 250 705.813 250 550C250 487.688 261.219 427.656 282.094 371.188L455.344 263.575ZM917.906 371.188L803.875 440.031C817.5 474.5 825 511.406 825 550C825 635.031 793.531 714.594 739.156 771.75L744.656 936.425C877.781 848.75 950 705.813 950 550C950 487.688 938.781 427.656 917.906 371.188Z" fill="#20232A"/></g><defs><clipPath id="clip0_3_2"><rect width="1200" height="1200" fill="white" /></clipPath></defs>
                        </svg>
                        <h1 className="text-xl font-bold text-gray-800">React 스터디</h1>
                    </div>
                    <div>
                        <button onClick={() => window.location.href='/documents'} className="text-gray-700 hover:bg-gray-100 py-2 px-4 rounded-md transition text-sm font-semibold mr-2">
                        AI 문서 요약
                        </button>
                        <button onClick={handleLogout} className="bg-red-500 text-white py-2 px-4 rounded-md hover:bg-red-600 transition text-sm font-semibold">
                        로그아웃
                        </button>
                    </div>
                </div>
                <div className="border-b border-gray-200">
                    <nav className="-mb-px flex space-x-8 px-4" aria-label="Tabs">
                        <button
                            onClick={() => setActiveTab('studyNote')}
                            className={`${activeTab === 'studyNote' ? 'border-sky-500 text-sky-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                        >
                            스터디 노트
                        </button>
                        <button
                            onClick={() => setActiveTab('roadmap')}
                            className={`${activeTab === 'roadmap' ? 'border-sky-500 text-sky-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                        >
                            학습 로드맵
                        </button>
                    </nav>
                </div>
            </div>
        </header>

        <div className="flex-grow overflow-auto">
            {activeTab === 'studyNote' && (
              <div className="flex h-full">
                  <aside className="w-1/4 min-w-[280px] bg-white p-6 overflow-y-auto border-r border-gray-200">
                      <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
                          스터디 목록
                      </h2>
                      <nav className="space-y-1">
                          {studies.map(mainMenu => (
                          <div key={mainMenu.study_id}>
                              <div className={`group flex justify-between items-center p-2 rounded-md cursor-pointer transition-colors ${selectedStudy?.study_id === mainMenu.study_id ? 'bg-sky-100 text-sky-700' : 'text-gray-700 hover:bg-gray-100'}`} onClick={() => handleSelectStudy(mainMenu)}>
                                  <span className="font-semibold text-sm">{mainMenu.title}</span>
                                  <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                                      <button onClick={(e) => { e.stopPropagation(); handleAddNew(mainMenu.study_id); }} className="text-sky-500 hover:bg-sky-100 p-1 rounded-full">+</button>
                                      <button onClick={(e) => { e.stopPropagation(); handleDelete(mainMenu); }} className="text-red-500 hover:bg-red-100 p-1 rounded-full">x</button>
                                  </div>
                              </div>
                              {mainMenu.children && mainMenu.children.length > 0 && (
                              <div className="ml-4 mt-1 pl-2 border-l-2 border-gray-200 space-y-1">
                                  {mainMenu.children.map(subMenu => (
                                  <div key={subMenu.study_id} className={`group flex justify-between items-center p-2 rounded-md cursor-pointer transition-colors text-sm ${selectedStudy?.study_id === subMenu.study_id ? 'bg-sky-100 text-sky-700' : 'text-gray-600 hover:bg-gray-100'}`} onClick={() => handleSelectStudy(subMenu)}>
                                      <span>{subMenu.title}</span>
                                      <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                      <button onClick={(e) => { e.stopPropagation(); handleDelete(subMenu); }} className="text-red-500 hover:bg-red-100 p-1 rounded-full">x</button>
                                      </div>
                                  </div>
                                  ))}
                              </div>
                              )}
                          </div>
                          ))}
                      </nav>
                      <button onClick={() => handleAddNew(null)} className="w-full mt-6 bg-sky-500 text-white font-bold py-2 px-4 rounded-lg hover:bg-sky-600 transition-colors text-sm">+ 새 상위 메뉴</button>
                  </aside>

                  <main className="flex-grow p-4 sm:p-6 md:p-8 overflow-y-auto">
                  {(mode === 'detail' && selectedStudy) && (
                      <div className="bg-white p-6 sm:p-8 rounded-lg shadow-lg">
                          <div className="flex justify-between items-center mb-6 pb-6 border-b">
                              <h1 className="text-3xl font-bold text-gray-800">{selectedStudy.title}</h1>
                              <div className="flex gap-2">
                                  {selectedStudy.parent_id && (
                                  <button onClick={handleGenerateQuiz} className="bg-sky-500 text-white font-semibold py-2 px-4 rounded-lg hover:bg-sky-600 transition-colors">AI 퀴즈 풀기</button>
                                  )}
                                  <button onClick={() => setMode('edit')} className="bg-yellow-400 text-white font-semibold py-2 px-4 rounded-lg hover:bg-yellow-500 transition-colors">수정</button>
                              </div>
                          </div>
                          
                          <div className="mb-8">
                              <h3 className="font-bold text-lg mb-2 text-gray-700 flex items-center gap-2">
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                  내용
                              </h3>
                              <div 
                                  className="prose max-w-none text-gray-600 leading-relaxed bg-gray-50 p-4 rounded-md"
                                  dangerouslySetInnerHTML={{ __html: (selectedStudy.content || "등록된 내용이 없습니다.").replace(/\n/g, '<br />') }} 
                              />
                          </div>

                          {selectedStudy.parent_id && (
                              <>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
                                  <div>
                                      <h3 className="font-bold text-lg mb-2 text-green-600 flex items-center gap-2">
                                          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.085a2 2 0 00-1.736.97l-1.9 4.222M7 20v-5.555M7 20H3a2 2 0 01-2-2v-4a2 2 0 012-2h4" /></svg>
                                          좋은 예시
                                      </h3>
                                      <pre className="bg-gray-800 text-white p-4 rounded-lg text-sm overflow-x-auto"><code>{selectedStudy.good_example}</code></pre>
                                  </div>
                                  <div>
                                      <h3 className="font-bold text-lg mb-2 text-red-600 flex items-center gap-2">
                                          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14H5.236a2 2 0 01-1.789-2.894l3.5-7A2 2 0 018.738 3h4.017c.163 0 .326.02.485.06L17 4m-7 10v5.555m7-5.555v-5.555M17 4H3a2 2 0 00-2 2v4a2 2 0 002 2h4" /></svg>
                                          나쁜 예시
                                      </h3>
                                      <pre className="bg-gray-800 text-white p-4 rounded-lg text-sm overflow-x-auto"><code>{selectedStudy.bad_example}</code></pre>
                                  </div>
                              </div>
                              {selectedStudy.ai_suggestion && (
                                  <div className="mt-8">
                                      <h3 className="font-bold text-lg mb-2 text-sky-600 flex items-center gap-2">
                                          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>
                                          AI 추가의견
                                      </h3>
                                      <div 
                                          className="prose max-w-none text-gray-600 leading-relaxed bg-sky-50 p-4 rounded-md"
                                          dangerouslySetInnerHTML={{ __html: selectedStudy.ai_suggestion.replace(/\n/g, '<br />') }} 
                                      />
                                  </div>
                              )}
                              <div className="mt-8">
                                  <h3 className="font-bold text-lg mb-2 text-gray-700">🔗 참고 링크</h3>
                                  <div className="text-gray-600">
                                      {(selectedStudy.reference_links && selectedStudy.reference_links.length > 0) ? (
                                      <ul className="list-disc pl-5 space-y-2">
                                          {selectedStudy.reference_links.map((link: string, index: number) => (
                                          <li key={index}>
                                              <a href={link} target="_blank" rel="noopener noreferrer" className="text-sky-600 hover:underline">{link}</a>
                                          </li>
                                          ))}
                                      </ul>
                                      ) : "등록된 링크가 없습니다."}
                                  </div>
                              </div>
                              </>
                          )}
                      </div>
                  )}

                  {(mode === 'create' || mode === 'edit') && (
                      <div className="bg-white p-6 sm:p-8 rounded-lg shadow-lg">
                      <h1 className="text-3xl font-bold text-gray-800 mb-6 pb-6 border-b">
                          {mode === 'create' ? (formParentId ? '새 하위 메뉴 등록' : '새 상위 메뉴 등록') : `"${selectedStudy?.title}" 수정`}
                      </h1>
                      <StudyForm 
                          study={mode === 'edit' ? selectedStudy : null} 
                          parentId={formParentId} 
                          onSave={(savedStudy) => { 
                              fetchStudies(accessToken!, savedStudy.study_id); 
                          }}
                          onCancel={() => {
                              if (selectedStudy) setMode('detail');
                              else {
                                  setMode('detail');
                                  if(studies.length > 0) setSelectedStudy(studies[0]);
                              }
                          }}
                      />
                      </div>
                  )}
                  </main>
              </div>
            )}
            {activeTab === 'roadmap' && <LearningRoadmap onConceptClick={handleOpenConceptModal} />}
        </div>
      </div>
      
      <AiSearchButton />

      <ConceptModal 
        isOpen={isConceptModalOpen}
        onClose={() => setIsConceptModalOpen(false)}
        url={conceptInfo.url}
        title={conceptInfo.title}
      />

      {isQuizModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center p-4" onClick={() => setIsQuizModalOpen(false)}>
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl" onClick={e => e.stopPropagation()}>
            <header className="p-4 border-b flex justify-between items-center">
              <h3 className="text-xl font-bold text-gray-800">AI 생성 퀴즈</h3>
              <button onClick={() => setIsQuizModalOpen(false)} className="text-gray-500 hover:text-gray-800">X</button>
            </header>
            <div className="p-6 max-h-[70vh] overflow-y-auto">
              {isGeneratingQuiz ? (
                <p>퀴즈를 생성 중입니다...</p>
              ) : quizData.length > 0 ? (
                <div>
                  <h4 className="font-bold text-lg mb-4">{`문제 ${currentQuestionIndex + 1}. ${quizData[currentQuestionIndex].question}`}</h4>
                  <div className="space-y-3 mb-4">
                    {quizData[currentQuestionIndex].options.map((option, index) => {
                      const isCorrect = option === quizData[currentQuestionIndex].answer;
                      const isSelected = option === selectedAnswer;
                      let buttonClass = "w-full p-3 text-left border rounded-lg transition-colors";
                      if (isAnswerChecked) {
                        if (isCorrect) {
                          buttonClass += " bg-green-200 border-green-400";
                        } else if (isSelected && !isCorrect) {
                          buttonClass += " bg-red-200 border-red-400";
                        }
                      } else if (isSelected) {
                        buttonClass += " bg-sky-100 border-sky-300";
                      }
                      return (
                        <button key={index} onClick={() => !isAnswerChecked && setSelectedAnswer(option)} disabled={isAnswerChecked} className={buttonClass}>
                          {option}
                        </button>
                      );
                    })}
                  </div>
                  {isAnswerChecked && (
                    <div className="p-3 bg-gray-100 rounded-lg text-sm">
                      <p><strong>정답:</strong> {quizData[currentQuestionIndex].answer}</p>
                      <p><strong>해설:</strong> {quizData[currentQuestionIndex].explanation}</p>
                    </div>
                  )}
                </div>
              ) : (
                <p>퀴즈를 불러오지 못했습니다.</p>
              )}
            </div>
            <footer className="p-4 border-t flex justify-end gap-2">
                {!isAnswerChecked ? (
                    <button onClick={handleAnswerCheck} disabled={!selectedAnswer} className="bg-sky-500 text-white font-semibold py-2 px-4 rounded-lg hover:bg-sky-600 transition-colors disabled:bg-gray-400">확인</button>
                ) : (
                    <>
                        <button onClick={handleRetryQuiz} className="bg-gray-200 text-gray-800 font-semibold py-2 px-4 rounded-lg hover:bg-gray-300 transition-colors">다시 풀기</button>
                        {currentQuestionIndex < quizData.length - 1 ? (
                            <button onClick={handleNextQuestion} className="bg-sky-500 text-white font-semibold py-2 px-4 rounded-lg hover:bg-sky-600 transition-colors">다음</button>
                        ) : (
                            <button onClick={() => setIsQuizModalOpen(false)} className="bg-green-500 text-white font-semibold py-2 px-4 rounded-lg hover:bg-green-600 transition-colors">닫기</button>
                        )}
                    </>
                )}
            </footer>
          </div>
        </div>
      )}
    </>
  );
}

