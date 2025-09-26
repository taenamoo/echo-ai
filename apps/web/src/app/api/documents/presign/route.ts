import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api/auth';
import { createPresignHandler } from '@echo-ai/api-core';

export async function POST(req: NextRequest) {
  try {
    const auth = requireAuth(req);
    if (!auth.ok) return auth.res;
    const raw = await req.text();
    const res = await createPresignHandler({
      method: 'POST',
      path: '/api/documents/presign',
      headers: Object.fromEntries(req.headers.entries()),
      body: raw,
    });
    return NextResponse.json(res.body ?? {}, { status: res.status, headers: res.headers });
  } catch (err) {
    console.error('Presign Error:', err);
    return NextResponse.json({ message: 'Pre-signed URL 생성 중 오류가 발생했습니다.' }, { status: 500 });
  }
}

