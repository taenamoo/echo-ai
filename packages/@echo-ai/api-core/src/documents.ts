import type { NormalizedRequest, NormalizedResponse } from './types';
import {
  dynamoDbDocumentClient,
  DOCUMENTS_TABLE_NAME,
  DOCUMENT_CONTENT_TABLE_NAME,
  s3Client,
} from '@echo-ai/aws-clients';
import {
  BatchGetCommand,
  DeleteCommand,
  GetCommand,
  PutCommand,
  QueryCommand,
  UpdateCommand,
} from '@aws-sdk/lib-dynamodb';
import {
  DeleteObjectCommand,
  DeleteObjectsCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
} from '@aws-sdk/client-s3';
import { verifyTokenDetailed } from '@echo-ai/auth';
import type { DocumentItem, DocumentContentItem } from '@echo-ai/core-domain';
import { enqueueSummarizeJob } from '@echo-ai/documents';
import { getConfig, hydrateConfigFromSecrets } from '@echo-ai/config';
import { extractTextFromBuffer, streamToBuffer } from '@echo-ai/documents';
import { GoogleGenerativeAI, type GenerationConfig } from '@google/generative-ai';
import { DocumentCreateSchema, DocumentListQuerySchema } from './schemas';
import {
  ok,
  created,
  accepted,
  badRequest,
  unauthorized,
  forbidden,
  notFound,
  serverError,
  zodIssues,
  conflict,
} from './http';

const TEXT_OBJECT_PREFIX =
  process.env.DOCUMENT_TEXT_PREFIX || 'documents/text';
const DEFAULT_CHUNK_SIZE =
  Number(process.env.DOCUMENT_CHUNK_SIZE || 600) || 600;
const DEFAULT_PRIMARY_TAG = 'untagged';

export function getAuth(
  headers: Record<string, string | undefined>,
): { ok: true; userId: string } | { ok: false; res: NormalizedResponse } {
  const auth = headers['authorization'] || headers['Authorization'];
  if (!auth) return { ok: false, res: unauthorized('인증 토큰이 없습니다.') } as const;
  const token = auth.startsWith('Bearer ') ? auth.substring(7) : auth;
  const r = verifyTokenDetailed(token);
  if (!r.ok)
    return {
      ok: false,
      res: unauthorized(
        r.reason === 'expired' ? '만료된 토큰입니다.' : '유효하지 않은 토큰입니다.',
      ),
    } as const;
  const userId = (r.payload as any)?.userId as string;
  if (!userId)
    return { ok: false, res: unauthorized('유효하지 않은 토큰입니다.') } as const;
  return { ok: true, userId } as const;
}

export async function createDocumentHandler(
  req: NormalizedRequest,
): Promise<NormalizedResponse> {
  try {
    await hydrateConfigFromSecrets();
    const auth = getAuth(req.headers);
    if (!auth.ok) return auth.res;
    const userId = auth.userId;
    const raw = req.body ? safeJson<unknown>(req.body) : null;
    const parsed = DocumentCreateSchema.safeParse(raw);
    if (!parsed.success)
      return badRequest(
        'key와 filename은 필수입니다.',
        zodIssues(parsed.error),
        'VALIDATION_ERROR',
      );
    const body = parsed.data;
    const parts = body.key.split('/');
    if (parts.length < 4 || parts[0] !== 'uploads' || parts[1] !== userId)
      return badRequest('key 형식이 올바르지 않습니다.');
    const documentId = parts[2];
    if (body.documentId && body.documentId !== documentId)
      return badRequest(
        '제공된 documentId가 S3 키의 documentId와 일치하지 않습니다.',
      );

    const tags = normalizeTags(body.tags);
    const now = new Date().toISOString();
    const docKey = docPk(userId, documentId);
    const item: DocumentItem = {
      ...docKey,
      userId,
      documentId,
      filename: body.filename,
      s3Key: body.key,
      filetype: body.filetype || null,
      filesize: Number(body.filesize || 0) || null,
      status: 'UPLOADED',
      createdAt: now,
      updatedAt: now,
      tags,
      tagKey: primaryTag(tags),
    } as any;

    await dynamoDbDocumentClient.send(
      new PutCommand({
        TableName: DOCUMENTS_TABLE_NAME,
        Item: item,
        ConditionExpression:
          'attribute_not_exists(PK) AND attribute_not_exists(SK)',
      }),
    );

    await dynamoDbDocumentClient.send(
      new PutCommand({
        TableName: DOCUMENT_CONTENT_TABLE_NAME,
        Item: {
          ...docKey,
          userId,
          documentId,
          contentS3Key: null,
          summaryText: null,
          textLength: null,
          chunkSize: null,
          chunkCount: null,
          lastProcessedAt: null,
          createdAt: now,
          updatedAt: now,
        },
        ConditionExpression:
          'attribute_not_exists(PK) AND attribute_not_exists(SK)',
      }),
    );

    return created({ documentId });
  } catch (e: any) {
    console.error('createDocumentHandler error', e);
    if (isConditionalCheckFailed(e)) {
      return conflict('이미 존재하는 문서입니다.');
    }
    return serverError();
  }
}

export async function listDocumentsHandler(
  req: NormalizedRequest,
): Promise<NormalizedResponse> {
  try {
    await hydrateConfigFromSecrets();
    const auth = getAuth(req.headers);
    if (!auth.ok) return auth.res;
    const userId = auth.userId;

    const parsedQuery = DocumentListQuerySchema.safeParse(req.query || {});
    if (!parsedQuery.success) {
      return badRequest(
        '잘못된 쿼리 파라미터입니다.',
        zodIssues(parsedQuery.error),
        'VALIDATION_ERROR',
      );
    }

    const searchTerm = (parsedQuery.data.q || '').trim().toLowerCase();
    const limit = parsedQuery.data.limit ?? 20;
    const sortKeyParam = parsedQuery.data.sortKey || 'createdAt';
    const sortDirParam = parsedQuery.data.sortDir || 'desc';
    const cursor = parsedQuery.data.cursor;
    const tagsFilter = normalizeTags(parsedQuery.data.tags);

    const pk = `USER#${userId}`;
    let ExclusiveStartKey: any = undefined;
    if (cursor) {
      try {
        ExclusiveStartKey = JSON.parse(
          Buffer.from(cursor, 'base64').toString('utf8'),
        );
      } catch {
        return badRequest('잘못된 cursor 값입니다.');
      }
    }

    const collected: DocumentItem[] = [];
    let lastEvaluatedKey: any = ExclusiveStartKey;
    let hardNextCursor: string | undefined;

    for (let safety = 0; safety < 25 && collected.length < limit; safety++) {
      const res = await dynamoDbDocumentClient.send(
        new QueryCommand({
          TableName: DOCUMENTS_TABLE_NAME,
          KeyConditionExpression: 'PK = :pk AND begins_with(SK, :prefix)',
          ExpressionAttributeValues: { ':pk': pk, ':prefix': 'DOC#' },
          Limit: limit,
          ExclusiveStartKey: lastEvaluatedKey,
          ScanIndexForward: false,
        }),
      );

      const rawItems = (res.Items || []) as DocumentItem[];
      const filtered = rawItems.filter((item) =>
        matchesFilters(item, searchTerm, tagsFilter),
      );

      const remaining = limit - collected.length;
      if (filtered.length >= remaining) {
        const slice = filtered.slice(0, remaining);
        collected.push(...slice);
        const last = slice[slice.length - 1];
        if (last) {
          hardNextCursor = b64({ PK: last.PK, SK: last.SK });
        }
        lastEvaluatedKey = res.LastEvaluatedKey;
        break;
      } else {
        collected.push(...filtered);
        lastEvaluatedKey = res.LastEvaluatedKey;
        if (!lastEvaluatedKey) break;
      }
    }

    const sorted = sortMetadata(collected, sortKeyParam, sortDirParam);
    const pageMeta = sorted.slice(0, limit);
    const items = await buildDocumentsResponse(pageMeta);
    const nextCursor =
      hardNextCursor ||
      (lastEvaluatedKey ? b64(lastEvaluatedKey) : undefined);

    return ok({ items, nextCursor });
  } catch (e) {
    console.error('listDocumentsHandler error', e);
    return serverError();
  }
}

export async function getDocumentHandler(
  req: NormalizedRequest & { params?: Record<string, string> },
): Promise<NormalizedResponse> {
  try {
    await hydrateConfigFromSecrets();
    const auth = getAuth(req.headers);
    if (!auth.ok) return auth.res;
    const userId = auth.userId;
    const documentId = req.params?.id;
    if (!documentId) return badRequest('documentId가 필요합니다.');

    const metaRes = await dynamoDbDocumentClient.send(
      new GetCommand({
        TableName: DOCUMENTS_TABLE_NAME,
        Key: docPk(userId, documentId),
      }),
    );
    const meta = metaRes.Item as DocumentItem | undefined;
    if (!meta) return notFound('문서를 찾을 수 없습니다.');
    if (meta.userId !== userId) return forbidden('권한이 없습니다.');

    const contentRes = await dynamoDbDocumentClient.send(
      new GetCommand({
        TableName: DOCUMENT_CONTENT_TABLE_NAME,
        Key: docPk(userId, documentId),
      }),
    );
    const content = contentRes.Item as DocumentContentItem | undefined;

    return ok(mapDocOut(meta, content || null));
  } catch (e) {
    console.error('getDocumentHandler error', e);
    return serverError();
  }
}

export async function deleteDocumentHandler(
  req: NormalizedRequest & { params?: Record<string, string> },
): Promise<NormalizedResponse> {
  try {
    await hydrateConfigFromSecrets();
    const auth = getAuth(req.headers);
    if (!auth.ok) return auth.res;
    const userId = auth.userId;
    const documentId = req.params?.id;
    if (!documentId) return badRequest('documentId가 필요합니다.');

    const metaRes = await dynamoDbDocumentClient.send(
      new GetCommand({
        TableName: DOCUMENTS_TABLE_NAME,
        Key: docPk(userId, documentId),
      }),
    );
    const meta = metaRes.Item as DocumentItem | undefined;
    if (!meta) return notFound('문서를 찾을 수 없습니다.');
    if (meta.userId !== userId) return forbidden('권한이 없습니다.');

    const contentRes = await dynamoDbDocumentClient.send(
      new GetCommand({
        TableName: DOCUMENT_CONTENT_TABLE_NAME,
        Key: docPk(userId, documentId),
      }),
    );
    const content = contentRes.Item as DocumentContentItem | undefined;

    const cfg = getConfig();
    await deleteS3Prefix(cfg.s3BucketName, `uploads/${userId}/${documentId}`);
    if (content?.contentS3Key) {
      await deleteTextObject(cfg.s3BucketName, content.contentS3Key);
    } else {
      const fallbackKey = buildContentKey(userId, documentId);
      await deleteTextObject(cfg.s3BucketName, fallbackKey);
    }

    await dynamoDbDocumentClient.send(
      new DeleteCommand({
        TableName: DOCUMENTS_TABLE_NAME,
        Key: docPk(userId, documentId),
      }),
    );
    await dynamoDbDocumentClient.send(
      new DeleteCommand({
        TableName: DOCUMENT_CONTENT_TABLE_NAME,
        Key: docPk(userId, documentId),
      }),
    );

    return ok({ documentId });
  } catch (e) {
    console.error('deleteDocumentHandler error', e);
    return serverError();
  }
}

export async function summarizeDocumentHandler(
  req: NormalizedRequest & { params?: Record<string, string> },
): Promise<NormalizedResponse> {
  try {
    await hydrateConfigFromSecrets();
    const auth = getAuth(req.headers);
    if (!auth.ok) return auth.res;
    const userId = auth.userId;
    const documentId = req.params?.id;
    if (!documentId) return badRequest('documentId가 필요합니다.');

    try {
      await setStatus(userId, documentId, 'PROCESSING');
    } catch {
      return notFound('문서를 찾을 수 없거나 권한이 없습니다.');
    }

    try {
      await enqueueSummarizeJob(userId, documentId);
    } catch (e) {
      await setStatus(userId, documentId, 'FAILED');
      throw e;
    }

    return accepted({ documentId, status: 'PROCESSING', queued: true });
  } catch (e) {
    console.error('summarizeDocumentHandler error', e);
    return serverError();
  }
}

export async function summarizeDocumentSyncHandler(
  req: NormalizedRequest & { params?: Record<string, string> },
): Promise<NormalizedResponse> {
  try {
    await hydrateConfigFromSecrets();
    const auth = getAuth(req.headers);
    if (!auth.ok) return auth.res;
    const userId = auth.userId;
    const documentId = req.params?.id;
    if (!documentId) return badRequest('documentId가 필요합니다.');

    const getRes = await dynamoDbDocumentClient.send(
      new GetCommand({
        TableName: DOCUMENTS_TABLE_NAME,
        Key: docPk(userId, documentId),
      }),
    );
    const doc = getRes.Item as DocumentItem | undefined;
    if (!doc) return notFound('문서를 찾을 수 없습니다.');
    if (doc.userId !== userId) return forbidden('권한이 없습니다.');

    await setStatus(userId, documentId, 'PROCESSING');

    const cfg = getConfig();
    const obj = await s3Client.send(
      new GetObjectCommand({ Bucket: cfg.s3BucketName, Key: doc.s3Key }),
    );
    const contentType = (obj as any).ContentType as string | undefined;
    const buf = await streamToBuffer((obj as any).Body);
    const text = await extractTextFromBuffer(buf, contentType);
    const type = contentType || doc.filetype || '';
    if (!text || text.trim().length === 0) {
      await setStatus(userId, documentId, 'FAILED');
      return badRequest(
        `요약할 텍스트를 추출하지 못했습니다. 형식: ${type || 'unknown'}`,
      );
    }

    const summary = await generateSummary(text);
    await persistDocumentContent({
      userId,
      documentId,
      text,
      summaryText: summary,
    });
    await setStatus(userId, documentId, 'COMPLETE');
    return ok({ documentId, status: 'COMPLETE', summaryText: summary });
  } catch (e) {
    console.error('summarizeDocumentSyncHandler error', e);
    return serverError();
  }
}

async function setStatus(
  userId: string,
  documentId: string,
  status: DocumentItem['status'],
) {
  const now = new Date().toISOString();
  await dynamoDbDocumentClient.send(
    new UpdateCommand({
      TableName: DOCUMENTS_TABLE_NAME,
      Key: docPk(userId, documentId),
      UpdateExpression: 'SET #status = :status, #updatedAt = :updatedAt',
      ExpressionAttributeNames: {
        '#status': 'status',
        '#updatedAt': 'updatedAt',
      },
      ExpressionAttributeValues: { ':status': status, ':updatedAt': now },
    }),
  );
}

async function persistDocumentContent(params: {
  userId: string;
  documentId: string;
  text: string;
  summaryText: string;
  chunkSize?: number;
}) {
  const { userId, documentId, text, summaryText } = params;
  const cfg = getConfig();
  const chunkSize = params.chunkSize ?? DEFAULT_CHUNK_SIZE;
  const contentKey = buildContentKey(userId, documentId);
  await s3Client.send(
    new PutObjectCommand({
      Bucket: cfg.s3BucketName,
      Key: contentKey,
      Body: Buffer.from(text, 'utf8'),
      ContentType: 'text/plain; charset=utf-8',
    }),
  );
  const now = new Date().toISOString();
  await dynamoDbDocumentClient.send(
    new UpdateCommand({
      TableName: DOCUMENT_CONTENT_TABLE_NAME,
      Key: docPk(userId, documentId),
      UpdateExpression:
        'SET #summaryText = :summaryText, #contentS3Key = :contentS3Key, #textLength = :textLength, #chunkSize = :chunkSize, #chunkCount = :chunkCount, #lastProcessedAt = :lastProcessedAt, #updatedAt = :updatedAt',
      ExpressionAttributeNames: {
        '#summaryText': 'summaryText',
        '#contentS3Key': 'contentS3Key',
        '#textLength': 'textLength',
        '#chunkSize': 'chunkSize',
        '#chunkCount': 'chunkCount',
        '#lastProcessedAt': 'lastProcessedAt',
        '#updatedAt': 'updatedAt',
      },
      ExpressionAttributeValues: {
        ':summaryText': summaryText ?? null,
        ':contentS3Key': contentKey,
        ':textLength': text.length,
        ':chunkSize': chunkSize,
        ':chunkCount': chunkCountFor(text, chunkSize),
        ':lastProcessedAt': now,
        ':updatedAt': now,
      },
    }),
  );
}

async function generateSummary(raw: string): Promise<string> {
  await hydrateConfigFromSecrets();
  const cfg = getConfig();
  const modelName = process.env.SUMMARIZE_MODEL || 'gemini-1.5-flash';
  const timeoutMs = Number(process.env.SUMMARIZE_TIMEOUT_MS || 30000);
  const maxChars = Number(process.env.SUMMARIZE_MAX_CHARS || 20000);
  const maxOutputTokens = Number(
    process.env.SUMMARIZE_MAX_OUTPUT_TOKENS || 1024,
  );
  const useMock =
    typeof process.env.SUMMARIZE_USE_MOCK === 'string'
      ? /^true$/i.test(process.env.SUMMARIZE_USE_MOCK)
      : cfg.stage === 'local';

  const text = raw.length > maxChars ? raw.slice(0, maxChars) : raw;
  if (useMock || !cfg.geminiApiKey) {
    const cleaned = text.replace(/\s+/g, ' ').slice(0, 800);
    return `요약(모의): ${cleaned}${cleaned.length === 800 ? '…' : ''}`;
  }

  const genAI = new GoogleGenerativeAI(cfg.geminiApiKey);
  const model = genAI.getGenerativeModel({ model: modelName });
  const prompt =
    process.env.SUMMARIZE_PROMPT_TEMPLATE ||
    `아래 문서 내용을 한국어로 간결하게 요약해 주세요.\n---\n${text}\n---\n요약:`;
  const generationConfig: GenerationConfig = { maxOutputTokens };

  const task = (async () => {
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig,
    });
    const resp = await result.response;
    return resp.text();
  })();

  const timeout = new Promise<string>((_, reject) =>
    setTimeout(() => reject(new Error('Summarization timed out')), timeoutMs),
  );
  return (await Promise.race([task, timeout])) as string;
}

async function deleteS3Prefix(bucket: string, prefix: string) {
  let ContinuationToken: string | undefined = undefined;
  do {
    const listed = await s3Client.send(
      new ListObjectsV2Command({
        Bucket: bucket,
        Prefix: prefix,
        ContinuationToken,
      }),
    );
    const contents = listed.Contents || [];
    if (contents.length === 0) break;
    const Objects = contents.map((obj) => ({ Key: obj.Key! }));
    await s3Client.send(
      new DeleteObjectsCommand({
        Bucket: bucket,
        Delete: { Objects },
      }),
    );
    ContinuationToken = listed.IsTruncated
      ? listed.NextContinuationToken
      : undefined;
  } while (ContinuationToken);
}

async function deleteTextObject(bucket: string, key: string) {
  if (!key) return;
  try {
    await s3Client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
  } catch (error) {
    console.warn('deleteTextObject failed', { key, error });
  }
}

function safeJson<T>(raw: string): T | null {
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function mapDocOut(meta: DocumentItem, content: DocumentContentItem | null) {
  return {
    documentId: meta.documentId,
    filename: meta.filename,
    s3Key: meta.s3Key,
    filetype: meta.filetype,
    filesize: meta.filesize,
    status: meta.status,
    createdAt: meta.createdAt,
    updatedAt: meta.updatedAt || null,
    tags: meta.tags || [],
    summaryText: content?.summaryText ?? null,
    textLength: content?.textLength ?? null,
    chunkSize: content?.chunkSize ?? null,
    chunkCount: content?.chunkCount ?? null,
    lastProcessedAt: content?.lastProcessedAt ?? null,
  };
}

function matchesFilters(
  item: DocumentItem,
  searchTerm: string,
  tagsFilter: string[],
): boolean {
  const matchesSearch =
    !searchTerm ||
    (item.filename || '')
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
  const matchesTags =
    tagsFilter.length === 0 ||
    (Array.isArray(item.tags) &&
      tagsFilter.every((tag) => item.tags!.includes(tag)));
  return matchesSearch && matchesTags;
}

function normalizeTags(
  input?: string[] | string | null,
): string[] {
  if (!input) return [];
  const arr = Array.isArray(input) ? input : [input];
  return arr
    .map((tag) => tag.trim().toLowerCase())
    .filter((tag) => tag.length > 0);
}

function primaryTag(tags: string[]): string {
  return tags.length > 0 ? tags[0] : DEFAULT_PRIMARY_TAG;
}

function docPk(userId: string, documentId: string) {
  return { PK: `USER#${userId}`, SK: `DOC#${documentId}` };
}

function buildContentKey(userId: string, documentId: string) {
  return `${TEXT_OBJECT_PREFIX}/${userId}/${documentId}.txt`;
}

function sortMetadata(
  items: DocumentItem[],
  sortKey: 'createdAt' | 'updatedAt' | 'filename' | 'filesize',
  sortDir: 'asc' | 'desc',
): DocumentItem[] {
  const dir = sortDir === 'asc' ? 1 : -1;
  return [...items].sort((a, b) => cmpSort(a, b, sortKey, dir));
}

async function buildDocumentsResponse(metaItems: DocumentItem[]) {
  if (metaItems.length === 0) return [];
  const contentMap = await loadContentMap(metaItems);
  return metaItems.map((meta) =>
    mapDocOut(meta, contentMap.get(contentMapKey(meta.PK, meta.SK)) || null),
  );
}

async function loadContentMap(
  metaItems: DocumentItem[],
): Promise<Map<string, DocumentContentItem>> {
  const map = new Map<string, DocumentContentItem>();
  if (metaItems.length === 0) return map;
  const keys = metaItems.map((item) => ({ PK: item.PK, SK: item.SK }));
  const res = await dynamoDbDocumentClient.send(
    new BatchGetCommand({
      RequestItems: {
        [DOCUMENT_CONTENT_TABLE_NAME]: {
          Keys: keys,
        },
      },
    }),
  );
  const list =
    (res.Responses?.[DOCUMENT_CONTENT_TABLE_NAME] as DocumentContentItem[]) ||
    [];
  for (const content of list) {
    map.set(contentMapKey(content.PK, content.SK), content);
  }
  return map;
}

function contentMapKey(pk: string, sk: string) {
  return `${pk}#${sk}`;
}

function chunkCountFor(text: string, chunkSize: number): number {
  if (chunkSize <= 0) return 1;
  return Math.max(1, Math.ceil(text.length / chunkSize));
}

function timeOr(x: any, key: 'createdAt' | 'updatedAt') {
  return new Date(x?.[key] || x?.createdAt || 0).getTime();
}

function cmpSort(a: any, b: any, sortKey: string, dir: 1 | -1) {
  const va =
    sortKey === 'filename'
      ? a.filename || ''
      : sortKey === 'filesize'
        ? a.filesize || 0
        : timeOr(a, sortKey === 'updatedAt' ? 'updatedAt' : 'createdAt');
  const vb =
    sortKey === 'filename'
      ? b.filename || ''
      : sortKey === 'filesize'
        ? b.filesize || 0
        : timeOr(b, sortKey === 'updatedAt' ? 'updatedAt' : 'createdAt');
  if (va < vb) return -1 * dir;
  if (va > vb) return 1 * dir;
  return 0;
}

function b64(obj: any) {
  return Buffer.from(JSON.stringify(obj), 'utf8').toString('base64');
}

function isConditionalCheckFailed(error: any): boolean {
  return (
    error &&
    (error.name === 'ConditionalCheckFailedException' ||
      error.Code === 'ConditionalCheckFailedException')
  );
}
