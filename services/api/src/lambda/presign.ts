import type { APIGatewayProxyHandlerV2 } from 'aws-lambda';
import { getAuthToken, badRequest, ok, unauthorized, serverError } from './http';
import { verifyTokenDetailed } from '@echo-ai/auth';
import { getConfig } from '@echo-ai/config';
import { S3Client, type S3ClientConfig } from '@aws-sdk/client-s3';
import { createPresignedPost } from '@aws-sdk/s3-presigned-post';
import { v4 as uuidv4 } from 'uuid';

const ALLOWED_EXTENSIONS = ['.txt', '.md', '.pdf', '.docs'] as const;
const ALLOWED_TYPES = [
  'text/plain',
  'text/markdown',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
] as const;

function isValidFilename(name: string): boolean {
  if (!name || name.length > 128) return false;
  if (name.startsWith('.')) return false;
  return !(/[\/\\:*?"<>|]/.test(name));
}
function hasAllowedExtension(name: string): boolean {
  const lower = (name || '').toLowerCase();
  return ALLOWED_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

function buildClient() {
  const cfg = getConfig();
  const IS_LOCAL = cfg.stage === 'local';
  const endpoint = IS_LOCAL ? (cfg.s3PublicEndpoint ?? cfg.s3Endpoint) : cfg.s3Endpoint;
  const base: S3ClientConfig = {
    region: cfg.awsRegion,
    credentials: IS_LOCAL ? { accessKeyId: cfg.awsAccessKeyId || 'dummy', secretAccessKey: cfg.awsSecretAccessKey || 'dummy' } : undefined,
  };
  const finalCfg: any = { ...base };
  if (endpoint) finalCfg.endpoint = endpoint;
  finalCfg.forcePathStyle = true;
  return new S3Client(finalCfg);
}

export const createPresign: APIGatewayProxyHandlerV2 = async (event) => {
  try {
    // auth
    const token = getAuthToken(event.headers || {});
    if (!token) return unauthorized('인증 토큰이 없습니다.');
    const status = verifyTokenDetailed(token);
    if (!status.ok) return unauthorized(status.reason === 'expired' ? '만료된 토큰입니다.' : '유효하지 않은 토큰입니다.');
    const userId = (status.payload as any)?.userId as string;
    if (!userId) return unauthorized('유효하지 않은 토큰입니다.');

    const cfg = getConfig();
    const MAX_UPLOAD_SIZE_MB = Number(process.env.MAX_UPLOAD_SIZE_MB || 25);
    const MAX_BYTES = MAX_UPLOAD_SIZE_MB * 1024 * 1024;

    const body = event.body ? JSON.parse(event.body) : {};
    const filename: string | undefined = body?.filename;
    const contentType: string | undefined = body?.contentType;
    const size = Number(body?.size || 0);

    if (!filename || !contentType) return badRequest('filename과 contentType은 필수입니다.');
    if (!isValidFilename(filename)) return badRequest('허용되지 않는 파일 이름입니다.');
    if (!hasAllowedExtension(filename)) return badRequest('허용되지 않는 파일 확장자입니다. (.txt/.md/.pdf/.docs)');
    if (!(ALLOWED_TYPES as readonly string[]).includes(contentType)) return badRequest('허용되지 않은 Content-Type 입니다.');
    if (size && size > MAX_BYTES) return badRequest(`파일 크기가 제한(${MAX_UPLOAD_SIZE_MB}MB)을 초과했습니다.`);

    const documentId = uuidv4();
    const key = `uploads/${userId}/${documentId}/${filename}`;

    const client = buildClient();
    const expiresIn = 600;
    const { url, fields } = await createPresignedPost(client, {
      Bucket: cfg.s3BucketName,
      Key: key,
      Conditions: [ ['content-length-range', 0, MAX_BYTES], { 'Content-Type': contentType } ],
      Fields: { 'Content-Type': contentType },
      Expires: Math.floor(expiresIn / 1),
    });

    return ok({ method: 'POST', url, fields, bucket: cfg.s3BucketName, key, expiration: expiresIn, documentId });
  } catch (e) {
    console.error('Presign handler error', e);
    return serverError('Pre-signed URL 생성 중 오류가 발생했습니다.');
  }
};

