import React, { FormEvent, useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { api } from '../api';

type Msg = { role: 'user' | 'ai'; text: string };

export default function AiSearchButton() {
  // --- 상태 관리(State) ---
  // [React 개념: useState]
  // 모달의 열림 상태, 버튼의 위치, 드래그 상태 등 UI와 관련된 동적인 데이터들을 관리합니다.
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState({ x: window.innerWidth - 80, y: window.innerHeight - 80 });
  const [isDragging, setIsDragging] = useState(false);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [searchTerm, setSearchTerm] = useState('');
  const [conversation, setConversation] = useState<{ role: 'user' | 'ai', text: string }[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  
  // --- DOM 참조(Ref) ---
  // [React 개념: useRef]
  // 버튼 DOM 요소에 직접 접근하여 위치 계산 등을 수행하기 위해 사용됩니다.
  const buttonRef = useRef<HTMLButtonElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const accessToken = localStorage.getItem('accessToken');

  // --- 부수 효과(Side Effect) ---
  // [React 개념: useEffect]
  // 대화 내용(conversation)이 변경될 때마다 채팅창의 스크롤을 맨 아래로 이동시킵니다.
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [conversation]);

  // [React 개념: 이벤트 핸들링]
  // 사용자의 다양한 입력(클릭, 드래그 등)에 반응하여 상태를 변경하고 API를 호출하는 함수들입니다.
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
  
  const handleMouseDown = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (buttonRef.current) {
      setIsDragging(true);
      const rect = buttonRef.current.getBoundingClientRect();
      setOffset({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    }
  };
  
  const handleTouchStart = (e: React.TouchEvent<HTMLButtonElement>) => {
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

  // [React 개념: useEffect]
  // isDragging 상태가 true일 때만 전역(window) 마우스/터치 이벤트 리스너를 추가하고,
  // 상태가 false가 되거나 컴포넌트가 언마운트될 때 리스너를 정리(cleanup)하여 메모리 누수를 방지합니다.
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

  // [React 개념: 조건부 렌더링]
  // isOpen 상태가 true일 때만 모달 UI가 렌더링됩니다.
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
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 flex items-center justify-center" onClick={() => setIsOpen(false)}>
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
}