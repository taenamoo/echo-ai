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
        <div className="flex gap-2">
          <Link to="/documents" className="px-4 py-2 rounded bg-indigo-600 text-white hover:bg-indigo-700">문서로 이동</Link>
          <Link to="/study" className="px-4 py-2 rounded bg-gray-800 text-white hover:bg-gray-700">학습 도구 보기</Link>
        </div>
      </div>
    </Layout>
  );
}
