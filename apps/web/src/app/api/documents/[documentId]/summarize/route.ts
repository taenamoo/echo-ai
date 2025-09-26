import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api/auth';
import { summarizeDocumentHandler } from '@echo-ai/api-core';
import { getConfig } from '@echo-ai/config';

const config = getConfig();
const SUMMARIZE_ASYNC = /^true$/i.test(
  process.env.SUMMARIZE_ASYNC ?? (config.stage === 'local' ? 'true' : '')
);

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

    return NextResponse.json({ message: '동기 요약은 비활성화되어 있습니다.' }, { status: 501 });
  } catch (error: any) {
    console.error('Summarize Error:', error);
    return NextResponse.json({ message: '문서 요약 중 오류가 발생했습니다.' }, { status: 500 });
  }
}

