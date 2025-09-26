import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { requireAuth } from '@/lib/api/auth';
import { s3Client } from '@echo-ai/aws-clients';
import { createDocumentHandler, listDocumentsHandler } from '@echo-ai/api-core';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { getConfig } from '@echo-ai/config';

const { s3BucketName: S3_BUCKET_NAME } = getConfig();

export async function POST(req: NextRequest) {
  try {
    const auth = requireAuth(req);
    if (!auth.ok) return auth.res;
    const userId = auth.userId;

    const contentType = req.headers.get('content-type') || '';

    // Branch A: JSON metadata save (presigned upload flow)
    if (contentType.includes('application/json')) {
      const raw = await req.text();
      const res = await createDocumentHandler({
        method: 'POST',
        path: '/api/documents',
        headers: Object.fromEntries(req.headers.entries()),
        body: raw,
      });
      return NextResponse.json(res.body ?? {}, { status: res.status, headers: res.headers });
    }

    // Branch B: legacy multipart upload (server-side upload)
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ message: '파일이 필요합니다.' }, { status: 400 });
    }
    // 정책 검증: 확장자/타입/크기
    if (!isAllowedExtension(file.name)) {
      return NextResponse.json({ message: '허용되지 않는 파일 확장자입니다. (.txt/.md/.pdf/.docs)' }, { status: 400 });
    }
    if (file.type && !isAllowedMime(file.type)) {
      return NextResponse.json({ message: '허용되지 않은 Content-Type 입니다.' }, { status: 400 });
    }
    if (!isAllowedSize(file.size)) {
      return NextResponse.json({ message: '파일 크기가 제한(25MB)을 초과했습니다.' }, { status: 400 });
    }
    const documentId = uuidv4();
    const fileBuffer = Buffer.from(await file.arrayBuffer());
    const s3Key = `uploads/${userId}/${documentId}/${file.name}`;

    const s3Command = new PutObjectCommand({
      Bucket: S3_BUCKET_NAME,
      Key: s3Key,
      Body: fileBuffer,
      ContentType: file.type,
    });
    await s3Client.send(s3Command);

    const res = await createDocumentHandler({
      method: 'POST',
      path: '/api/documents',
      headers: Object.fromEntries(req.headers.entries()),
      body: JSON.stringify({ key: s3Key, filename: file.name, filetype: file.type || null, filesize: file.size || null, documentId }),
    });
    return NextResponse.json(res.body ?? { documentId }, { status: res.status, headers: res.headers });

  } catch (error: any) {
    console.error('File Upload/Metadata API Error:', error);
    if (error.name === 'JsonWebTokenError') {
        return NextResponse.json({ message: '손상된 토큰입니다.' }, { status: 401 });
    }
    return NextResponse.json({ message: '파일 업로드 중 서버 오류가 발생했습니다.' }, { status: 500 });
  }
}

// DB 레코드는 공유 핸들러를 통해 생성합니다.

function timeOr(x: any, key: 'createdAt'|'updatedAt') {
  return new Date((x?.[key] || x?.createdAt || 0)).getTime();
}

// 업로드 정책 유틸리티
const MAX_UPLOAD_SIZE_MB = Number(process.env.MAX_UPLOAD_SIZE_MB || 25);
const MAX_BYTES = MAX_UPLOAD_SIZE_MB * 1024 * 1024;
const ALLOWED_EXTENSIONS = ['.txt', '.md', '.pdf', '.docs'] as const;
const ALLOWED_TYPES = [
  'text/plain',
  'text/markdown',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
] as const;

function isAllowedExtension(name: string): boolean {
  const lower = (name || '').toLowerCase();
  return ALLOWED_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

function isAllowedMime(type?: string | null): boolean {
  if (!type) return true; // mime 미전달 시 확장자 검증으로 커버
  return (ALLOWED_TYPES as readonly string[]).includes(type);
}

function isAllowedSize(size?: number | null): boolean {
  const n = Number(size || 0);
  return n >= 0 && n <= MAX_BYTES;
}

// GET /api/documents?limit=20&cursor=<base64>
export async function GET(req: NextRequest) {
  try {
    const searchParams = Object.fromEntries(new URL(req.url).searchParams.entries());
    const res = await listDocumentsHandler({
      method: 'GET',
      path: '/api/documents',
      headers: Object.fromEntries(req.headers.entries()),
      query: searchParams,
    });
    return NextResponse.json(res.body ?? {}, { status: res.status, headers: res.headers });
  } catch (error) {
    console.error('List Documents Error:', error);
    return NextResponse.json({ message: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
