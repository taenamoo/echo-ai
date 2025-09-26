import { NextRequest, NextResponse } from 'next/server';
import { meHandler } from '@echo-ai/api-core';

export async function GET(req: NextRequest) {
  try {
    const res = await meHandler({
      method: 'GET',
      path: '/api/me',
      headers: Object.fromEntries(req.headers.entries()),
    });
    return NextResponse.json(res.body ?? {}, { status: res.status, headers: res.headers });
  } catch (error) {
    console.error('GET /api/me error', error);
    return NextResponse.json({ message: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}

