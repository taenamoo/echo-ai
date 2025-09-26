import React, { useState } from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import LearningRoadmap from '../study/LearningRoadmap';
import ConceptModal from '../study/ConceptModal';
import CodePlayground from '../study/CodePlayground';
import AiQuiz from '../study/AiQuiz';
import StudyNotes from '../study/StudyNotes';
import AiSearchButton from '../study/AiSearchButton';

type View = 'studyNote' | 'roadmap' | 'playground' | 'quiz';

export default function StudyPage() {
  const [view, setView] = useState<View>('roadmap');
  const [concept, setConcept] = useState<{ url: string; title: string } | null>(null);

  return (
    <div className="flex flex-col min-h-with-header bg-gray-100 font-sans">
      <Header />
      <header className="bg-white shadow-sm sticky top-0 z-20">
        <div className="container mx-auto px-4">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8 px-4" aria-label="Tabs">
              <h1 className="text-xl font-bold text-gray-800">React 스터디</h1>
              <button onClick={() => setView('studyNote')} className={`${view === 'studyNote' ? 'border-sky-500 text-sky-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}>스터디 노트</button>
              <button onClick={() => setView('roadmap')} className={`${view === 'roadmap' ? 'border-sky-500 text-sky-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}>학습 로드맵</button>
            </nav>
          </div>
        </div>
      </header>

      <div className="flex-grow overflow-auto">
        {view === 'studyNote' && <StudyNotes />}
        {view === 'roadmap' && (
          <LearningRoadmap
            onConceptClick={(url, title) => setConcept({ url, title })}
            onGoPlayground={() => setView('playground')}
            onGoQuiz={() => setView('quiz')}
          />
        )}
        {view === 'playground' && <CodePlayground onBack={() => setView('roadmap')} />}
        {view === 'quiz' && <AiQuiz onFinish={() => setView('roadmap')} />}
      </div>

      <ConceptModal isOpen={!!concept} url={concept?.url || ''} title={concept?.title || ''} onClose={() => setConcept(null)} />
      <AiSearchButton />
      <Footer />
    </div>
  );
}
