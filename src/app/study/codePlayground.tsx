import React from 'react';

interface CodePlaygroundProps {
  onBack: () => void;
}

const CodePlayground: React.FC<CodePlaygroundProps> = ({ onBack }) => {
  return (
    <div className="p-4 sm:p-6 md:p-8 h-full flex flex-col">
      <div className="flex-shrink-0">
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

