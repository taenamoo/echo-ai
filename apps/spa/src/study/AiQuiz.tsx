import React, { useEffect, useState } from 'react';
import { generateQuiz } from '../studyApi';

type QQ = {
  question: string;
  options: string[];
  answer: string;
  explanation: string;
};

export default function AiQuiz({ onFinish }: { onFinish: () => void }) {
  const [quiz, setQuiz] = useState<QQ[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [i, setI] = useState(0);
  const [selIdx, setSelIdx] = useState<number | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(0);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await generateQuiz(
          'React 핵심 개념(JSX, 컴포넌트, Props, State, Hooks 등)',
          8
        );
        setQuiz(res.quiz || []);
      } catch (e: any) {
        setError(e.message || '퀴즈 생성 오류');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const q = quiz[i];
  const normalizedAnswer = q ? (q.answer || '').trim() : '';
  function handleOptionSelect(idx: number) {
    if (submitted) return;
    setSelIdx(idx);
  }

  function handleReveal() {
    if (submitted || selIdx === null || !q) return;
    setSubmitted(true);
    const normalizedSelected = (q.options[selIdx] || '').trim();
    if (normalizedSelected === normalizedAnswer) setScore((s) => s + 1);
  }

  function handleNext() {
    setSubmitted(false);
    setSelIdx(null);
    setI((x) => x + 1);
  }

  const isCorrectSelection =
    submitted &&
    selIdx !== null &&
    (q?.options?.[selIdx] || '').trim() === normalizedAnswer;

  return (
    <div className="p-4 sm:p-6 md:p-8 h-full flex flex-col">
      <div className="flex-shrink-0">
        <button
          onClick={onFinish}
          className="mb-8 bg-gray-200 text-gray-800 font-semibold py-2 px-4 rounded-lg hover:bg-gray-300 text-sm"
        >
          ← 돌아가기
        </button>
        <header className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">AI 퀴즈</h1>
          <p className="text-lg text-gray-600">
            핵심 개념을 잘 이해했는지 확인해보세요.
          </p>
        </header>
      </div>
      <div className="flex-grow flex items-center justify-center">
        {loading ? (
          <p className="text-gray-600">AI가 퀴즈를 생성 중입니다...</p>
        ) : error ? (
          <div className="text-center">
            <p className="text-red-600 mb-4">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 rounded bg-sky-500 text-white"
            >
              다시 시도
            </button>
          </div>
        ) : quiz.length > 0 && i >= quiz.length ? (
          <div className="text-center">
            <h2 className="text-3xl font-bold mb-4">퀴즈 완료!</h2>
            <p className="text-xl text-gray-600 mb-6">
              총 {quiz.length}문제 중{' '}
              <span className="font-bold text-sky-500">{score}</span>문제 정답
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 rounded bg-gray-200"
              >
                재도전
              </button>
              <button
                onClick={onFinish}
                className="px-4 py-2 rounded bg-green-600 text-white"
              >
                종료
              </button>
            </div>
          </div>
        ) : q ? (
          <div className="max-w-2xl w-full mx-auto bg-white p-6 rounded shadow">
            <p className="text-sm text-gray-500 mb-2">
              문제 {i + 1} / {quiz.length}
            </p>
            <h2 className="text-xl font-bold text-gray-800 mb-6">
              {q.question}
            </h2>
            <div className="inline-flex flex-col gap-3 w-full">
              {q.options.map((op, idx) => {
                const isCorrect = (op || '').trim() === normalizedAnswer;
                const isSel = idx === selIdx;
                let cls =
                  'quiz-option w-full text-left rounded-lg border px-4 py-4 text-base font-medium transition-colors duration-150 shadow-sm';
                if (submitted) {
                  cls += isCorrect
                    ? ' !bg-emerald-600 !border-emerald-300 text-emerald-700'
                    : isSel
                      ? ' !bg-rose-600 !border-rose-300 text-rose-700'
                      : ' !bg-slate-600 !border-slate-200 text-slate-600';
                } else {
                  cls += isSel
                    ? ' !bg-sky-600 !border-sky-400 text-sky-900'
                    : ' !bg-sky-400 !border-sky-200 text-slate-700 hover:!bg-sky-600';
                }
                return (
                  <button
                    type="button"
                    key={idx}
                    disabled={submitted}
                    onClick={() => handleOptionSelect(idx)}
                    className={cls}
                  >
                    {op}
                  </button>
                );
              })}
            </div>
            {submitted && (
              <div className="mt-5 space-y-3">
                <div
                  className={`rounded-md border px-4 py-3 text-sm font-medium ${
                    isCorrectSelection
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                      : 'border-rose-200 bg-rose-50 text-rose-700'
                  }`}
                >
                  {isCorrectSelection
                    ? '정답입니다! 잘하셨어요.'
                    : `오답입니다. 정답은 "${q.answer}" 입니다.`}
                </div>
                <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
                  {q.explanation}
                </div>
              </div>
            )}
            <div className="mt-6 text-right">
              {!submitted ? (
                <button
                  type="button"
                  onClick={handleReveal}
                  disabled={selIdx === null}
                  className="px-4 py-2 rounded bg-sky-500 text-white disabled:bg-gray-400"
                >
                  정답 확인
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleNext}
                  className="px-4 py-2 rounded bg-green-600 text-white"
                >
                  {i < quiz.length - 1 ? '다음' : '결과 보기'}
                </button>
              )}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
