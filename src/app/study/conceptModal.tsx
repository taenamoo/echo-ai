import React from 'react';

// 컨셉 모달 컴포넌트의 props 타입을 정의합니다.
interface ConceptModalProps {
  isOpen: boolean;
  onClose: () => void;
  url: string;
  title: string;
}

const ConceptModal: React.FC<ConceptModalProps> = ({ isOpen, onClose, url, title }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <header className="p-4 border-b flex justify-between items-center">
          <h3 className="text-xl font-bold text-gray-800">{title}</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-800 text-2xl font-bold">×</button>
        </header>
        <div className="flex-grow p-1">
          <iframe
            src={url}
            title={title}
            className="w-full h-full border-0"
          />
        </div>
      </div>
    </div>
  );
};

export default ConceptModal;

