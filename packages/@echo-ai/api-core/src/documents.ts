import type { NormalizedRequest, NormalizedResponse } from './types';
import { dynamoDbDocumentClient, MAIN_TABLE_NAME, s3Client } from '@echo-ai/aws-clients';
import { GetCommand, PutCommand, QueryCommand, DeleteCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { ListObjectsV2Command, DeleteObjectsCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { verifyTokenDetailed } from '@echo-ai/auth';
import type { DocumentItem } from '@echo-ai/core-domain';
import { enqueueSummarizeJob } from '@echo-ai/documents';
import { getConfig } from '@echo-ai/config';
import { extractTextFromBuffer, streamToBuffer } from '@echo-ai/documents';
import { GoogleGenerativeAI, type GenerationConfig } from '@google/generative-ai';
import { DocumentCreateSchema, DocumentListQuerySchema } from './schemas';
import { ok, created, accepted, badRequest, unauthorized, forbidden, notFound, serverError, zodIssues } from './http';

// Use shared HTTP helpers to unify error format

function getAuth(headers: Record<string, string | undefined>): { ok: true; userId: string } | { ok: false; res: NormalizedResponse } {
  const auth = headers['authorization'] || headers['Authorization'];
  if (!auth) return { ok: false, res: unauthorized('인증 토큰이 없습니다.') } as const;
  const token = auth.startsWith('Bearer ') ? auth.substring(7) : auth;
  const r = verifyTokenDetailed(token);
  if (!r.ok) return { ok: false, res: unauthorized(r.reason === 'expired' ? '만료된 토큰입니다.' : '유효하지 않은 토큰입니다.') } as const;
  const userId = (r.payload as any)?.userId as string;
  if (!userId) return { ok: false, res: unauthorized('유효하지 않은 토큰입니다.') } as const;
  return { ok: true, userId } as const;
}

export async function createDocumentHandler(req: NormalizedRequest): Promise<NormalizedResponse> {
  try {
    const auth = getAuth(req.headers);
    if (!auth.ok) return auth.res;
    const userId = auth.userId;
    const raw = req.body ? safeJson<unknown>(req.body) : null;
    const parsed = DocumentCreateSchema.safeParse(raw);
    if (!parsed.success) return badRequest('key와 filename은 필수입니다.', zodIssues(parsed.error), 'VALIDATION_ERROR');
    const body = parsed.data;
    const parts = body.key.split('/');
    if (parts.length < 4 || parts[0] !== 'uploads' || parts[1] !== userId) return badRequest('key 형식이 올바르지 않습니다.');
    const documentId = parts[2];
    if (body.documentId && body.documentId !== documentId) return badRequest('제공된 documentId가 S3 키의 documentId와 일치하지 않습니다.');
    const item: DocumentItem = {
      PK: `USER#${userId}`,
      SK: `DOC#${documentId}`,
      userId,
      documentId,
      filename: body.filename,
      s3Key: body.key,
      filetype: body.filetype || null,
      filesize: Number(body.filesize || 0) || null,
      status: 'UPLOADED',
      createdAt: new Date().toISOString(),
    } as any;
    await dynamoDbDocumentClient.send(new PutCommand({ TableName: MAIN_TABLE_NAME, Item: item }));
    return created({ documentId });
  } catch (e) {
    console.error('createDocumentHandler error', e);
    return serverError();
  }
}

export async function listDocumentsHandler(req: NormalizedRequest): Promise<NormalizedResponse> {
  try {
    const auth = getAuth(req.headers);
    if (!auth.ok) return auth.res;
    const userId = auth.userId;
    const qp = req.query || {};
    const parsedQuery = DocumentListQuerySchema.safeParse(qp);
    if (!parsedQuery.success) return badRequest('잘못된 쿼리 파라미터입니다.', zodIssues(parsedQuery.error), 'VALIDATION_ERROR');
    const q = parsedQuery.data.q || '';
    const limit = parsedQuery.data.limit ?? 20;
    const sortKeyParam = parsedQuery.data.sortKey || 'createdAt';
    const sortDirParam = parsedQuery.data.sortDir || 'desc';
    const cursor = parsedQuery.data.cursor;

    const pk = `USER#${userId}`;
    let ExclusiveStartKey: any = undefined;
    if (cursor) {
      try { ExclusiveStartKey = JSON.parse(Buffer.from(cursor, 'base64').toString('utf8')); } catch { return badRequest('잘못된 cursor 값입니다.'); }
    }

    if (!q && sortKeyParam === 'createdAt' && sortDirParam === 'desc') {
      const res = await dynamoDbDocumentClient.send(new QueryCommand({
        TableName: MAIN_TABLE_NAME,
        KeyConditionExpression: 'PK = :pk AND begins_with(SK, :prefix)',
        ExpressionAttributeValues: { ':pk': pk, ':prefix': 'DOC#' },
        Limit: limit,
        ExclusiveStartKey,
        ScanIndexForward: false,
      }));
      const items = (res.Items || []).map(mapDocOut);
      const nextCursor = res.LastEvaluatedKey ? b64(res.LastEvaluatedKey) : undefined;
      return ok({ items, nextCursor });
    }

    const collected: any[] = [];
    let lastKey: any = ExclusiveStartKey;
    let hardNextCursor: string | undefined = undefined;
    for (let safety = 0; safety < 25 && collected.length < limit; safety++) {
      const res = await dynamoDbDocumentClient.send(new QueryCommand({
        TableName: MAIN_TABLE_NAME,
        KeyConditionExpression: 'PK = :pk AND begins_with(SK, :prefix)',
        ExpressionAttributeValues: { ':pk': pk, ':prefix': 'DOC#' },
        Limit: limit,
        ExclusiveStartKey: lastKey,
        ScanIndexForward: false,
      }));
      const chunk = (res.Items || []).map(mapDocOut);
      const filteredChunk = q ? chunk.filter((it: any) => String(it.filename || '').toLowerCase().includes(String(q).toLowerCase())) : chunk;
      const remaining = limit - collected.length;
      if (filteredChunk.length >= remaining) {
        const take = filteredChunk.slice(0, remaining);
        collected.push(...take);
        const lastItem = take[take.length - 1];
        const resumeKey = { PK: pk, SK: `DOC#${lastItem.documentId}` };
        hardNextCursor = b64(resumeKey);
        break;
      } else {
        collected.push(...filteredChunk);
        lastKey = res.LastEvaluatedKey;
        if (!lastKey) break;
      }
    }
    const dir = sortDirParam === 'asc' ? 1 : -1;
    collected.sort((a, b) => cmpSort(a, b, sortKeyParam, dir));
    const items = collected.slice(0, limit);
    const nextCursor = hardNextCursor || (lastKey ? b64(lastKey) : undefined);
    return ok({ items, nextCursor });
  } catch (e) {
    console.error('listDocumentsHandler error', e);
    return serverError();
  }
}

export async function getDocumentHandler(req: NormalizedRequest & { params?: Record<string, string> }): Promise<NormalizedResponse> {
  try {
    const auth = getAuth(req.headers);
    if (!auth.ok) return auth.res;
    const userId = auth.userId;
    const documentId = req.params?.id;
    if (!documentId) return badRequest('documentId가 필요합니다.');
    const res = await dynamoDbDocumentClient.send(new GetCommand({ TableName: MAIN_TABLE_NAME, Key: { PK: `USER#${userId}`, SK: `DOC#${documentId}` } }));
    if (!res.Item) return notFound('문서를 찾을 수 없습니다.');
    if ((res.Item as any).userId !== userId) return forbidden('문서에 접근할 권한이 없습니다.');
    return ok(res.Item);
  } catch (e) {
    console.error('getDocumentHandler error', e);
    return serverError();
  }
}

export async function deleteDocumentHandler(req: NormalizedRequest & { params?: Record<string, string> }): Promise<NormalizedResponse> {
  try {
    const auth = getAuth(req.headers);
    if (!auth.ok) return auth.res;
    const userId = auth.userId;
    const documentId = req.params?.id;
    if (!documentId) return badRequest('documentId가 필요합니다.');

    const getRes = await dynamoDbDocumentClient.send(new GetCommand({ TableName: MAIN_TABLE_NAME, Key: { PK: `USER#${userId}`, SK: `DOC#${documentId}` } }));
    if (!getRes.Item) return notFound('문서를 찾을 수 없습니다.');
    if ((getRes.Item as any).userId !== userId) return forbidden('문서를 삭제할 권한이 없습니다.');

    const cfg = getConfig();
    const prefix = `uploads/${userId}/${documentId}/`;
    await deleteS3Prefix(cfg.s3BucketName, prefix);

    await dynamoDbDocumentClient.send(new DeleteCommand({ TableName: MAIN_TABLE_NAME, Key: { PK: `USER#${userId}`, SK: `DOC#${documentId}` } }));
    return ok({ ok: true });
  } catch (e) {
    console.error('deleteDocumentHandler error', e);
    return serverError();
  }
}

export async function summarizeDocumentHandler(req: NormalizedRequest & { params?: Record<string, string> }): Promise<NormalizedResponse> {
  try {
    const auth = getAuth(req.headers);
    if (!auth.ok) return auth.res;
    const userId = auth.userId;
    const documentId = req.params?.id;
    if (!documentId) return badRequest('documentId가 필요합니다.');

    try {
      await dynamoDbDocumentClient.send(new UpdateCommand({
        TableName: MAIN_TABLE_NAME,
        Key: { PK: `USER#${userId}`, SK: `DOC#${documentId}` },
        UpdateExpression: 'SET #status = :status, #updatedAt = :updatedAt',
        ExpressionAttributeNames: { '#status': 'status', '#updatedAt': 'updatedAt' },
        ExpressionAttributeValues: { ':status': 'PROCESSING', ':updatedAt': new Date().toISOString() },
      }));
    } catch {
      return notFound('문서를 찾을 수 없거나 권한이 없습니다.');
    }

    try { await enqueueSummarizeJob(userId, documentId); }
    catch (e) {
      await dynamoDbDocumentClient.send(new UpdateCommand({
        TableName: MAIN_TABLE_NAME,
        Key: { PK: `USER#${userId}`, SK: `DOC#${documentId}` },
        UpdateExpression: 'SET #status = :status, #updatedAt = :updatedAt',
        ExpressionAttributeNames: { '#status': 'status', '#updatedAt': 'updatedAt' },
        ExpressionAttributeValues: { ':status': 'FAILED', ':updatedAt': new Date().toISOString() },
      }));
      throw e;
    }
    return accepted({ documentId, status: 'PROCESSING', queued: true });
  } catch (e) {
    console.error('summarizeDocumentHandler error', e);
    return serverError();
  }
}

export async function summarizeDocumentSyncHandler(req: NormalizedRequest & { params?: Record<string, string> }): Promise<NormalizedResponse> {
  try {
    const auth = getAuth(req.headers);
    if (!auth.ok) return auth.res;
    const userId = auth.userId;
    const documentId = req.params?.id;
    if (!documentId) return badRequest('documentId가 필요합니다.');

    const getRes = await dynamoDbDocumentClient.send(new GetCommand({ TableName: MAIN_TABLE_NAME, Key: { PK: `USER#${userId}`, SK: `DOC#${documentId}` } }));
    const doc = getRes.Item as any;
    if (!doc || doc.userId !== userId) return notFound('문서를 찾을 수 없거나 권한이 없습니다.');
    if ((doc.status || '').toUpperCase() === 'PROCESSING') return conflict('해당 문서는 요약 처리 중입니다.', { status: doc.status });

    // update to PROCESSING
    await dynamoDbDocumentClient.send(new UpdateCommand({
      TableName: MAIN_TABLE_NAME,
      Key: { PK: `USER#${userId}`, SK: `DOC#${documentId}` },
      UpdateExpression: 'SET #status = :status, #updatedAt = :updatedAt',
      ExpressionAttributeNames: { '#status': 'status', '#updatedAt': 'updatedAt' },
      ExpressionAttributeValues: { ':status': 'PROCESSING', ':updatedAt': new Date().toISOString() },
    }));

    const cfg = getConfig();
    const obj = await s3Client.send(new GetObjectCommand({ Bucket: cfg.s3BucketName, Key: doc.s3Key }));
    const contentType = (obj as any).ContentType as string | undefined;
    const buf = await streamToBuffer((obj as any).Body);
    const text = await extractTextFromBuffer(buf, contentType);
    const type = contentType || doc.filetype || '';
    if (!text || text.trim().length === 0) {
      await setStatus(userId, documentId, 'FAILED');
      return badRequest(`요약할 텍스트를 추출하지 못했습니다. 형식: ${type || 'unknown'}`);
    }

    const summary = await generateSummary(text);
    await dynamoDbDocumentClient.send(new UpdateCommand({
      TableName: MAIN_TABLE_NAME,
      Key: { PK: `USER#${userId}`, SK: `DOC#${documentId}` },
      UpdateExpression: 'SET #status = :status, #updatedAt = :updatedAt, #summaryText = :summaryText',
      ExpressionAttributeNames: { '#status': 'status', '#updatedAt': 'updatedAt', '#summaryText': 'summaryText' },
      ExpressionAttributeValues: { ':status': 'COMPLETE', ':updatedAt': new Date().toISOString(), ':summaryText': summary },
    }));
    return ok({ documentId, status: 'COMPLETE', summaryText: summary });
  } catch (e) {
    console.error('summarizeDocumentSyncHandler error', e);
    return serverError();
  }
}

async function setStatus(userId: string, documentId: string, status: string) {
  await dynamoDbDocumentClient.send(new UpdateCommand({
    TableName: MAIN_TABLE_NAME,
    Key: { PK: `USER#${userId}`, SK: `DOC#${documentId}` },
    UpdateExpression: 'SET #status = :status, #updatedAt = :updatedAt',
    ExpressionAttributeNames: { '#status': 'status', '#updatedAt': 'updatedAt' },
    ExpressionAttributeValues: { ':status': status, ':updatedAt': new Date().toISOString() },
  }));
}

async function generateSummary(raw: string): Promise<string> {
  const cfg = getConfig();
  const modelName = process.env.SUMMARIZE_MODEL || 'gemini-1.5-flash';
  const timeoutMs = Number(process.env.SUMMARIZE_TIMEOUT_MS || 30000);
  const maxChars = Number(process.env.SUMMARIZE_MAX_CHARS || 20000);
  const maxOutputTokens = Number(process.env.SUMMARIZE_MAX_OUTPUT_TOKENS || 1024);
  const SUMMARIZE_USE_MOCK = /^true$/i.test(process.env.SUMMARIZE_USE_MOCK || '');

  const text = raw.length > maxChars ? raw.slice(0, maxChars) : raw;
  if (SUMMARIZE_USE_MOCK || !cfg.geminiApiKey || cfg.geminiApiKey === 'YOUR_GEMINI_API_KEY') {
    const cleaned = text.replace(/\s+/g, ' ').slice(0, 800);
    return `요약(모의): ${cleaned}${cleaned.length === 800 ? '…' : ''}`;
  }

  const genAI = new GoogleGenerativeAI(cfg.geminiApiKey);
  const model = genAI.getGenerativeModel({ model: modelName });
  const prompt = (process.env.SUMMARIZE_PROMPT_TEMPLATE || `아래 문서 내용을 한국어로 간결하게 요약해 주세요.\n---\n${text}\n---\n요약:`);
  const generationConfig: GenerationConfig = { maxOutputTokens };

  const task = (async () => {
    const result = await model.generateContent({ contents: [{ role: 'user', parts: [{ text: prompt }] }], generationConfig });
    const resp = await result.response;
    return resp.text();
  })();

  const timeout = new Promise<string>((_, reject) => setTimeout(() => reject(new Error('Summarization timed out')), timeoutMs));
  return (await Promise.race([task, timeout])) as string;
}

async function deleteS3Prefix(bucket: string, prefix: string) {
  let ContinuationToken: string | undefined = undefined;
  do {
    const listed = await s3Client.send(new ListObjectsV2Command({ Bucket: bucket, Prefix: prefix, ContinuationToken }));
    const contents = listed.Contents || [];
    if (contents.length === 0) break;
    const Objects = contents.map((obj) => ({ Key: obj.Key! }));
    await s3Client.send(new DeleteObjectsCommand({ Bucket: bucket, Delete: { Objects } }));
    ContinuationToken = listed.IsTruncated ? listed.NextContinuationToken : undefined;
  } while (ContinuationToken);
}

function safeJson<T>(raw: string): T | null { try { return JSON.parse(raw) as T; } catch { return null; } }
function mapDocOut(it: any) {
  return {
    documentId: it.documentId,
    filename: it.filename,
    filetype: it.filetype,
    filesize: it.filesize,
    status: it.status,
    createdAt: it.createdAt,
    updatedAt: it.updatedAt || null,
    summaryText: it.summaryText || null,
  };
}
function b64(obj: any) { return Buffer.from(JSON.stringify(obj), 'utf8').toString('base64'); }
function timeOr(x: any, key: 'createdAt'|'updatedAt') { return new Date((x?.[key] || x?.createdAt || 0)).getTime(); }
function cmpSort(a: any, b: any, sortKey: string, dir: 1 | -1) {
  const va = sortKey === 'filename' ? (a.filename || '') : sortKey === 'filesize' ? (a.filesize || 0) : timeOr(a, sortKey === 'updatedAt' ? 'updatedAt' : 'createdAt');
  const vb = sortKey === 'filename' ? (b.filename || '') : sortKey === 'filesize' ? (b.filesize || 0) : timeOr(b, sortKey === 'updatedAt' ? 'updatedAt' : 'createdAt');
  if (va < vb) return -1 * dir;
  if (va > vb) return 1 * dir;
  return 0;
}
