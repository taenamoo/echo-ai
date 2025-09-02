import React, { useState, useEffect } from 'react';
import axios from 'axios';

// 퀴즈 데이터 타입 정의
interface QuizQuestion {
  question: string;
  options: string[];
  answer: string;
  explanation: string;
}

// 컴포넌트 props 타입 정의
interface AiQuizProps {
  onFinish: () => void;
}

const AiQuiz: React.FC<AiQuizProps> = ({ onFinish }) => {
  // 퀴즈 데이터 및 생성 상태 관리
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
  const [isGenerating, setIsGenerating] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 퀴즈 진행 상태 관리
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [score, setScore] = useState(0);

  // 백엔드 API를 통해 퀴즈를 생성하는 함수
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
            content: "React 공식 문서의 핵심 개념(JSX, 컴포넌트, Props, State, Hooks, Context API, 라우팅 등)에 대한 심층적인 객관식 퀴즈",
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

  // 컴포넌트 마운트 시 퀴즈 생성
  useEffect(() => {
    generateQuiz();
  }, []);

  const currentQuestion = quizQuestions[currentQuestionIndex];

  const handleOptionSelect = (option: string) => {
    if (!isSubmitted) {
      setSelectedOption(option);
    }
  };

  const handleSubmit = () => {
    if (!selectedOption) return;
    setIsSubmitted(true);
    if (selectedOption === currentQuestion.answer) {
      setScore(prev => prev + 1);
    }
  };

  const handleNext = () => {
    setIsSubmitted(false);
    setSelectedOption(null);
    setCurrentQuestionIndex(prev => prev + 1);
  };

  // UI 렌더링 부분
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

    if (currentQuestionIndex >= quizQuestions.length) {
      return (
         <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-800 mb-4">퀴즈 완료!</h1>
          <p className="text-2xl text-gray-600 mb-8">
            총 {quizQuestions.length}문제 중 <span className="font-bold text-sky-500">{score}</span>문제를 맞혔습니다.
          </p>
          <button
            onClick={onFinish}
            className="bg-sky-500 text-white font-semibold py-3 px-6 rounded-lg hover:bg-sky-600 transition-colors text-lg"
          >
            돌아가기
          </button>
        </div>
      );
    }
    
    return (
      <div className="max-w-2xl w-full mx-auto">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <p className="text-sm text-gray-500 mb-2">문제 {currentQuestionIndex + 1} / {quizQuestions.length}</p>
          <h2 className="text-xl font-bold text-gray-800 mb-6">{currentQuestion.question}</h2>
          <div className="space-y-3">
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
                currentQuestionIndex < quizQuestions.length - 1 ? (
                   <button onClick={handleNext} className="bg-green-500 text-white font-semibold py-2 px-6 rounded-lg hover:bg-green-600 transition-colors">
                    다음
                  </button>
                ) : (
                   <button onClick={onFinish} className="bg-green-500 text-white font-semibold py-2 px-6 rounded-lg hover:bg-green-600 transition-colors">
                    종료
                  </button>
                )
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="p-4 sm:p-6 md:p-8 h-full flex flex-col">
       <div className="flex-shrink-0">
         <button onClick={onFinish} className="mb-8 bg-gray-200 text-gray-800 font-semibold py-2 px-4 rounded-lg hover:bg-gray-300 transition-colors text-sm flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
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

