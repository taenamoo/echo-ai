import React from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';

export default function Home() {
  return (
    <Layout mainClassName="landing-hero min-h-with-header px-0 py-0">
      <div className="landing-bg" />
      <div className="landing-card">
        <h1 className="text-3xl font-bold mb-2">문서를 업로드하고 AI로 요약하세요</h1>
        <p className="text-gray-600 mb-4">Presign 업로드로 빠르고 안전하게 문서를 저장하고, 큐 기반 처리로 안정적인 요약 결과를 받아보세요.</p>
        <div className="flex flex-wrap gap-2">
          <Link to="/documents" className="px-4 py-2 rounded bg-indigo-600 text-white hover:bg-indigo-700 flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            문서로 이동
          </Link>
          <Link to="/study" className="px-4 py-2 rounded bg-gray-800 text-white hover:bg-gray-700 flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>
            학습 도구 보기
          </Link>
          <Link to="/chatHr" className="px-4 py-2 rounded bg-emerald-600 text-white hover:bg-emerald-700 flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
            HR 챗봇
          </Link>
        </div>
      </div>
    </Layout>
  );
}
