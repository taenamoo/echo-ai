import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api/auth';
import { summarizeDocumentHandler, summarizeDocumentSyncHandler } from '@echo-ai/api-core';
import { getConfig } from '@echo-ai/config';

const config = getConfig();
// Enforce async-by-default; allow opt-out only via explicit flag for transition
const ALLOW_SYNC_SUMMARIZE = /^true$/i.test(process.env.ALLOW_SYNC_SUMMARIZE || '');
const SUMMARIZE_ASYNC = !ALLOW_SYNC_SUMMARIZE;

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ documentId: string }> }
) {
  try {
    const auth = requireAuth(req);
    if (!auth.ok) return auth.res;
    const { documentId } = await context.params;

    if (SUMMARIZE_ASYNC) {
      const res = await summarizeDocumentHandler({
        method: 'POST',
        path: `/api/documents/${documentId}/summarize`,
        headers: Object.fromEntries(req.headers.entries()),
        params: { id: documentId },
      });
      return NextResponse.json(res.body ?? {}, { status: res.status, headers: res.headers });
    }
    // 동기 요약 경로(로컬/특정 환경용)
    const res = await summarizeDocumentSyncHandler({
      method: 'POST',
      path: `/api/documents/${documentId}/summarize`,
      headers: Object.fromEntries(req.headers.entries()),
      params: { id: documentId },
    });
    return NextResponse.json(res.body ?? {}, { status: res.status, headers: res.headers });
  } catch (error: any) {
    console.error('Summarize Error:', error);
    return NextResponse.json({ message: '문서 요약 중 오류가 발생했습니다.' }, { status: 500 });
  }
}
