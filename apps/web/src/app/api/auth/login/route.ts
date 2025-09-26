import { NextRequest, NextResponse } from 'next/server';
import { loginHandler } from '@echo-ai/api-core';

export async function POST(req: NextRequest) {
  try {
    const body = await req.text();
    const res = await loginHandler({
      method: 'POST',
      path: '/api/auth/login',
      headers: Object.fromEntries(req.headers.entries()),
      body,
    });
    return NextResponse.json(res.body ?? {}, { status: res.status, headers: res.headers });
  } catch (error) {
    console.error('Login Error:', error);
    return NextResponse.json({ message: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
