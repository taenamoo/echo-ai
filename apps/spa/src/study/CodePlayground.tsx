import React from 'react';

export default function CodePlayground({ onBack }: { onBack: () => void }) {
  return (
    <div className="p-4 sm:p-6 md:p-8 h-full flex flex-col">
      <div className="flex-shrink-0">
        <button onClick={onBack} className="mb-8 bg-gray-200 text-gray-800 font-semibold py-2 px-4 rounded-lg hover:bg-gray-300 transition-colors text-sm flex items-center gap-2">← 뒤로가기</button>
        <header className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">React 코드 연습장</h1>
          <p className="text-lg text-gray-600">자유롭게 코드를 수정하고 실시간으로 결과를 확인해보세요.</p>
        </header>
      </div>
      <div className="flex-grow border border-gray-300 rounded-lg overflow-hidden shadow-lg h-[70vh]">
        <iframe
          src="https://codesandbox.io/embed/react-new?fontsize=14&hidenavigation=1&theme=dark"
          style={{ width: '100%', height: '100%', border: 0, borderRadius: '4px', overflow: 'hidden' }}
          title="React Code Playground"
          allow="accelerometer; ambient-light-sensor; camera; encrypted-media; geolocation; gyroscope; hid; microphone; midi; payment; usb; vr; xr-spatial-tracking"
          sandbox="allow-forms allow-modals allow-popups allow-presentation allow-same-origin allow-scripts"
        />
      </div>
    </div>
  );
}
