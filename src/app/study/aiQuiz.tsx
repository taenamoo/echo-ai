/**
 * @file aiQuiz.tsx
 * @module AiQuiz
 * @description AI를 통해 동적으로 생성된 React 퀴즈를 푸는 컴포넌트입니다.
 * @overview
 * 이 컴포넌트는 마운트될 때 서버에 퀴즈 생성을 요청하고, 받아온 퀴즈 데이터를 기반으로 사용자에게 문제를 제공합니다.
 * 사용자의 답변을 처리하고, 정답 확인, 다음 문제로 넘어가기, 최종 결과 표시 등의 로직을 포함합니다.
 */

import React, { useState, useEffect } from 'react';
import axios from '@/lib/axios';

// --- TypeScript 인터페이스 정의 ---
interface QuizQuestion {
  question: string;
  options: string[];
  answer: string;
  explanation: string;
}

interface AiQuizProps {
  onFinish: () => void; // 퀴즈가 끝났을 때 호출될 함수
}

/**
 * AI 퀴즈 메인 컴포넌트
 * @param {AiQuizProps} props - onFinish 함수를 포함하는 props
 * @returns {JSX.Element}
 */
const AiQuiz: React.FC<AiQuizProps> = ({ onFinish }) => {
  // --- 상태 관리(State) ---
  // [React 개념: useState]
  // 퀴즈 데이터, API 로딩/에러 상태, 현재 문제 번호, 사용자의 선택, 점수 등
  // 퀴즈 진행에 필요한 모든 동적 데이터를 상태로 관리합니다.
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
  const [isGenerating, setIsGenerating] = useState(true); // 퀴즈 생성 중 로딩 상태
  const [error, setError] = useState<string | null>(null); // 에러 메시지
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0); // 현재 문제 번호
  const [selectedOption, setSelectedOption] = useState<string | null>(null); // 사용자가 선택한 답
  const [isSubmitted, setIsSubmitted] = useState(false); // 정답 확인 여부
  const [score, setScore] = useState(0); // 점수

  // --- 데이터 Fetching ---
  // [React 개념: useEffect]
  // 컴포넌트가 처음 렌더링될 때(마운트될 때) 서버에 퀴즈 생성을 요청합니다.
  // 의존성 배열이 비어있어 이 로직은 최초 한 번만 실행됩니다.
  useEffect(() => {
    generateQuiz();
  }, []);

  /**
   * 서버 API를 호출하여 AI 퀴즈를 생성하고 상태를 업데이트하는 비동기 함수입니다.
   */
  const generateQuiz = async () => {
    // [클린 코드] API 호출 전 상태를 초기화하여 사용자에게 명확한 피드백을 줍니다.
    setIsGenerating(true);
    setError(null);
    setQuizQuestions([]);
    const accessToken = localStorage.getItem('accessToken');

    if (!accessToken) {
        setError("인증 토큰이 없습니다. 다시 로그인해주세요.");
        setIsGenerating(false);
        return;
    }

    try {
      // [오류 수정] API에 전달하는 `content`를 퀴즈 생성 '주제'만 명시하도록 수정합니다.
      // 서버에서 이 주제와 `count`를 조합하여 AI에게 전달할 최종 프롬프트를 생성하게 됩니다.
      // 이렇게 하면 프롬프트가 더 명확해져 AI가 요청을 이해하지 못해 발생하는 서버 오류(500)를 방지할 수 있습니다.
      const response = await axios.post('/api/study/quiz', {
        content: "React 공식 문서의 핵심 개념(JSX, 컴포넌트, Props, State, Hooks, Context API, 라우팅 등)",
        count: 15
      }, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });

      const parsedQuiz = response.data.quiz;

      if (parsedQuiz && parsedQuiz.length > 0) {
        setQuizQuestions(parsedQuiz);
      } else {
           throw new Error("AI가 유효한 퀴즈를 생성하지 못했습니다.");
      }
    } catch (err: any) {
      console.error("퀴즈 생성 실패:", err);
      setError(err.response?.data?.error || err.message || "퀴즈 생성 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.");
    } finally {
      setIsGenerating(false);
    }
  };
  
  // --- 이벤트 핸들러 ---
  // [React 개념: 이벤트 처리]
  // 사용자의 상호작용(선택, 확인, 다음, 재도전)에 따라 상태를 변경하는 함수들입니다.
  
  /** 사용자가 선택지를 클릭했을 때 호출되는 함수 */
  const handleOptionSelect = (option: string) => {
    if (!isSubmitted) {
      setSelectedOption(option);
    }
  };

  /** '정답 확인' 버튼 클릭 시 호출되는 함수 */
  const handleSubmit = () => {
    if (!selectedOption) return;
    setIsSubmitted(true);
    if (selectedOption === currentQuestion.answer) {
      setScore(prev => prev + 1);
    }
  };

  /** '다음' 또는 '결과 보기' 버튼 클릭 시 다음 단계로 진행하는 함수 */
  const handleNext = () => {
    setIsSubmitted(false);
    setSelectedOption(null);
    setCurrentQuestionIndex(prev => prev + 1);
  };

  /** [신규 기능] '재도전' 버튼 클릭 시 퀴즈를 초기화하고 다시 시작하는 함수 */
  const handleRetryQuiz = () => {
    // [React 개념: 상태 리셋]
    // 모든 진행 상태를 초기값으로 되돌립니다.
    setCurrentQuestionIndex(0);
    setSelectedOption(null);
    setIsSubmitted(false);
    setScore(0);
    // [기능: 퀴즈 재생성]
    // generateQuiz 함수를 다시 호출하여 새로운 퀴즈 문제를 서버에 요청합니다.
    generateQuiz();
  };


  /** 현재 문제 데이터를 변수로 할당하여 가독성 증진 */
  const currentQuestion = quizQuestions[currentQuestionIndex];

  // --- 조건부 렌더링 ---
  // [클린 코드] 복잡한 렌더링 로직을 상태에 따라 분기 처리하는 별도의 함수로 분리합니다.
  const renderContent = () => {
    if (isGenerating) {
      return (
        <div className="text-center">
          <p className="text-lg text-gray-600 animate-pulse">AI가 React 퀴즈를 생성 중입니다...</p>
        </div>
      );
    }

    if (error) {
      return (
        <div className="text-center">
          <p className="text-lg text-red-600 mb-4">{error}</p>
          <button
            onClick={generateQuiz}
            className="bg-sky-500 text-white font-semibold py-2 px-6 rounded-lg hover:bg-sky-600 transition-colors"
          >
            다시 시도
          </button>
        </div>
      );
    }
    
    // 모든 문제를 다 풀었을 때 결과 화면을 렌더링합니다.
    if (!isGenerating && quizQuestions.length > 0 && currentQuestionIndex >= quizQuestions.length) {
      return (
         <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-800 mb-4">퀴즈 완료!</h1>
          <p className="text-2xl text-gray-600 mb-8">
            총 {quizQuestions.length}문제 중 <span className="font-bold text-sky-500">{score}</span>문제를 맞혔습니다.
          </p>
          {/* [신규 기능] 퀴즈 결과 화면에 '재도전'과 '종료' 버튼을 함께 표시합니다. */}
          <div className="flex justify-center gap-4">
            <button
              onClick={handleRetryQuiz}
              className="bg-gray-200 text-gray-800 font-semibold py-3 px-6 rounded-lg hover:bg-gray-300 transition-colors text-lg"
            >
              재도전
            </button>
            <button
              onClick={onFinish}
              className="bg-green-500 text-white font-semibold py-3 px-6 rounded-lg hover:bg-green-600 transition-colors text-lg"
            >
              종료
            </button>
          </div>
        </div>
      );
    }
    
    // 현재 문제에 대한 UI를 렌더링합니다.
    if(currentQuestion) {
      return (
        <div className="max-w-2xl w-full mx-auto">
          <div className="bg-white p-6 rounded-lg shadow-md">
            <p className="text-sm text-gray-500 mb-2">문제 {currentQuestionIndex + 1} / {quizQuestions.length}</p>
            <h2 className="text-xl font-bold text-gray-800 mb-6">{currentQuestion.question}</h2>
            <div className="space-y-3">
              {/* [React 개념: 리스트와 Key]
                  선택지 배열을 map으로 순회하며 버튼을 렌더링합니다. */}
              {currentQuestion.options.map((option, index) => {
                const isCorrect = option === currentQuestion.answer;
                const isSelected = option === selectedOption;
                let optionClass = "w-full text-left p-4 border rounded-lg transition-all duration-200 ease-in-out text-gray-700";
                
                if (isSubmitted) {
                  if (isCorrect) optionClass += " bg-green-100 border-green-400 font-bold text-green-800";
                  else if (isSelected) optionClass += " bg-red-100 border-red-400 font-bold text-red-800";
                  else optionClass += " bg-gray-50 border-gray-200 text-gray-500";
                } else {
                  if (isSelected) optionClass += " bg-sky-100 border-sky-400 ring-2 ring-sky-300";
                  else optionClass += " bg-white border-gray-300 hover:bg-sky-50 hover:border-sky-300";
                }

                return (
                  <button key={index} onClick={() => handleOptionSelect(option)} disabled={isSubmitted} className={optionClass}>
                    {option}
                  </button>
                );
              })}
            </div>

            {isSubmitted && (
               <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <h4 className="font-bold text-yellow-800">해설</h4>
                  <p className="text-sm text-yellow-700">{currentQuestion.explanation}</p>
               </div>
            )}

            <div className="mt-8 text-right">
              {!isSubmitted ? (
                 <button onClick={handleSubmit} disabled={!selectedOption} className="bg-sky-500 text-white font-semibold py-2 px-6 rounded-lg hover:bg-sky-600 transition-colors disabled:bg-gray-400">
                  정답 확인
                </button>
              ) : (
                  // [수정] 마지막 문제인지 여부에 따라 '다음' 또는 '결과 보기' 버튼을 표시합니다.
                  currentQuestionIndex < quizQuestions.length - 1 ? (
                     <button onClick={handleNext} className="bg-green-500 text-white font-semibold py-2 px-6 rounded-lg hover:bg-green-600 transition-colors">
                      다음
                    </button>
                  ) : (
                     <button onClick={handleNext} className="bg-green-500 text-white font-semibold py-2 px-6 rounded-lg hover:bg-green-600 transition-colors">
                      결과 보기
                    </button>
                  )
              )}
            </div>
          </div>
        </div>
      );
    }

    return null; // 퀴즈 데이터가 아직 없을 때 아무것도 렌더링하지 않음
  };

  return (
    <div className="p-4 sm:p-6 md:p-8 h-full flex flex-col">
       <div className="flex-shrink-0">
         <button onClick={onFinish} className="mb-8 bg-gray-200 text-gray-800 font-semibold py-2 px-4 rounded-lg hover:bg-gray-300 transition-colors text-sm flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          뒤로가기
        </button>
        <header className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-800 mb-2">AI 퀴즈</h1>
            <p className="text-lg text-gray-600">핵심 개념을 잘 이해했는지 확인해보세요.</p>
        </header>
       </div>
       <div className="flex-grow flex items-center justify-center">
        {renderContent()}
       </div>
    </div>
  );
};

export default AiQuiz;
