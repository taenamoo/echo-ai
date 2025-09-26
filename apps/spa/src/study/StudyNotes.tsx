import React, { useEffect, useState } from 'react';
import { listStudies, createStudy, deleteStudy, updateStudy, analyzeStudy } from '../studyApi';

type Study = { study_id: string; parent_id: string | null; title: string; content?: string | null; good_example?: string | null; bad_example?: string | null; ai_suggestion?: string | null; reference_links?: string[]; children?: Study[] };

export default function StudyNotes() {
  const [tree, setTree] = useState<Study[]>([]);
  const [selected, setSelected] = useState<Study | null>(null);
  const [busy, setBusy] = useState(false);

  async function refresh(selectId?: string) {
    const data = await listStudies();
    setTree(data || []);
    if (selectId) {
      const find = findById(data || [], selectId);
      if (find) setSelected(find);
    } else if (!selected && data && data.length > 0) {
      setSelected(data[0]);
    }
  }

  useEffect(() => { refresh().catch(() => {}); }, []);

  function findById(nodes: Study[], id: string): Study | null {
    for (const n of nodes) {
      if (n.study_id === id) return n;
      const c = findById(n.children || [], id);
      if (c) return c;
    }
    return null;
  }

  async function addRoot() {
    const title = window.prompt('새 상위 메뉴 제목을 입력하세요');
    if (!title) return;
    setBusy(true);
    try { await createStudy({ title, study_order: 0 }); await refresh(); } finally { setBusy(false); }
  }

  async function addChild(parentId: string) {
    const title = window.prompt('새 하위 메뉴 제목을 입력하세요');
    if (!title) return;
    setBusy(true);
    try { await createStudy({ title, study_order: 0, parent_id: parentId }); await refresh(parentId); } finally { setBusy(false); }
  }

  async function runAnalyze(s: Study) {
    setBusy(true);
    try {
      const res = await analyzeStudy({ title: s.title, content: s.content || '', good_example: s.good_example || '', bad_example: s.bad_example || '' });
      const suggestion = (res?.suggestion as string) || '';
      await updateStudy(s.study_id, { ai_suggestion: suggestion });
      await refresh(s.study_id);
    } finally { setBusy(false); }
  }

  async function remove(study: Study) {
    if (!window.confirm('삭제하시겠습니까? 하위 항목도 함께 삭제됩니다.')) return;
    setBusy(true);
    try { await deleteStudy(study.study_id); await refresh(); } finally { setBusy(false); }
  }

  return (
    <div className="flex h-full">
      <aside className="w-1/4 min-w-[280px] bg-white p-6 overflow-y-auto border-r border-gray-200">
        <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">스터디 목록</h2>
        <nav className="space-y-1">
          {(tree || []).map((main) => (
            <div key={main.study_id}>
              <div
                className={`group flex justify-between items-center p-2 rounded-md cursor-pointer transition-colors ${selected?.study_id === main.study_id ? 'bg-sky-100 text-sky-700' : 'text-gray-700 hover:bg-gray-100'}`}
                onClick={() => setSelected(main)}
              >
                <span className="font-semibold text-sm">{main.title}</span>
                <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                  <button onClick={(e) => { e.stopPropagation(); void addChild(main.study_id); }} className="text-sky-500 hover:bg-sky-100 p-1 rounded-full">+</button>
                  <button onClick={(e) => { e.stopPropagation(); void remove(main); }} className="text-red-500 hover:bg-red-100 p-1 rounded-full">x</button>
                </div>
              </div>
              {(main.children || []).length > 0 && (
                <div className="ml-4 mt-1 pl-2 border-l-2 border-gray-200 space-y-1">
                  {(main.children || []).map((sub) => (
                    <div key={sub.study_id} className={`group flex justify-between items-center p-2 rounded-md cursor-pointer transition-colors text-sm ${selected?.study_id === sub.study_id ? 'bg-sky-100 text-sky-700' : 'text-gray-600 hover:bg-gray-100'}`} onClick={() => setSelected(sub)}>
                      <span>{sub.title}</span>
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={(e) => { e.stopPropagation(); void remove(sub); }} className="text-red-500 hover:bg-red-100 p-1 rounded-full">x</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </nav>
        <button onClick={() => void addRoot()} disabled={busy} className="w-full mt-6 bg-sky-500 text-white font-bold py-2 px-4 rounded-lg hover:bg-sky-600 transition-colors text-sm">+ 새 상위 메뉴</button>
      </aside>

      <main className="flex-grow p-4 sm:p-6 md:p-8 overflow-y-auto">
        {!selected ? (
          <div className="text-gray-500">좌측에서 스터디를 선택하세요.</div>
        ) : (
          <div className="bg-white p-6 sm:p-8 rounded-lg shadow-lg">
            <div className="flex justify-between items-center mb-6 pb-6 border-b">
              <h1 className="text-3xl font-bold text-gray-800">{selected.title}</h1>
              <div className="flex gap-2">
                {!selected.parent_id && (
                  <button onClick={() => void addChild(selected.study_id)} className="bg-gray-100 text-gray-700 font-semibold py-2 px-4 rounded-lg hover:bg-gray-200 transition-colors">하위 메뉴 추가</button>
                )}
                {selected.parent_id && (
                  <button onClick={() => void runAnalyze(selected)} className="bg-sky-500 text-white font-semibold py-2 px-4 rounded-lg hover:bg-sky-600 transition-colors">AI 분석</button>
                )}
                <button onClick={() => void remove(selected)} className="bg-red-100 text-red-700 font-semibold py-2 px-4 rounded-lg hover:bg-red-200 transition-colors">삭제</button>
              </div>
            </div>
            <div className="mb-8">
              <h3 className="font-bold text-lg mb-2 text-gray-700 flex items-center gap-2">내용</h3>
              <div className="prose max-w-none text-gray-600 leading-relaxed bg-gray-50 p-4 rounded-md" dangerouslySetInnerHTML={{ __html: (selected.content || '등록된 내용이 없습니다.').replace(/\n/g, '<br />') }} />
            </div>
            {selected.parent_id && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
                <div>
                  <h3 className="font-bold text-lg mb-2 text-green-600">좋은 예시</h3>
                  <pre className="bg-gray-800 text-white p-4 rounded-lg text-sm overflow-x-auto"><code>{selected.good_example || ''}</code></pre>
                </div>
                <div>
                  <h3 className="font-bold text-lg mb-2 text-red-600">나쁜 예시</h3>
                  <pre className="bg-gray-800 text-white p-4 rounded-lg text-sm overflow-x-auto"><code>{selected.bad_example || ''}</code></pre>
                </div>
              </div>
            )}
            {selected.ai_suggestion && (
              <div className="mt-8">
                <h3 className="font-bold text-lg mb-2 text-sky-600">AI 추가의견</h3>
                <div className="prose max-w-none text-gray-600 leading-relaxed bg-sky-50 p-4 rounded-md" dangerouslySetInnerHTML={{ __html: selected.ai_suggestion.replace(/\n/g, '<br />') }} />
              </div>
            )}
            <div className="mt-8">
              <h3 className="font-bold text-lg mb-2 text-gray-700">🔗 참고 링크</h3>
              <div className="text-gray-600">
                {(selected.reference_links && selected.reference_links.length > 0) ? (
                  <ul className="list-disc pl-5 space-y-2">
                    {selected.reference_links.map((link, idx) => (
                      <li key={idx}><a href={link} target="_blank" rel="noopener noreferrer" className="text-sky-600 hover:underline">{link}</a></li>
                    ))}
                  </ul>
                ) : '등록된 링크가 없습니다.'}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
