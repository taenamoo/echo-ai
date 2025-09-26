import React from 'react';

export default function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="mt-10 border-t border-gray-200">
      <div className="container" style={{ paddingTop: 16, paddingBottom: 24 }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src="/file.svg" alt="Echo AI" width={20} height={20} />
            <span className="text-gray-600">Echo AI © {year}</span>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <a href="/" className="text-gray-600 hover:underline">홈</a>
            <a href="/documents" className="text-gray-600 hover:underline">문서</a>
            <a href="/study" className="text-gray-600 hover:underline">학습</a>
          </div>
        </div>
      </div>
    </footer>
  );
}

