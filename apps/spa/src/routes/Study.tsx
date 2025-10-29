import React, { useState } from 'react';
import Layout from '../components/Layout';
import LearningRoadmap from '../study/LearningRoadmap';
import ConceptModal from '../study/ConceptModal';
import CodePlayground from '../study/CodePlayground';
import AiQuiz from '../study/AiQuiz';
import StudyNotes from '../study/StudyNotes';
import AiSearchButton from '../study/AiSearchButton';

type View = 'studyNote' | 'roadmap' | 'playground' | 'quiz';

export default function StudyPage() {
  const [view, setView] = useState<View>('roadmap');
  const [concept, setConcept] = useState<{ url: string; title: string } | null>(
    null
  );

  return (
    <Layout mainClassName="flex flex-col font-sans px-0 py-0">
      <header className=" bg-white shadow-sm sticky top-[var(--header-height,56px)] z-10">
        <div className="mx-auto max-w-6xl px-4">
          <div className="absolute -top-2 left-0 right-0 ">
            <nav
              className="-mb-px flex flex-wrap items-center gap-3 px-0"
              aria-label="Tabs"
            >
              <button
                onClick={() => setView('studyNote')}
                className={`!bg-sky-900 ${view === 'studyNote' ? 'border-sky-500 text-sky-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
              >
                스터디 노트
              </button>
              <button
                onClick={() => setView('roadmap')}
                className={`!bg-sky-900 ${view === 'roadmap' ? 'border-sky-500 text-sky-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
              >
                학습 로드맵
              </button>
            </nav>
          </div>
        </div>
      </header>

      <div className="flex-1 mt-12 overflow-auto">
        {view === 'studyNote' && <StudyNotes />}
        {view === 'roadmap' && (
          <LearningRoadmap
            onConceptClick={(url, title) => setConcept({ url, title })}
            onGoPlayground={() => setView('playground')}
            onGoQuiz={() => setView('quiz')}
          />
        )}
        {view === 'playground' && (
          <CodePlayground onBack={() => setView('roadmap')} />
        )}
        {view === 'quiz' && <AiQuiz onFinish={() => setView('roadmap')} />}
      </div>

      <ConceptModal
        isOpen={!!concept}
        url={concept?.url || ''}
        title={concept?.title || ''}
        onClose={() => setConcept(null)}
      />
      <AiSearchButton />
    </Layout>
  );
}
