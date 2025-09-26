import React, { useEffect, useState } from 'react';
import { generateQuiz } from '../studyApi';

type QQ = { question: string; options: string[]; answer: string; explanation: string };

export default function AiQuiz({ onFinish }: { onFinish: () => void }) {
  const [quiz, setQuiz] = useState<QQ[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [i, setI] = useState(0);
  const [sel, setSel] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(0);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true); setError(null);
        const res = await generateQuiz('React 핵심 개념(JSX, 컴포넌트, Props, State, Hooks 등)', 8);
        setQuiz(res.quiz || []);
      } catch (e: any) { setError(e.message || '퀴즈 생성 오류'); }
      finally { setLoading(false); }
    })();
  }, []);

  const q = quiz[i];

  return (
    <div className="p-4 sm:p-6 md:p-8 h-full flex flex-col">
      <div className="flex-shrink-0">
        <button onClick={onFinish} className="mb-8 bg-gray-200 text-gray-800 font-semibold py-2 px-4 rounded-lg hover:bg-gray-300 text-sm">← 돌아가기</button>
        <header className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">AI 퀴즈</h1>
          <p className="text-lg text-gray-600">핵심 개념을 잘 이해했는지 확인해보세요.</p>
        </header>
      </div>
      <div className="flex-grow flex items-center justify-center">
        {loading ? <p className="text-gray-600">AI가 퀴즈를 생성 중입니다...</p> : error ? (
          <div className="text-center">
            <p className="text-red-600 mb-4">{error}</p>
            <button onClick={() => window.location.reload()} className="px-4 py-2 rounded bg-sky-500 text-white">다시 시도</button>
          </div>
        ) : (quiz.length > 0 && i >= quiz.length) ? (
          <div className="text-center">
            <h2 className="text-3xl font-bold mb-4">퀴즈 완료!</h2>
            <p className="text-xl text-gray-600 mb-6">총 {quiz.length}문제 중 <span className="font-bold text-sky-500">{score}</span>문제 정답</p>
            <div className="flex gap-3 justify-center">
              <button onClick={() => window.location.reload()} className="px-4 py-2 rounded bg-gray-200">재도전</button>
              <button onClick={onFinish} className="px-4 py-2 rounded bg-green-600 text-white">종료</button>
            </div>
          </div>
        ) : q ? (
          <div className="max-w-2xl w-full mx-auto bg-white p-6 rounded shadow">
            <p className="text-sm text-gray-500 mb-2">문제 {i + 1} / {quiz.length}</p>
            <h2 className="text-xl font-bold text-gray-800 mb-6">{q.question}</h2>
            <div className="space-y-3">
              {q.options.map((op, idx) => {
                const isCorrect = op === q.answer;
                const isSel = op === sel;
                let cls = 'w-full text-left p-4 border rounded';
                if (submitted) cls += isCorrect ? ' bg-green-100 border-green-400' : isSel ? ' bg-red-100 border-red-400' : ' bg-gray-50 border-gray-200';
                else cls += isSel ? ' bg-sky-100 border-sky-400' : ' bg-white border-gray-300 hover:bg-sky-50';
                return <button key={idx} disabled={submitted} onClick={() => setSel(op)} className={cls}>{op}</button>;
              })}
            </div>
            {submitted && (
              <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800">{q.explanation}</div>
            )}
            <div className="mt-6 text-right">
              {!submitted ? (
                <button onClick={() => { if (!sel) return; setSubmitted(true); if (sel === q.answer) setScore(s => s + 1); }} disabled={!sel} className="px-4 py-2 rounded bg-sky-500 text-white disabled:bg-gray-400">정답 확인</button>
              ) : (
                <button onClick={() => { setSubmitted(false); setSel(null); setI(x => x + 1); }} className="px-4 py-2 rounded bg-green-600 text-white">{i < quiz.length - 1 ? '다음' : '결과 보기'}</button>
              )}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

