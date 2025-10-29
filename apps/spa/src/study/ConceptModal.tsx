import React from 'react';

export default function ConceptModal({ isOpen, onClose, url, title }: { isOpen: boolean; onClose: () => void; url: string; title: string; }) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <header className="p-4 border-b flex justify-between items-center flex-shrink-0">
          <h3 className="text-xl font-bold text-gray-800">{title}</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-800" aria-label="닫기">✕</button>
        </header>
        <div className="flex-grow overflow-hidden">
          <iframe src={url} title={title} className="w-full h-full" style={{ border: 'none' }} />
        </div>
      </div>
    </div>
  );
}

