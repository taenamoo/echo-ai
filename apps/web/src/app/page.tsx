import Link from 'next/link';

export default function Home() {
  return (
    <main className="landing-hero min-h-with-header relative overflow-hidden">
      <div className="absolute inset-0 landing-bg" aria-hidden="true" />

      <section className="relative w-full h-full flex items-center justify-center">
        <div className="landing-card">
          <h1 className="text-4xl font-extrabold text-gray-800 mb-2">Echo AI</h1>
          <p className="text-gray-700 mb-4">문서를 업로드하고 쉽게 스터디하세요.</p>
          <ul className="list-disc pl-5 text-gray-700 space-y-1 mb-5">
            <li>PDF 문서 벡터화 및 분석</li>
            <li>스터디 그룹 생성</li>
            <li>실시간 응용 기능</li>
          </ul>
          <div className="flex gap-3">
            <Link href="/auth/signup" className="inline-block rounded-md bg-blue-600 text-white px-4 py-2 hover:bg-blue-700">더 알아보기</Link>
            <Link href="/documents" className="inline-block rounded-md bg-gray-200 text-gray-800 px-4 py-2 hover:bg-gray-300">문서 둘러보기</Link>
          </div>
        </div>
      </section>
    </main>
  );
}
