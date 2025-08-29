'use client';

import { useState, useEffect, FormEvent } from 'react';
import axios from 'axios';

interface Study {
  study_id: string;
  title: string;
  content: string;
  good_example: string;
  bad_example: string;
  study_order: number;
  parent_id: string | null;
  ai_suggestion?: string;
  children?: Study[];
  [key: string]: any;
}

type ViewMode = 'detail' | 'create' | 'edit';

export default function StudyPage() {
  const [studies, setStudies] = useState<Study[]>([]);
  const [selectedStudy, setSelectedStudy] = useState<Study | null>(null);
  const [mode, setMode] = useState<ViewMode>('create');
  const [isLoading, setIsLoading] = useState(true);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [formParentId, setFormParentId] = useState<string | null>(null);

  const fetchStudies = async (token: string) => {
    try {
      setIsLoading(true);
      const { data } = await axios.get('/api/study', { headers: { Authorization: `Bearer ${token}` } });
      const sortStudies = (items: Study[]): Study[] => {
        items.sort((a, b) => a.study_order - b.study_order);
        items.forEach(item => {
          if (item.children && item.children.length > 0) item.children = sortStudies(item.children);
        });
        return items;
      };
      const sortedStudies = sortStudies(data);
      setStudies(sortedStudies);
      if (sortedStudies.length > 0) {
        // [수정] 첫 번째 아이템을 선택하고 항상 'detail' 모드로 시작
        const firstItem = sortedStudies[0].children && sortedStudies[0].children.length > 0 ? sortedStudies[0].children[0] : sortedStudies[0];
        setSelectedStudy(firstItem);
        setMode('detail');
      } else {
        setMode('create');
        setFormParentId(null);
      }
    } catch (error) { console.error("Failed to fetch studies", error); } 
    finally { setIsLoading(false); }
  };

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) { window.location.href = window.location.origin; } 
    else { setAccessToken(token); fetchStudies(token); }
  }, []);

  const handleSelectStudy = (study: Study) => {
    setSelectedStudy(study);
    // [수정] 어떤 메뉴든 클릭하면 'detail' 모드로 설정
    setMode('detail');
  };

  const handleAddNew = (parentId: string | null = null) => {
    setSelectedStudy(null);
    setFormParentId(parentId);
    setMode('create');
  };

  const handleDelete = async (study: Study) => {
    const message = study.parent_id ? `"${study.title}" 항목을 삭제하시겠습니까?` : `상위 메뉴 "${study.title}"와 모든 하위 메뉴를 삭제하시겠습니까?`;
    if (window.confirm(message) && accessToken) {
      try {
        await axios.delete(`/api/study/${study.study_id}`, { headers: { Authorization: `Bearer ${accessToken}` } });
        await fetchStudies(accessToken);
      } catch (error) { alert('삭제에 실패했습니다.'); }
    }
  };

  const StudyForm = ({ study, parentId, onSave, onCancel }: { study: Partial<Study> | null, parentId: string | null, onSave: (savedStudy: Study) => void, onCancel: () => void }) => {
    const isSubMenu = !!parentId || !!study?.parent_id;
    const [formData, setFormData] = useState({
      title: study?.title || '',
      content: study?.content || '',
      good_example: study?.good_example || '',
      bad_example: study?.bad_example || '',
      study_order: study?.study_order || studies.length + 1,
      parent_id: parentId || study?.parent_id || null,
    });
    const [isAnalyzing, setIsAnalyzing] = useState(false);

    const handleSubmit = async (e: FormEvent) => {
      e.preventDefault();
      if (!accessToken) return;

      const url = study?.study_id ? `/api/study/${study.study_id}` : '/api/study';
      const method = study?.study_id ? 'put' : 'post';

      try {
        const { data: savedStudy } = await axios[method](url, formData, { headers: { Authorization: `Bearer ${accessToken}` } });
        
        if (isSubMenu) {
          setIsAnalyzing(true);
          const { data: analyzeData } = await axios.post('/api/study/analyze', formData, { headers: { Authorization: `Bearer ${accessToken}` } });
          
          const finalData = { ...savedStudy, ai_suggestion: analyzeData.suggestion };
          await axios.put(`/api/study/${savedStudy.study_id}`, finalData, { headers: { Authorization: `Bearer ${accessToken}` } });
          onSave(finalData);
        } else {
          onSave(savedStudy);
        }
      } catch (error) {
        alert('저장에 실패했습니다.');
      } finally {
        setIsAnalyzing(false);
      }
    };

    return (
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block font-bold">제목</label>
          <input type="text" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} disabled={isSubMenu && !!study} className="w-full p-2 border rounded text-black disabled:bg-gray-100" required />
        </div>
        {isSubMenu && (
          <>
            <div>
              <label className="block font-bold">내용</label>
              <textarea value={formData.content} onChange={e => setFormData({...formData, content: e.target.value})} className="w-full p-2 border rounded h-24 text-black"></textarea>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block font-bold">좋은 예시</label>
                <textarea value={formData.good_example} onChange={e => setFormData({...formData, good_example: e.target.value})} className="w-full p-2 border rounded h-32 text-black"></textarea>
              </div>
              <div>
                <label className="block font-bold">나쁜 예시</label>
                <textarea value={formData.bad_example} onChange={e => setFormData({...formData, bad_example: e.target.value})} className="w-full p-2 border rounded h-32 text-black"></textarea>
              </div>
            </div>
          </>
        )}
        <div>
          <label className="block font-bold">순서</label>
          <input type="number" value={formData.study_order} onChange={e => setFormData({...formData, study_order: Number(e.target.value)})} className="w-full p-2 border rounded text-black" required />
        </div>
        <div className="flex gap-4">
          <button type="button" onClick={onCancel} className="w-full bg-gray-500 text-white py-2 rounded hover:bg-gray-600">취소</button>
          <button type="submit" disabled={isAnalyzing} className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:bg-gray-400">
            {isAnalyzing ? 'AI 분석 중...' : (study?.study_id ? '수정하기' : '등록하기')}
          </button>
        </div>
      </form>
    );
  };
  
  if (isLoading || !accessToken) return <div className="flex h-screen items-center justify-center">로딩 중...</div>;

  return (
    <div className="flex h-screen bg-gray-100">
      <aside className="w-1/4 bg-white p-4 overflow-y-auto">
        <h2 className="text-xl font-bold mb-4 text-gray-800">스터디 목록</h2>
        <nav>
          {studies.map(mainMenu => (
            <div key={mainMenu.study_id} className="mb-2">
              <div className="flex items-center justify-between group">
                <a onClick={() => handleSelectStudy(mainMenu)} className={`flex-grow p-2 rounded cursor-pointer font-bold ${selectedStudy?.study_id === mainMenu.study_id ? 'bg-blue-500 text-white' : 'text-gray-800 hover:bg-gray-200'}`}>{mainMenu.title}</a>
                <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => handleAddNew(mainMenu.study_id)} className="text-xs text-blue-500 p-1 hover:bg-blue-100 rounded">+</button>
                  <button onClick={() => handleDelete(mainMenu)} className="text-xs text-red-500 p-1 hover:bg-red-100 rounded">x</button>
                </div>
              </div>
              {mainMenu.children && mainMenu.children.length > 0 && (
                <div className="ml-4 mt-1 space-y-1 border-l-2 pl-2">
                  {mainMenu.children.map(subMenu => (
                    <div key={subMenu.study_id} className="flex items-center justify-between group">
                      <a onClick={() => handleSelectStudy(subMenu)} className={`flex-grow p-2 rounded cursor-pointer text-sm ${selectedStudy?.study_id === subMenu.study_id ? 'bg-blue-400 text-white' : 'text-gray-600 hover:bg-gray-200'}`}>- {subMenu.title}</a>
                       <button onClick={() => handleDelete(subMenu)} className="text-xs text-red-500 p-1 opacity-0 group-hover:opacity-100 hover:bg-red-100 rounded">x</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </nav>
        <button onClick={() => handleAddNew(null)} className="w-full mt-4 bg-green-500 text-white py-2 rounded hover:bg-green-600">+ 새 상위 메뉴 등록</button>
      </aside>

      <main className="flex-1 p-8 overflow-y-auto">
        {/* [수정] 상세 보기와 수정/생성 폼을 분리하여 렌더링 */}

        {/* 상세 보기 화면 */}
        {mode === 'detail' && selectedStudy && (
          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="flex justify-between items-center mb-4">
              <h1 className="text-3xl font-bold text-gray-900">{selectedStudy.title}</h1>
              <button onClick={() => setMode('edit')} className="bg-yellow-500 text-white py-2 px-4 rounded hover:bg-yellow-600">수정</button>
            </div>
            <p className="mb-6 text-gray-700 whitespace-pre-wrap">{selectedStudy.content || "등록된 내용이 없습니다."}</p>
            {selectedStudy.parent_id && ( // 하위 메뉴일 때만 예시와 AI 의견 표시
              <>
                <div className="grid grid-cols-2 gap-6 mb-6">
                  <div>
                    <h3 className="text-lg font-semibold mb-2 text-green-700">👍 좋은 예시</h3>
                    <pre className="bg-green-50 p-4 rounded text-green-900 whitespace-pre-wrap">{selectedStudy.good_example}</pre>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold mb-2 text-red-700">👎 나쁜 예시</h3>
                    <pre className="bg-red-50 p-4 rounded text-red-900 whitespace-pre-wrap">{selectedStudy.bad_example}</pre>
                  </div>
                </div>
                {selectedStudy.ai_suggestion && (
                  <div className="mt-6">
                    <h3 className="text-lg font-semibold mb-2 text-indigo-700">🤖 AI 추가의견</h3>
                    <p className="bg-indigo-50 p-4 rounded text-indigo-900 whitespace-pre-wrap">{selectedStudy.ai_suggestion}</p>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* 생성 또는 수정 폼 화면 */}
        {(mode === 'create' || mode === 'edit') && (
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h1 className="text-2xl font-bold mb-4 text-gray-900">
              {mode === 'create' ? (formParentId ? '새 하위 메뉴 등록' : '새 상위 메뉴 등록') : `"${selectedStudy?.title}" 수정`}
            </h1>
            <StudyForm 
              study={mode === 'edit' ? selectedStudy : null} 
              parentId={formParentId} 
              onSave={(savedStudy) => { 
                fetchStudies(accessToken!); 
                setSelectedStudy(savedStudy); 
                setMode('detail'); 
              }}
              onCancel={() => {
                if (selectedStudy) setMode('detail'); // 수정 중 취소하면 상세 보기로
                else handleAddNew(null); // 새 등록 중 취소하면 새 상위 메뉴 등록으로
              }}
            />
          </div>
        )}
      </main>
    </div>
  );
}
