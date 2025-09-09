import Link from 'next/link';

export default function Home() {
  return (
    <main className="flex flex-col items-center justify-center min-h-screen gap-6 p-8">
      <h1 className="text-3xl font-bold">Echo AI</h1>
      <p className="text-gray-700 text-center">
        문서를 업로드하고 AI와 함께 스터디를 진행해 보세요.
      </p>
      <ul className="list-disc text-gray-600 space-y-1">
        <li>PDF 문서 요약 및 분석</li>
        <li>스터디 그룹 생성 및 관리</li>
        <li>실시간 토론과 피드백</li>
      </ul>
      <div className="flex gap-4">
        <Link href="/auth/signup" className="text-blue-600 hover:underline">시작하기</Link>
        <Link href="/documents" className="text-gray-600 hover:underline">문서 둘러보기</Link>
      </div>
    </main>
  );
}
