import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  // Protect API under /api/documents with simple header presence check
  if (pathname.startsWith('/api/documents')) {
    const auth = req.headers.get('authorization');
    if (!auth || auth.trim() === '') {
      return new NextResponse(
        JSON.stringify({ message: '인증 토큰이 없습니다.' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/api/documents/:path*'],
};

