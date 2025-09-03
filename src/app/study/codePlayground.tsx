/**
 * @file codePlayground.tsx
 * @module CodePlayground
 * @description 외부 코드 에디터 서비스(CodeSandbox)를 내장(embed)하여 보여주는 컴포넌트입니다.
 * @overview
 * 이 컴포넌트는 React의 실시간 코드 편집 및 실행 환경을 제공하기 위해 `iframe`을 사용합니다.
 * 사용자는 이 환경에서 직접 코드를 수정하고 결과를 즉시 확인할 수 있어 학습 효과를 극대화할 수 있습니다.
 * '뒤로가기' 기능을 위해 부모로부터 onBack 함수를 props로 전달받습니다.
 */

import React from 'react';

// --- TypeScript 인터페이스 정의 ---
interface CodePlaygroundProps {
  onBack: () => void; // 뒤로가기 버튼 클릭 시 호출될 함수
}

/**
 * 코드 연습장 메인 컴포넌트
 * @param {CodePlaygroundProps} props - onBack 함수를 포함하는 props
 * @returns {JSX.Element}
 */
const CodePlayground: React.FC<CodePlaygroundProps> = ({ onBack }) => {
  return (
    <div className="p-4 sm:p-6 md:p-8 h-full flex flex-col">
      <div className="flex-shrink-0">
        {/* [React 개념: Props와 이벤트 처리]
            부모 컴포넌트로부터 전달받은 onBack 함수를 onClick 이벤트 핸들러로 등록합니다.
            이를 통해 자식 컴포넌트가 부모의 상태(view)를 변경할 수 있습니다. */}
        <button 
          onClick={onBack}
          className="mb-8 bg-gray-200 text-gray-800 font-semibold py-2 px-4 rounded-lg hover:bg-gray-300 transition-colors text-sm flex items-center gap-2"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          뒤로가기
        </button>
        <header className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-800 mb-2">React 코드 연습장</h1>
            <p className="text-lg text-gray-600">자유롭게 코드를 수정하고 실시간으로 결과를 확인해보세요.</p>
        </header>
      </div>
      
      {/* [기능: 외부 서비스 연동(Embedding)]
          iframe HTML 태그를 사용하여 CodeSandbox의 React 실행 환경을 현재 페이지에 삽입합니다.
          sandbox 속성을 통해 보안을 강화하고, allow 속성으로 필요한 권한을 명시적으로 허용합니다. */}
      <div className="flex-grow border border-gray-300 rounded-lg overflow-hidden shadow-lg">
        <iframe
          src="https://codesandbox.io/embed/react-new?fontsize=14&hidenavigation=1&theme=dark"
          style={{ width: '100%', height: '100%', border: 0, borderRadius: '4px', overflow: 'hidden' }}
          title="React Code Playground"
          allow="accelerometer; ambient-light-sensor; camera; encrypted-media; geolocation; gyroscope; hid; microphone; midi; payment; usb; vr; xr-spatial-tracking"
          sandbox="allow-forms allow-modals allow-popups allow-presentation allow-same-origin allow-scripts"
        ></iframe>
      </div>
    </div>
  );
};

export default CodePlayground;

