import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { requireAuth } from '@/lib/api/auth';
import docClient, { MAIN_TABLE_NAME } from '@/lib/aws/dynamodb'; // 수정된 부분
import type { DocumentItem, DocumentStatus } from '@/types/document';
import { s3Client } from '@/lib/aws/s3';
import { PutCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { PutObjectCommand } from '@aws-sdk/client-s3';

const S3_BUCKET_NAME = process.env.S3_BUCKET_NAME;

export async function POST(req: NextRequest) {
  try {
    const auth = requireAuth(req);
    if (!auth.ok) return auth.res;
    const userId = auth.userId;

    const contentType = req.headers.get('content-type') || '';

    // Branch A: JSON metadata save (presigned upload flow)
    if (contentType.includes('application/json')) {
      const body = await req.json().catch(() => null);
      const key = body?.key as string | undefined;
      const filename = body?.filename as string | undefined;
      const filetype = body?.filetype as string | undefined;
      const filesize = Number(body?.filesize || 0);
      const providedDocId = body?.documentId as string | undefined;

      if (!key || !filename) {
        return NextResponse.json({ message: 'key와 filename은 필수입니다.' }, { status: 400 });
      }

      // Expecting key like: uploads/{userId}/{documentId}/{filename}
      const parts = key.split('/');
      if (parts.length < 4 || parts[0] !== 'uploads' || parts[1] !== userId) {
        return NextResponse.json({ message: 'key 형식이 올바르지 않습니다.' }, { status: 400 });
      }
      const documentId = parts[2];
      if (providedDocId && providedDocId !== documentId) {
        return NextResponse.json({ message: '제공된 documentId가 S3 키의 documentId와 일치하지 않습니다.' }, { status: 400 });
      }
      if (!documentId) {
        return NextResponse.json({ message: 'documentId를 추출할 수 없습니다.' }, { status: 400 });
      }

      const item: DocumentItem = createDocumentItem(
        userId,
        documentId,
        filename,
        key,
        filetype || null,
        isNaN(filesize) ? null : filesize,
        'UPLOADED'
      );

      await docClient.send(new PutCommand({ TableName: MAIN_TABLE_NAME, Item: item }));
      return NextResponse.json({ documentId });
    }

    // Branch B: legacy multipart upload (server-side upload)
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ message: '파일이 필요합니다.' }, { status: 400 });
    }
    if (!S3_BUCKET_NAME) {
      return NextResponse.json({ message: 'S3_BUCKET_NAME 환경 변수가 설정되지 않았습니다.' }, { status: 500 });
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

    const documentItem = createDocumentItem(
      userId,
      documentId,
      file.name,
      s3Key,
      file.type || null,
      file.size || null,
      'UPLOADED'
    );

    const dbCommand = new PutCommand({
      TableName: MAIN_TABLE_NAME, // 수정된 부분
      Item: documentItem,
    });
    await docClient.send(dbCommand);

    return NextResponse.json({ documentId });

  } catch (error: any) {
    console.error('File Upload/Metadata API Error:', error);
    if (error.name === 'JsonWebTokenError') {
        return NextResponse.json({ message: '손상된 토큰입니다.' }, { status: 401 });
    }
    return NextResponse.json({ message: '파일 업로드 중 서버 오류가 발생했습니다.' }, { status: 500 });
  }
}

function createDocumentItem(
  userId: string,
  documentId: string,
  filename: string,
  s3Key: string,
  filetype: string | null,
  filesize: number | null,
  status: DocumentStatus
): DocumentItem {
  return {
    PK: `USER#${userId}`,
    SK: `DOC#${documentId}`,
    userId,
    documentId,
    filename,
    s3Key,
    filetype,
    filesize,
    status,
    createdAt: new Date().toISOString(),
  };
}

function timeOr(x: any, key: 'createdAt'|'updatedAt') {
  return new Date((x?.[key] || x?.createdAt || 0)).getTime();
}

// GET /api/documents?limit=20&cursor=<base64>
export async function GET(req: NextRequest) {
  try {
    const auth = requireAuth(req);
    if (!auth.ok) return auth.res;
    const userId = auth.userId;

    const { searchParams } = new URL(req.url);
    const limitParam = Number(searchParams.get('limit') || 20);
    const limit = Math.max(1, Math.min(100, isNaN(limitParam) ? 20 : limitParam));
    const cursor = searchParams.get('cursor');
    const q = searchParams.get('q') || '';
    const sortKeyParam = (searchParams.get('sortKey') || 'createdAt') as 'createdAt'|'updatedAt'|'filename'|'filesize';
    const sortDirParam = (searchParams.get('sortDir') || 'desc') as 'asc'|'desc';

    const pk = `USER#${userId}`;

    let ExclusiveStartKey: any = undefined;
    if (cursor) {
      try {
        ExclusiveStartKey = JSON.parse(Buffer.from(cursor, 'base64').toString('utf8'));
      } catch {
        return NextResponse.json({ message: '잘못된 cursor 값입니다.' }, { status: 400 });
      }
    }

    // Fast path: no search and default sort(createdAt desc) → single query
    if (!q && sortKeyParam === 'createdAt' && sortDirParam === 'desc') {
      const cmd = new QueryCommand({
        TableName: MAIN_TABLE_NAME,
        KeyConditionExpression: 'PK = :pk AND begins_with(SK, :prefix)',
        ExpressionAttributeValues: { ':pk': pk, ':prefix': 'DOC#' },
        Limit: limit,
        ExclusiveStartKey,
        ScanIndexForward: false,
      });
      const res = await docClient.send(cmd);
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
      const nextCursor = res.LastEvaluatedKey
        ? Buffer.from(JSON.stringify(res.LastEvaluatedKey), 'utf8').toString('base64')
        : undefined;
      return NextResponse.json({ items, nextCursor });
    }

    const collected: any[] = [];
    let lastKey: any = ExclusiveStartKey;
    let hardNextCursor: string | undefined = undefined;
    for (let safety = 0; safety < 25 && collected.length < limit; safety++) {
      const exprValues: Record<string, any> = { ':pk': pk, ':prefix': 'DOC#' };
      const cmd = new QueryCommand({
        TableName: MAIN_TABLE_NAME,
        KeyConditionExpression: 'PK = :pk AND begins_with(SK, :prefix)',
        ExpressionAttributeValues: exprValues,
        Limit: limit,
        ExclusiveStartKey: lastKey,
        ScanIndexForward: false,
      });
      const res = await docClient.send(cmd);
      const chunk = (res.Items || []).map((it: any) => ({
        documentId: it.documentId,
        filename: it.filename,
        filetype: it.filetype,
        filesize: it.filesize,
        status: it.status,
        createdAt: it.createdAt,
        updatedAt: it.updatedAt || null,
        summaryText: it.summaryText || null,
      }));
      const filteredChunk = q ? chunk.filter((it: any) => String(it.filename || '').toLowerCase().includes(q.toLowerCase())) : chunk;
      const remaining = limit - collected.length;
      if (filteredChunk.length >= remaining) {
        const take = filteredChunk.slice(0, remaining);
        collected.push(...take);
        // Set cursor to the last returned item's key so next page continues correctly
        const lastItem = take[take.length - 1];
        const resumeKey = { PK: pk, SK: `DOC#${lastItem.documentId}` };
        hardNextCursor = Buffer.from(JSON.stringify(resumeKey), 'utf8').toString('base64');
        break;
      } else {
        collected.push(...filteredChunk);
        lastKey = res.LastEvaluatedKey;
        if (!lastKey) break;
      }
    }

    const dir = sortDirParam === 'asc' ? 1 : -1;
    collected.sort((a, b) => {
      const va = sortKeyParam === 'filename'
        ? (a.filename || '')
        : sortKeyParam === 'filesize'
          ? (a.filesize || 0)
          : timeOr(a, sortKeyParam === 'updatedAt' ? 'updatedAt' : 'createdAt');
      const vb = sortKeyParam === 'filename'
        ? (b.filename || '')
        : sortKeyParam === 'filesize'
          ? (b.filesize || 0)
          : timeOr(b, sortKeyParam === 'updatedAt' ? 'updatedAt' : 'createdAt');
      if (va < vb) return -1 * dir;
      if (va > vb) return 1 * dir;
      return 0;
    });
    const items = collected.slice(0, limit);
    const nextCursor = hardNextCursor || (lastKey ? Buffer.from(JSON.stringify(lastKey), 'utf8').toString('base64') : undefined);
    return NextResponse.json({ items, nextCursor });
  } catch (error) {
    console.error('List Documents Error:', error);
    return NextResponse.json({ message: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
