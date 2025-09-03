import { NextRequest, NextResponse } from 'next/server';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { UpdateCommand, GetCommand } from '@aws-sdk/lib-dynamodb';
import { s3Client } from '@/lib/aws/s3';
import docClient, { MAIN_TABLE_NAME } from '@/lib/aws/dynamodb';
import { getUserIdFromRequest } from '@/lib/api/auth';
import { GoogleGenerativeAI } from '@google/generative-ai';

const BUCKET = process.env.S3_BUCKET_NAME as string | undefined;

type DocumentItem = {
  PK: string;
  SK: string;
  userId: string;
  documentId: string;
  filename: string;
  s3Key: string;
  filetype?: string;
  filesize?: number;
  status?: string;
  summaryText?: string;
  createdAt?: string;
  updatedAt?: string;
};

function isOwnedByUser(item: unknown, userId: string): item is DocumentItem {
  return !!item && typeof (item as any).userId === 'string' && (item as any).userId === userId;
}

async function streamToString(body: any): Promise<string> {
  if (!body) return '';
  // Node.js Readable stream
  if (typeof body.on === 'function') {
    return await new Promise<string>((resolve, reject) => {
      const chunks: Buffer[] = [];
      body.on('data', (chunk: Buffer) => chunks.push(chunk));
      body.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')));
      body.on('error', reject);
    });
  }
  // Web ReadableStream
  if (typeof body.getReader === 'function') {
    const reader = body.getReader();
    const chunks: Uint8Array[] = [];
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) chunks.push(value);
    }
    const total = chunks.reduce((acc, cur) => new Uint8Array([...acc, ...cur]), new Uint8Array());
    return new TextDecoder('utf-8').decode(total);
  }
  // Blob
  if (typeof body.text === 'function') {
    return await body.text();
  }
  return String(body);
}

async function loadDocument(userId: string, documentId: string): Promise<DocumentItem | null> {
  const res = await docClient.send(
    new GetCommand({
      TableName: MAIN_TABLE_NAME,
      Key: { PK: `USER#${userId}`, SK: `DOC#${documentId}` },
    })
  );
  if (!res.Item) return null;
  if (!isOwnedByUser(res.Item, userId)) return null;
  return res.Item as DocumentItem;
}

async function updateStatus(
  userId: string,
  documentId: string,
  status: 'PENDING' | 'UPLOADED' | 'PROCESSING' | 'COMPLETE' | 'FAILED',
  partial?: Partial<Pick<DocumentItem, 'summaryText' | 'filetype' | 'filesize'>>
) {
  const now = new Date().toISOString();
  const exprParts = ['#status = :status', '#updatedAt = :updatedAt'];
  const names: Record<string, string> = { '#status': 'status', '#updatedAt': 'updatedAt' };
  const values: Record<string, any> = { ':status': status, ':updatedAt': now };
  if (partial?.summaryText !== undefined) {
    exprParts.push('#summaryText = :summaryText');
    names['#summaryText'] = 'summaryText';
    values[':summaryText'] = partial.summaryText;
  }
  await docClient.send(
    new UpdateCommand({
      TableName: MAIN_TABLE_NAME,
      Key: { PK: `USER#${userId}`, SK: `DOC#${documentId}` },
      UpdateExpression: 'SET ' + exprParts.join(', '),
      ExpressionAttributeNames: names,
      ExpressionAttributeValues: values,
    })
  );
}

async function getObjectText(bucket: string, key: string): Promise<{ text: string; contentType?: string }> {
  const obj = await s3Client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
  const contentType = obj.ContentType;
  const bodyText = await streamToString(obj.Body as any);
  return { text: bodyText, contentType };
}

async function summarizeText(text: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY || '';
  if (!apiKey) throw new Error('GEMINI_API_KEY is not configured');
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
  const prompt = `아래 문서 내용을 한국어로 간결하게 요약해 주세요.\n\n---\n${text}\n---\n\n요약:`;
  const result = await model.generateContent(prompt);
  const resp = await result.response;
  return resp.text();
}

export async function POST(
  req: NextRequest,
  { params }: { params: { documentId: string } }
) {
  try {
    const userId = getUserIdFromRequest(req);
    if (!userId) return NextResponse.json({ message: '유효하지 않은 토큰입니다.' }, { status: 401 });
    const documentId = params.documentId;

    if (!BUCKET) {
      return NextResponse.json({ message: 'S3_BUCKET_NAME이 설정되지 않았습니다.' }, { status: 500 });
    }

    const doc = await loadDocument(userId, documentId);
    if (!doc) return NextResponse.json({ message: '문서를 찾을 수 없거나 권한이 없습니다.' }, { status: 404 });

    await updateStatus(userId, documentId, 'PROCESSING');

    const { text, contentType } = await getObjectText(BUCKET, doc.s3Key);

    const type = contentType || doc.filetype || '';
    const isTextLike = type.startsWith('text/') || type.includes('markdown') || !type;
    if (!isTextLike) {
      await updateStatus(userId, documentId, 'FAILED');
      return NextResponse.json({ message: `현재 파일 형식은 요약을 지원하지 않습니다: ${type || 'unknown'}` }, { status: 415 });
    }
    if (!text || text.trim().length === 0) {
      await updateStatus(userId, documentId, 'FAILED');
      return NextResponse.json({ message: '요약할 텍스트가 비어 있습니다.' }, { status: 400 });
    }

    const summary = await summarizeText(text);

    await updateStatus(userId, documentId, 'COMPLETE', { summaryText: summary });

    return NextResponse.json({ documentId, status: 'COMPLETE', summary, summaryText: summary });
  } catch (error: any) {
    console.error('Summarize Error:', error);
    // Best-effort: try to reflect FAILED if we can parse userId/docId
    try {
      const url = new URL(req.url);
      const documentId = url.pathname.split('/').filter(Boolean).pop() || '';
      const userId = getUserIdFromRequest(req);
      if (userId && documentId) {
        await updateStatus(userId, documentId, 'FAILED');
      }
    } catch {}
    return NextResponse.json({ message: '문서 요약 중 오류가 발생했습니다.' }, { status: 500 });
  }
}

