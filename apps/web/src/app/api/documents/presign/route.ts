import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api/auth';
import { v4 as uuidv4 } from 'uuid';
import { S3Client, S3ClientConfig } from '@aws-sdk/client-s3';
import { createPresignedPost } from '@aws-sdk/s3-presigned-post';
import { getConfig } from '@echo-ai/config';

const config = getConfig();
const BUCKET = config.s3BucketName;
const REGION = config.awsRegion;
const PUBLIC_ENDPOINT = config.s3PublicEndpoint; // e.g., http://localhost:4566 for LocalStack (browser-accessible)
const IS_LOCAL = config.stage === 'local';

const MAX_UPLOAD_SIZE_MB = Number(process.env.MAX_UPLOAD_SIZE_MB || 25);
const MAX_BYTES = MAX_UPLOAD_SIZE_MB * 1024 * 1024;

const ALLOWED_TYPES = [
  'text/plain',
  'text/markdown',
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/gif',
];

function buildPresignClient() {
  // In development, prefer PUBLIC endpoint so the browser can use the URL directly (e.g., localhost:4566)
  // In other environments, default to internal endpoint if provided, otherwise AWS default resolution
  const endpoint = IS_LOCAL ? PUBLIC_ENDPOINT ?? config.s3Endpoint : config.s3Endpoint;
  const credentials = IS_LOCAL
    ? {
        accessKeyId: config.awsAccessKeyId || 'dummy',
        secretAccessKey: config.awsSecretAccessKey || 'dummy',
      }
    : undefined;
  const cfg: S3ClientConfig = { region: REGION, credentials };
  if (endpoint) (cfg as any).endpoint = endpoint;
  // Path-style ensures LocalStack compatibility
  (cfg as any).forcePathStyle = true;
  return new S3Client(cfg);
}

function isValidFilename(name: string): boolean {
  // Allow most characters but block potentially harmful ones for path traversal.
  // 한글, 공백, 대부분의 특수문자를 허용하되, 경로 조작에 사용될 수 있는 문자는 차단합니다.
  if (!name || name.length > 128) return false;
  if (name.startsWith('.')) return false; // avoid hidden files
  // Block characters that are problematic in file paths or URLs like / \ : * ? " < > |
  return !/[/\\:*?"<>|]/.test(name);
}

export async function POST(req: NextRequest) {
  try {
    const auth = requireAuth(req);
    if (!auth.ok) return auth.res;
    const userId = auth.userId;

    const body = await req.json().catch(() => null);
    const filename = body?.filename as string | undefined;
    const contentType = body?.contentType as string | undefined;
    const size = Number(body?.size || 0);

    if (!filename || !contentType) {
      return NextResponse.json({ message: 'filename과 contentType은 필수입니다.' }, { status: 400 });
    }
    if (!isValidFilename(filename)) {
      return NextResponse.json({ message: '허용되지 않는 파일 이름입니다.' }, { status: 400 });
    }
    if (!ALLOWED_TYPES.includes(contentType)) {
      return NextResponse.json({ message: '허용되지 않은 Content-Type 입니다.' }, { status: 400 });
    }
    if (size && size > MAX_BYTES) {
      return NextResponse.json({ message: `파일 크기가 제한(${MAX_UPLOAD_SIZE_MB}MB)을 초과했습니다.` }, { status: 400 });
    }

    const documentId = uuidv4();
    const key = `uploads/${userId}/${documentId}/${filename}`;

    const client = buildPresignClient();
    const expiresIn = 600; // seconds
    const { url, fields } = await createPresignedPost(client, {
      Bucket: BUCKET!,
      Key: key,
      Conditions: [
        ['content-length-range', 0, MAX_BYTES],
        { 'Content-Type': contentType },
      ],
      Fields: {
        'Content-Type': contentType,
      },
      Expires: Math.floor(expiresIn / 1),
    });

    return NextResponse.json({
      method: 'POST',
      url,
      fields,
      bucket: BUCKET,
      key,
      expiration: expiresIn,
      documentId,
    });
  } catch (err: any) {
    console.error('Presign Error:', err);
    return NextResponse.json({ message: 'Pre-signed URL 생성 중 오류가 발생했습니다.' }, { status: 500 });
  }
}
