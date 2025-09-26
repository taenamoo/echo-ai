import { api } from './api';

export async function listStudies() {
  return api('/study');
}
export async function createStudy(input: any) {
  return api('/study', { method: 'POST', json: input });
}
export async function updateStudy(id: string, patch: any) {
  return api(`/study/${id}`, { method: 'PUT', json: patch });
}
export async function deleteStudy(id: string) {
  return api(`/study/${id}`, { method: 'DELETE' });
}
export async function generateQuiz(content: string, count = 5) {
  return api('/study/quiz', { method: 'POST', json: { content, count } });
}
export async function analyzeStudy(input: { title?: string; content?: string; good_example?: string; bad_example?: string }) {
  return api('/study/analyze', { method: 'POST', json: input });
}
