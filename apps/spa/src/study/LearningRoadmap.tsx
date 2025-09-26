import React from 'react';

export type LearningRoadmapProps = {
  onConceptClick: (url: string, title: string) => void;
  onGoPlayground: () => void;
  onGoQuiz: () => void;
};

const PATH = [
  {
    category: '기초 다지기',
    icon: '🎓',
    concepts: [
      { title: 'JSX로 마크업 작성하기', description: 'JavaScript에 XML을 추가한 확장 문법을 배워보세요.', url: 'https://ko.react.dev/learn/writing-markup-with-jsx' },
      { title: '컴포넌트와 Props', description: 'UI를 재사용 가능한 조각으로 나누는 방법을 알아봅니다.', url: 'https://ko.react.dev/learn/your-first-component' },
      { title: '조건부 렌더링', description: '조건에 따라 다른 마크업을 표시하는 방법을 학습합니다.', url: 'https://ko.react.dev/learn/conditional-rendering' },
      { title: '리스트 렌더링', description: '데이터 배열을 컴포넌트 목록으로 변환하는 방법을 배워보세요.', url: 'https://ko.react.dev/learn/rendering-lists' },
    ],
  },
  {
    category: '핵심 Hooks 마스터',
    icon: '🎣',
    concepts: [
      { title: 'State: 컴포넌트의 기억', description: '컴포넌트의 메모리, State를 다루는 법을 학습합니다.', url: 'https://ko.react.dev/learn/state-a-components-memory' },
      { title: '이벤트에 응답하기', description: '사용자 상호작용에 반응하는 방법을 배워보세요.', url: 'https://ko.react.dev/learn/responding-to-events' },
      { title: 'useState Hook', description: '함수 컴포넌트에서 state를 추가하고 관리합니다.', url: 'https://ko.react.dev/reference/react/useState' },
      { title: 'useEffect Hook', description: '컴포넌트를 외부 시스템과 동기화하는 방법을 배웁니다.', url: 'https://ko.react.dev/reference/react/useEffect' },
      { title: 'useContext Hook', description: 'Props drilling 없이 데이터를 전달하는 방법을 알아봅니다.', url: 'https://ko.react.dev/reference/react/useContext' },
    ],
  },
  {
    category: '고급 개념 정복',
    icon: '🚀',
    concepts: [
      { title: '상태 끌어올리기', description: '여러 컴포넌트 간에 state를 공유하는 방법을 학습합니다.', url: 'https://ko.react.dev/learn/sharing-state-between-components' },
      { title: 'useReducer Hook', description: '복잡한 state 로직을 컴포넌트 외부로 추출합니다.', url: 'https://ko.react.dev/reference/react/useReducer' },
      { title: 'Ref로 값 참조하기', description: '렌더링에 필요하지 않은 값을 참조하는 방법을 알아봅니다.', url: 'https://ko.react.dev/reference/react/useRef' },
    ],
  },
];

export default function LearningRoadmap({ onConceptClick, onGoPlayground, onGoQuiz }: LearningRoadmapProps) {
  return (
    <div className="p-4 sm:p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        <header className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">React 학습 로드맵</h1>
          <p className="text-lg text-gray-600">체계적인 학습 경로를 따라 React를 마스터하세요.</p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
          <div className="bg-white rounded-lg shadow-lg p-6 flex flex-col items-start hover:shadow-xl hover:-translate-y-1 transition-all">
            <div className="bg-sky-100 text-sky-600 p-3 rounded-full mb-4">📘</div>
            <h2 className="text-xl font-bold text-gray-800 mb-2">핵심 개념 학습</h2>
            <p className="text-gray-600 mb-4 flex-grow">React의 핵심 개념들을 공식 문서와 함께 학습합니다.</p>
            <button onClick={() => onConceptClick(PATH[0].concepts[0].url, PATH[0].concepts[0].title)} className="mt-auto w-full bg-sky-500 text-white font-semibold py-2 px-4 rounded-lg hover:bg-sky-600">시작하기</button>
          </div>
          <div className="bg-white rounded-lg shadow-lg p-6 flex flex-col items-start hover:shadow-xl hover:-translate-y-1 transition-all">
            <div className="bg-green-100 text-green-600 p-3 rounded-full mb-4">💻</div>
            <h2 className="text-xl font-bold text-gray-800 mb-2">코드 연습장</h2>
            <p className="text-gray-600 mb-4 flex-grow">코드를 직접 작성하고 실시간으로 결과를 확인하며 실습합니다.</p>
            <button onClick={onGoPlayground} className="mt-auto w-full bg-green-500 text-white font-semibold py-2 px-4 rounded-lg hover:bg-green-600">이동하기</button>
          </div>
          <div className="bg-white rounded-lg shadow-lg p-6 flex flex-col items-start hover:shadow-xl hover:-translate-y-1 transition-all">
            <div className="bg-yellow-100 text-yellow-600 p-3 rounded-full mb-4">🧠</div>
            <h2 className="text-xl font-bold text-gray-800 mb-2">AI 퀴즈</h2>
            <p className="text-gray-600 mb-4 flex-grow">AI가 생성한 퀴즈를 풀며 학습한 내용을 점검하고 복습합니다.</p>
            <button onClick={onGoQuiz} className="mt-auto w-full bg-yellow-500 text-white font-semibold py-2 px-4 rounded-lg hover:bg-yellow-600">도전하기</button>
          </div>
        </div>

        {PATH.map((grp) => (
          <section key={grp.category} className="mb-10">
            <h3 className="text-xl font-semibold mb-2">{grp.icon} {grp.category}</h3>
            <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {grp.concepts.map((c) => (
                <li key={c.title} className="border rounded p-4 bg-white hover:shadow">
                  <div className="font-medium">{c.title}</div>
                  <div className="text-sm text-gray-600 mb-2">{c.description}</div>
                  <button onClick={() => onConceptClick(c.url, c.title)} className="text-blue-600 hover:underline text-sm">자세히 보기</button>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}

