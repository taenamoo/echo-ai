import type { APIGatewayProxyHandlerV2 } from 'aws-lambda';
import { dynamoDbDocumentClient, MAIN_TABLE_NAME } from '@echo-ai/aws-clients';
import { PutCommand, QueryCommand, GetCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';
import { getAuthToken, parseJson, ok, badRequest, unauthorized, notFound, serverError, accepted } from './http';
import { verifyTokenDetailed } from '@echo-ai/auth';
import type { DocumentItem } from '@echo-ai/core-domain';
import { enqueueSummarizeJob } from '@echo-ai/documents';

function requireUser(headers: Record<string, string | undefined>): { ok: true; userId: string } | { ok: false; res: any } {
  const token = getAuthToken(headers);
  if (!token) return { ok: false, res: unauthorized('인증 토큰이 없습니다.') } as const;
  const status = verifyTokenDetailed(token);
  if (!status.ok) return { ok: false, res: unauthorized(status.reason === 'expired' ? '만료된 토큰입니다.' : '유효하지 않은 토큰입니다.') } as const;
  const userId = (status.payload as any)?.userId as string;
  if (!userId) return { ok: false, res: unauthorized('유효하지 않은 토큰입니다.') } as const;
  return { ok: true, userId } as const;
}

// POST /documents (metadata save after presign upload)
export const create: APIGatewayProxyHandlerV2 = async (event) => {
  try {
    const auth = requireUser(event.headers || {});
    if (!auth.ok) return auth.res;
    const userId = auth.userId;

    const body = parseJson<{ key?: string; filename?: string; filetype?: string; filesize?: number; documentId?: string }>(event.body);
    if (!body?.key || !body?.filename) return badRequest('key와 filename은 필수입니다.');

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
    return ok({ documentId });
  } catch (e) {
    console.error('Documents.create error', e);
    return serverError();
  }
};

// GET /documents?limit=&cursor=
export const list: APIGatewayProxyHandlerV2 = async (event) => {
  try {
    const auth = requireUser(event.headers || {});
    if (!auth.ok) return auth.res;
    const userId = auth.userId;

    const qp = event.queryStringParameters || {};
    const limitParam = Number(qp.limit || 20);
    const limit = Math.max(1, Math.min(100, isNaN(limitParam) ? 20 : limitParam));
    const cursor = qp.cursor;

    const pk = `USER#${userId}`;
    let ExclusiveStartKey: any = undefined;
    if (cursor) {
      try { ExclusiveStartKey = JSON.parse(Buffer.from(cursor, 'base64').toString('utf8')); } catch { return badRequest('잘못된 cursor 값입니다.'); }
    }

    const cmd = new QueryCommand({
      TableName: MAIN_TABLE_NAME,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :prefix)',
      ExpressionAttributeValues: { ':pk': pk, ':prefix': 'DOC#' },
      Limit: limit,
      ExclusiveStartKey,
      ScanIndexForward: false,
    });
    const res = await dynamoDbDocumentClient.send(cmd);
    const items = (res.Items || []).map((it: any) => ({
      documentId: it.documentId,
      filename: it.filename,
      filetype: it.filetype,
      filesize: it.filesize,
      status: it.status,
      createdAt: it.createdAt,
      updatedAt: it.updatedAt || null,
      summaryText: it.summaryText || null,
    }));
    const nextCursor = res.LastEvaluatedKey ? Buffer.from(JSON.stringify(res.LastEvaluatedKey), 'utf8').toString('base64') : undefined;
    return ok({ items, nextCursor });
  } catch (e) {
    console.error('Documents.list error', e);
    return serverError();
  }
};

// GET /documents/{id}
export const get: APIGatewayProxyHandlerV2 = async (event) => {
  try {
    const auth = requireUser(event.headers || {});
    if (!auth.ok) return auth.res;
    const userId = auth.userId;
    const documentId = event.pathParameters?.id;
    if (!documentId) return badRequest('documentId가 필요합니다.');

    const res = await dynamoDbDocumentClient.send(new GetCommand({
      TableName: MAIN_TABLE_NAME,
      Key: { PK: `USER#${userId}`, SK: `DOC#${documentId}` },
    }));
    if (!res.Item) return notFound('문서를 찾을 수 없습니다.');
    if ((res.Item as any).userId !== userId) return unauthorized('문서에 접근할 권한이 없습니다.');
    return ok(res.Item);
  } catch (e) {
    console.error('Documents.get error', e);
    return serverError();
  }
};

// DELETE /documents/{id}
export const remove: APIGatewayProxyHandlerV2 = async (event) => {
  try {
    const auth = requireUser(event.headers || {});
    if (!auth.ok) return auth.res;
    const userId = auth.userId;
    const documentId = event.pathParameters?.id;
    if (!documentId) return badRequest('documentId가 필요합니다.');

    const getRes = await dynamoDbDocumentClient.send(new GetCommand({ TableName: MAIN_TABLE_NAME, Key: { PK: `USER#${userId}`, SK: `DOC#${documentId}` } }));
    if (!getRes.Item) return notFound('문서를 찾을 수 없습니다.');
    if ((getRes.Item as any).userId !== userId) return unauthorized('문서를 삭제할 권한이 없습니다.');

    await dynamoDbDocumentClient.send(new DeleteCommand({ TableName: MAIN_TABLE_NAME, Key: { PK: `USER#${userId}`, SK: `DOC#${documentId}` } }));
    return ok({ ok: true });
  } catch (e) {
    console.error('Documents.remove error', e);
    return serverError();
  }
};

// POST /documents/{id}/summarize (enqueue)
export const summarize: APIGatewayProxyHandlerV2 = async (event) => {
  try {
    const auth = requireUser(event.headers || {});
    if (!auth.ok) return auth.res;
    const userId = auth.userId;
    const documentId = event.pathParameters?.id;
    if (!documentId) return badRequest('documentId가 필요합니다.');

    await enqueueSummarizeJob(userId, documentId);
    return accepted({ documentId, status: 'PROCESSING', queued: true });
  } catch (e) {
    console.error('Documents.summarize error', e);
    return serverError();
  }
};

