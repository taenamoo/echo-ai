import type { NormalizedRequest, NormalizedResponse } from './types';
import { verifyTokenDetailed } from '@echo-ai/auth';
import { getConfig } from '@echo-ai/config';
import { S3Client, type S3ClientConfig } from '@aws-sdk/client-s3';
import { createPresignedPost } from '@aws-sdk/s3-presigned-post';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';

function json(status: number, body: unknown): NormalizedResponse { return { status, headers: { 'content-type': 'application/json; charset=utf-8' }, body }; }
function ok(body: unknown) { return json(200, body); }
function badRequest(message: string) { return json(400, { message }); }
function unauthorized(message: string) { return json(401, { message }); }

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

function bearer(headers: Record<string, string | undefined>): string | null {
  const auth = headers['authorization'] || headers['Authorization'];
  if (!auth) return null;
  return auth.startsWith('Bearer ') ? auth.substring(7) : auth;
}

function buildClient() {
  const cfg = getConfig();
  const IS_LOCAL = cfg.stage === 'local';
  // prefer browser-accessible endpoint for local presign (LocalStack)
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

export async function createPresignHandler(req: NormalizedRequest): Promise<NormalizedResponse> {
  const token = bearer(req.headers);
  if (!token) return unauthorized('인증 토큰이 없습니다.');
  const vr = verifyTokenDetailed(token);
  if (!vr.ok) return unauthorized(vr.reason === 'expired' ? '만료된 토큰입니다.' : '유효하지 않은 토큰입니다.');
  const userId = (vr.payload as any)?.userId as string;
  if (!userId) return unauthorized('유효하지 않은 토큰입니다.');

  const BodySchema = z.object({
    filename: z.string().min(1),
    contentType: z.string().min(1),
    size: z.number().int().nonnegative().optional(),
  });
  const parsed = req.body ? safeJson<unknown>(req.body) : {};
  const check = BodySchema.safeParse(parsed);
  if (!check.success) return badRequest('filename과 contentType은 필수입니다.');
  const { filename, contentType, size: sizeOpt } = check.data as any;
  const size = Number(sizeOpt || 0);

  if (!isValidFilename(filename)) return badRequest('허용되지 않는 파일 이름입니다.');
  if (!hasAllowedExtension(filename)) return badRequest('허용되지 않는 파일 확장자입니다. (.txt/.md/.pdf/.docs)');
  if (!(ALLOWED_TYPES as readonly string[]).includes(contentType)) return badRequest('허용되지 않은 Content-Type 입니다.');

  const cfg = getConfig();
  const MAX_UPLOAD_SIZE_MB = Number(process.env.MAX_UPLOAD_SIZE_MB || 25);
  const MAX_BYTES = MAX_UPLOAD_SIZE_MB * 1024 * 1024;
  if (size && size > MAX_BYTES) return badRequest(`파일 크기가 제한(${MAX_UPLOAD_SIZE_MB}MB)을 초과했습니다.`);

  const documentId = uuidv4();
  const key = `uploads/${userId}/${documentId}/${filename}`;
  const client = buildClient();
  const expiresIn = 600; // seconds
  const { url, fields } = await createPresignedPost(client, {
    Bucket: cfg.s3BucketName,
    Key: key,
    Conditions: [ ['content-length-range', 0, MAX_BYTES], { 'Content-Type': contentType } ],
    Fields: { 'Content-Type': contentType },
    Expires: Math.floor(expiresIn / 1),
  });

  return ok({ method: 'POST', url, fields, bucket: cfg.s3BucketName, key, expiration: expiresIn, documentId });
}

function safeJson<T>(raw: string): T | null { try { return JSON.parse(raw) as T; } catch { return null; } }

