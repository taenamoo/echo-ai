/**
 * @file aiQuiz.tsx
 * @module AiQuiz
 * @description AI를 통해 동적으로 생성된 React 및 AWS 퀴즈를 푸는 컴포넌트입니다.
 * @overview
 * 이 컴포넌트는 사용자가 선택한 퀴즈 종류에 따라 서버에 퀴즈 생성을 요청합니다.
 * '기초지식(React)', '시험문제(AWS CCP)', '시험문제(AWS SAA)' 간의 전환이 가능하며, 
 * 각 퀴즈에 대한 진행 상태를 관리합니다.
 */

import React, { useState, useEffect } from 'react';
import axios from 'axios';

// --- TypeScript 인터페이스 및 타입 정의 ---
interface QuizQuestion {
  question: string;
  options: string[];
  answer: string;
  explanation: string;
}

interface AiQuizProps {
  onFinish: () => void; // 퀴즈가 끝났을 때 호출될 함수
}

// 퀴즈 종류를 명확하게 관리하기 위한 타입 정의
type QuizType = 'REACT' | 'AWS_CCP' | 'AWS_SAA';

// 퀴즈 타입별 설정을 관리하는 객체
const QUIZ_CONFIG = {
  REACT: {
    title: "AI 기초지식 퀴즈",
    description: "React 핵심 개념을 잘 이해했는지 확인해보세요.",
    topic: "React 공식 문서의 핵심 개념(JSX, 컴포넌트, Props, State, Hooks, Context API, 라우팅 등)",
    loadingMessage: "AI가 React 퀴즈를 생성 중입니다..."
  },
  AWS_CCP: {
    title: "AI AWS CCP 시험문제",
    description: "AWS Certified Cloud Practitioner 자격증 시험 문제를 풀어보세요.",
    topic: "AWS Certified Cloud Practitioner Practice Exam Questions",
    loadingMessage: "AI가 AWS CCP 연습 문제를 생성 중입니다..."
  },
  AWS_SAA: {
    title: "AI AWS SAA 시험문제",
    description: "AWS Certified Solutions Architect - Associate 자격증 시험 문제를 풀어보세요.",
    topic: "AWS Certified Solutions Architect - Associate Practice Exam Questions",
    loadingMessage: "AI가 AWS SAA 연습 문제를 생성 중입니다..."
  }
};


/**
 * AI 퀴즈 메인 컴포넌트
 * @param {AiQuizProps} props - onFinish 함수를 포함하는 props
 * @returns {JSX.Element}
 */
const AiQuiz: React.FC<AiQuizProps> = ({ onFinish }) => {
  // --- 상태 관리(State) ---
  const [quizType, setQuizType] = useState<QuizType>('REACT');
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
  const [isGenerating, setIsGenerating] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [score, setScore] = useState(0);

  const config = QUIZ_CONFIG[quizType];

  // --- 데이터 Fetching ---
  useEffect(() => {
    generateQuiz();
  }, [quizType]);

  const generateQuiz = async () => {
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
      const response = await axios.post('/api/study/quiz', {
        quizType: quizType,
        content: config.topic,
        count: 10
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
  const handleQuizTypeChange = (newType: QuizType) => {
      if (newType === quizType) return;
      setCurrentQuestionIndex(0);
      setSelectedOption(null);
      setIsSubmitted(false);
      setScore(0);
      setQuizType(newType);
  };

  const handleOptionSelect = (option: string) => { if (!isSubmitted) setSelectedOption(option); };

  const handleSubmit = () => {
    if (!selectedOption) return;
    setIsSubmitted(true);
    // [수정] trim()을 사용하여 정답 비교 정확도 향상
    if (selectedOption.trim() === currentQuestion.answer.trim()) {
      setScore(prev => prev + 1);
    }
  };

  const handleNext = () => {
    setIsSubmitted(false);
    setSelectedOption(null);
    setCurrentQuestionIndex(prev => prev + 1);
  };

  const handleRetryQuiz = () => {
    setCurrentQuestionIndex(0);
    setSelectedOption(null);
    setIsSubmitted(false);
    setScore(0);
    generateQuiz();
  };

  const currentQuestion = quizQuestions[currentQuestionIndex];

  // --- 조건부 렌더링 ---
  const renderContent = () => {
    if (isGenerating) {
      return (
        <div className="text-center">
          <p className="text-lg text-gray-600 animate-pulse">{config.loadingMessage}</p>
        </div>
      );
    }

    if (error) {
      return (
        <div className="text-center">
          <p className="text-lg text-red-600 mb-4">{error}</p>
          <button onClick={generateQuiz} className="bg-sky-500 text-white font-semibold py-2 px-6 rounded-lg hover:bg-sky-600 transition-colors">
            다시 시도
          </button>
        </div>
      );
    }
    
    if (!isGenerating && quizQuestions.length > 0 && currentQuestionIndex >= quizQuestions.length) {
      return (
         <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-800 mb-4">퀴즈 완료!</h1>
          <p className="text-2xl text-gray-600 mb-8">
            총 {quizQuestions.length}문제 중 <span className="font-bold text-sky-500">{score}</span>문제를 맞혔습니다.
          </p>
          <div className="flex justify-center gap-4">
            <button onClick={handleRetryQuiz} className="bg-gray-200 text-gray-800 font-semibold py-3 px-6 rounded-lg hover:bg-gray-300 transition-colors text-lg">
              재도전
            </button>
            <button onClick={onFinish} className="bg-green-500 text-white font-semibold py-3 px-6 rounded-lg hover:bg-green-600 transition-colors text-lg">
              종료
            </button>
          </div>
        </div>
      );
    }
    
    if(currentQuestion) {
      return (
        <div className="max-w-2xl w-full mx-auto">
          <div className="bg-white p-6 rounded-lg shadow-md">
            <p className="text-sm text-gray-500 mb-2">문제 {currentQuestionIndex + 1} / {quizQuestions.length}</p>
            <h2 className="text-xl font-bold text-gray-800 mb-6">{currentQuestion.question}</h2>
            <div className="space-y-3">
              {currentQuestion.options.map((option, index) => {
                // [수정] trim()을 사용하여 정답 비교 정확도 향상
                const isCorrect = option.trim() === currentQuestion.answer.trim();
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
                    {`${index + 1}. ${option}`}
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

    return null;
  };

  return (
    <div className="p-4 sm:p-6 md:p-8 h-full flex flex-col">
       <div className="flex-shrink-0">
        <button onClick={onFinish} className="mb-8 bg-gray-200 text-gray-800 font-semibold py-2 px-4 rounded-lg hover:bg-gray-300 transition-colors text-sm flex items-center gap-2">
         <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
         뒤로가기
        </button>
        <div className="my-8 flex justify-center gap-2 border border-gray-200 rounded-lg p-1 max-w-lg mx-auto bg-gray-50">
          <button
            onClick={() => handleQuizTypeChange('REACT')}
            className={`w-full font-semibold py-2 px-4 rounded-md transition-colors duration-200 ${
              quizType === 'REACT'
                ? 'bg-sky-500 text-white shadow-md'
                : 'bg-transparent text-gray-500 hover:bg-sky-100 hover:text-sky-700'
            }`}
          >
            기초지식 (React)
          </button>
          <button
            onClick={() => handleQuizTypeChange('AWS_CCP')}
            className={`w-full font-semibold py-2 px-4 rounded-md transition-colors duration-200 whitespace-nowrap ${
              quizType === 'AWS_CCP'
                ? 'bg-amber-500 text-white shadow-md'
                : 'bg-transparent text-gray-500 hover:bg-amber-100 hover:text-amber-700'
            }`}
          >
            CCP (AWS)
          </button>
          <button
            onClick={() => handleQuizTypeChange('AWS_SAA')}
            className={`w-full font-semibold py-2 px-4 rounded-md transition-colors duration-200 whitespace-nowrap ${
              quizType === 'AWS_SAA'
                ? 'bg-orange-500 text-white shadow-md'
                : 'bg-transparent text-gray-500 hover:bg-orange-100 hover:text-orange-700'
            }`}
          >
            SAA (AWS)
          </button>
        </div>
        <header className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-800 mb-2">{config.title}</h1>
            <p className="text-lg text-gray-600">{config.description}</p>
        </header>
       </div>
       <div className="flex-grow flex items-center justify-center">
        {renderContent()}
       </div>
    </div>
  );
};

export default AiQuiz;

