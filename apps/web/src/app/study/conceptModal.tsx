/**
 * @file conceptModal.tsx
 * @module ConceptModal
 * @description React 공식 문서의 특정 페이지를 `iframe`을 통해 보여주는 모달 컴포넌트입니다.
 * @overview
 * 이 컴포넌트는 사용자가 앱을 떠나지 않고도 외부 웹 콘텐츠를 볼 수 있게 해줍니다.
 * `isOpen` prop을 통해 부모 컴포넌트에서 모달의 표시 여부를 제어할 수 있으며,
 * `onClose` 함수를 전달받아 모달을 닫는 이벤트를 처리합니다.
 * @see {@link https://react.dev/learn/sharing-state-between-components | React 상태 끌어올리기}
 */

import React from 'react';

// --- TypeScript 인터페이스 정의 ---
// [클린 코드] props의 타입을 명확하게 정의하여 컴포넌트의 재사용성과 안정성을 높입니다.
interface ConceptModalProps {
  isOpen: boolean;    // 모달의 열림/닫힘 상태
  onClose: () => void; // 모달을 닫기 위해 부모 컴포넌트에서 전달하는 함수
  url: string;        // iframe에 표시할 외부 페이지 주소
  title: string;      // 모달 헤더에 표시될 제목
}

/**
 * 개념 학습 모달 컴포넌트
 * @param {ConceptModalProps} props - 모달의 상태와 제어 함수를 포함하는 props
 * @returns {JSX.Element | null} isOpen이 true일 때만 모달을 렌더링합니다.
 */
const ConceptModal: React.FC<ConceptModalProps> = ({ isOpen, onClose, url, title }) => {
  // [React 개념: 조건부 렌더링 (Conditional Rendering)]
  // 부모 컴포넌트로부터 받은 `isOpen` prop이 false이면, 아무것도 렌더링하지 않고(null 반환) 컴포넌트를 종료합니다.
  // 이는 React에서 특정 조건에 따라 UI를 보여주거나 숨기는 가장 기본적인 패턴입니다.
  if (!isOpen) {
    return null;
  }

  return (
    // 모달 배경 (Backdrop)
    <div 
      className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center p-4" 
      // [React 개념: 이벤트 처리 (Event Handling) 및 상태 끌어올리기 (Lifting State Up)]
      // 배경(Backdrop)을 클릭하면 부모로부터 받은 `onClose` 함수가 호출됩니다.
      // 자식 컴포넌트(ConceptModal)는 스스로를 닫을 수 없으며, 부모(StudyPage)에게 상태 변경을 요청합니다.
      // 부모는 `onClose` 함수 내부에서 `isOpen` 상태를 false로 변경하여 이 모달을 닫게 됩니다.
      onClick={onClose}
    >
      {/* 모달 컨텐츠 영역 */}
      <div 
        className="bg-white rounded-lg shadow-xl w-full max-w-4xl h-[90vh] flex flex-col"
        // [JavaScript 개념: 이벤트 전파 중단 (Stop Propagation)]
        // 모달 내부를 클릭했을 때, 이벤트가 부모 요소인 배경(Backdrop)으로 전파(bubbling)되어
        // 모달이 닫히는 것을 방지하기 위해 `stopPropagation`을 호출합니다.
        onClick={e => e.stopPropagation()}
      >
        <header className="p-4 border-b flex justify-between items-center flex-shrink-0">
          <h3 className="text-xl font-bold text-gray-800">{title}</h3>
          <button 
            onClick={onClose} 
            className="text-gray-500 hover:text-gray-800 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </header>

        {/* [기능: 외부 콘텐츠 임베딩(Embedding)]
            iframe HTML 태그를 사용하여 지정된 url의 웹 페이지를 모달 내부에 표시합니다.
            이를 통해 사용자는 현재 페이지를 벗어나지 않고도 관련 문서를 참고할 수 있어
            더 나은 사용자 경험(UX)을 제공합니다. */}
        <div className="flex-grow overflow-hidden">
          <iframe
            src={url}
            title={title}
            className="w-full h-full"
            style={{ border: 'none' }}
          />
        </div>
      </div>
    </div>
  );
};

export default ConceptModal;
