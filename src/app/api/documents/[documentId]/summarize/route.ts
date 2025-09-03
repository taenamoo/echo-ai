import { NextRequest, NextResponse } from 'next/server';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { UpdateCommand, GetCommand } from '@aws-sdk/lib-dynamodb';
import { s3Client } from '@/lib/aws/s3';
import docClient, { MAIN_TABLE_NAME } from '@/lib/aws/dynamodb';
import { getUserIdFromRequest } from '@/lib/api/auth';
import { GoogleGenerativeAI, GenerationConfig } from '@google/generative-ai';
import { extractTextFromBuffer, streamToBuffer } from '@/lib/documents/text-extract';
import type { DocumentItem } from '@/types/document';
import { enqueueSummarizeJob } from '@/lib/documents/queue';

const BUCKET = process.env.S3_BUCKET_NAME || '';
const SUMMARIZE_MODEL = process.env.SUMMARIZE_MODEL || 'gemini-1.5-flash';
const SUMMARIZE_TIMEOUT_MS = Number(process.env.SUMMARIZE_TIMEOUT_MS || 45000);
const SUMMARIZE_MAX_CHARS = Number(process.env.SUMMARIZE_MAX_CHARS || 20000);
const SUMMARIZE_MAX_OUTPUT_TOKENS = Number(process.env.SUMMARIZE_MAX_OUTPUT_TOKENS || 1024);
const SUMMARIZE_ASYNC = /^true$/i.test(process.env.SUMMARIZE_ASYNC || '');

const PK_PREFIX_USER = 'USER#';
const SK_PREFIX_DOC = 'DOC#';

function isOwnedByUser(item: { userId?: unknown } | null | undefined, userId: string): item is { userId: string } {
  return !!item && item.userId === userId;
}

async function loadDocument(userId: string, documentId: string): Promise<DocumentItem | null> {
  const res = await docClient.send(
    new GetCommand({
      TableName: MAIN_TABLE_NAME,
      Key: { PK: `${PK_PREFIX_USER}${userId}`, SK: `${SK_PREFIX_DOC}${documentId}` },
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
  partial?: Partial<Pick<DocumentItem, 'summaryText'>>
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
      Key: { PK: `${PK_PREFIX_USER}${userId}`, SK: `${SK_PREFIX_DOC}${documentId}` },
      UpdateExpression: 'SET ' + exprParts.join(', '),
      ExpressionAttributeNames: names,
      ExpressionAttributeValues: values,
    })
  );
}

async function getObjectText(bucket: string, key: string): Promise<{ text: string; contentType?: string }> {
  const obj = await s3Client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
  const contentType = obj.ContentType;
  const buf = await streamToBuffer(obj.Body as any);
  const text = await extractTextFromBuffer(buf, contentType);
  return { text: text || '', contentType };
}

async function summarizeText(text: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY || '';
  if (!apiKey) throw new Error('GEMINI_API_KEY is not configured');
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: SUMMARIZE_MODEL });
  const promptTemplate = process.env.SUMMARIZE_PROMPT_TEMPLATE || `아래 문서 내용을 한국어로 간결하게 요약해 주세요.
---
\${text}
---
요약:`;
  const prompt = promptTemplate.replace('${text}', text);

  const generationConfig: GenerationConfig = {
    maxOutputTokens: SUMMARIZE_MAX_OUTPUT_TOKENS,
  };

  return await new Promise<string>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Summarization timed out')), SUMMARIZE_TIMEOUT_MS);
    (async () => {
  const prompt = process.env.SUMMARIZE_PROMPT_TEMPLATE || `아래 문서 내용을 한국어로 간결하게 요약해 주세요.\\n---\\n\${text}\\n---\\n요약:`;
        const result = await model.generateContent({ contents: [{ role: 'user', parts: [{ text: prompt }] }], generationConfig });
        const resp = await result.response;
        clearTimeout(timer);
        resolve(resp.text());
      } catch (err) {
        clearTimeout(timer);
        reject(err);
      }
    })();
  });
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

    // Prevent concurrent summarization when already processing
    if ((doc.status || '').toUpperCase() === 'PROCESSING') {
      return NextResponse.json({ message: '해당 문서는 요약 처리 중입니다.' }, { status: 409 });
    }

    // Optional async path via SQS (non-blocking)
    if (SUMMARIZE_ASYNC) {
      await updateStatus(userId, documentId, 'PROCESSING');
      try {
        await enqueueSummarizeJob(userId, documentId);
      } catch (e) {
        console.error('Failed to enqueue summarize job:', e);
        await updateStatus(userId, documentId, 'FAILED');
        return NextResponse.json({ message: '요약 작업 큐잉에 실패했습니다.' }, { status: 500 });
      }
      return NextResponse.json({ documentId, status: 'PROCESSING', queued: true }, { status: 202 });
    }

    await updateStatus(userId, documentId, 'PROCESSING');

    const { text, contentType } = await getObjectText(BUCKET, doc.s3Key);

    const type = contentType || doc.filetype || '';
    if (!text || text.trim().length === 0) {
      await updateStatus(userId, documentId, 'FAILED');
      return NextResponse.json({ message: `요약할 텍스트를 추출하지 못했습니다. 형식: ${type || 'unknown'}` }, { status: 415 });
    }

    const truncated = text.length > SUMMARIZE_MAX_CHARS ? text.slice(0, SUMMARIZE_MAX_CHARS) : text;
    const summary = await summarizeText(truncated);

    await updateStatus(userId, documentId, 'COMPLETE', { summaryText: summary });

    return NextResponse.json({ documentId, status: 'COMPLETE', summaryText: summary });
  } catch (error: any) {
    console.error('Summarize Error:', error);
    // Best-effort: reflect FAILED using known params
    try {
      const uid = getUserIdFromRequest(req);
      const docId = params.documentId;
      if (uid && docId) {
        await updateStatus(uid, docId, 'FAILED');
      }
    } catch (innerError) {
      console.error('Failed to update status to FAILED in error handler:', innerError);
    }
    return NextResponse.json({ message: '문서 요약 중 오류가 발생했습니다.', error: (error as Error).message || 'unknown error' }, { status: 500 });
  }
}
