import type { SQSEvent, SQSRecord } from 'aws-lambda';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { GetCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { s3Client, dynamoDbDocumentClient, MAIN_TABLE_NAME } from '@echo-ai/aws-clients';
import { extractTextFromBuffer, streamToBuffer } from '@echo-ai/documents';
import { getConfig, hydrateConfigFromSecrets, type AppConfig } from '@echo-ai/config';
import { GoogleGenerativeAI, type GenerationConfig } from '@google/generative-ai';

type SummarizeMessage = {
  type: 'DOCUMENT_SUMMARIZE';
  userId: string;
  documentId: string;
  requestedAt: string;
};

type PartialBatchResponse = { batchItemFailures: { itemIdentifier: string }[] };

const SUMMARIZE_MODEL = process.env.SUMMARIZE_MODEL || 'gemini-2.0-flash';
const SUMMARIZE_TIMEOUT_MS = Number(process.env.SUMMARIZE_TIMEOUT_MS || 25000);
const SUMMARIZE_MAX_CHARS = Number(process.env.SUMMARIZE_MAX_CHARS || 20000);
const SUMMARIZE_MAX_OUTPUT_TOKENS = Number(process.env.SUMMARIZE_MAX_OUTPUT_TOKENS || 1024);
async function ensureConfig(): Promise<AppConfig> {
  await hydrateConfigFromSecrets();
  return getConfig();
}

function shouldUseMock(config: AppConfig): boolean {
  if (typeof process.env.SUMMARIZE_USE_MOCK === 'string') {
    return /^true$/i.test(process.env.SUMMARIZE_USE_MOCK);
  }
  return config.stage === 'local';
}

export async function handler(event: SQSEvent): Promise<PartialBatchResponse> {
  const config = await ensureConfig();
  const useMock = shouldUseMock(config);
  const failures: { itemIdentifier: string }[] = [];

  for (const record of event.Records) {
    try {
      const msg = parseMessage(record);
      if (!msg) {
        failures.push({ itemIdentifier: record.messageId });
        continue;
      }

      // 1) Load document metadata, verify ownership by key
      const doc = await loadDocument(msg.userId, msg.documentId);
      if (!doc || !doc.s3Key) {
        logFailure('document-metadata-missing', {
          userId: msg.userId,
          documentId: msg.documentId,
          recordId: record.messageId,
          doc,
        });
        await safeUpdateStatus(msg.userId, msg.documentId, 'FAILED');
        continue;
      }

      // 2) Signal processing (best-effort)
      await safeUpdateStatus(msg.userId, msg.documentId, 'PROCESSING');

      // 3) Fetch and extract text
      let text: string | null = null;
      let contentType: string | undefined;
      try {
        const res = await getObjectText(config.s3BucketName, doc.s3Key);
        text = res.text;
        contentType = res.contentType;
      } catch (error) {
        logFailure('s3-read-failed', {
          userId: msg.userId,
          documentId: msg.documentId,
          recordId: record.messageId,
          bucket: config.s3BucketName,
          key: doc.s3Key,
          error,
        });
        throw error;
      }
      if (!text || text.trim().length === 0) {
        logFailure('text-empty', {
          userId: msg.userId,
          documentId: msg.documentId,
          recordId: record.messageId,
          bucket: config.s3BucketName,
          key: doc.s3Key,
          contentType,
        });
        await safeUpdateStatus(msg.userId, msg.documentId, 'FAILED');
        continue;
      }

      // 4) Summarize via Gemini
      const truncated = text.length > SUMMARIZE_MAX_CHARS ? text.slice(0, SUMMARIZE_MAX_CHARS) : text;
      let summaryText: string;
      try {
        summaryText = await summarizeText(truncated, config, useMock);
      } catch (error) {
        logFailure('summarize-failed', {
          userId: msg.userId,
          documentId: msg.documentId,
          recordId: record.messageId,
          error,
          textLength: truncated.length,
          useMock,
        });
        throw error;
      }

      // 5) Persist result
      await safeUpdateStatus(msg.userId, msg.documentId, 'COMPLETE', { summaryText });
    } catch (err) {
      logFailure('record-processing-error', {
        error: err,
        recordId: record.messageId,
        body: record.body,
      });
      failures.push({ itemIdentifier: record.messageId });
      try {
        const msg = parseMessage(record);
        if (msg) await safeUpdateStatus(msg.userId, msg.documentId, 'FAILED');
      } catch (e) {
        // swallow
      }
    }
  }

  return { batchItemFailures: failures };
}

function parseMessage(record: SQSRecord): SummarizeMessage | null {
  try {
    const body = JSON.parse(record.body);
    if (body && body.type === 'DOCUMENT_SUMMARIZE' && body.userId && body.documentId) {
      return body as SummarizeMessage;
    }
  } catch (e) {
    console.error('Invalid SQS message body', { body: record.body });
  }
  return null;
}

async function loadDocument(userId: string, documentId: string): Promise<
  | ({
      userId: string;
      documentId: string;
      s3Key?: string;
      filetype?: string | null;
    } & Record<string, any>)
  | null
> {
  const res = await dynamoDbDocumentClient.send(
    new GetCommand({
      TableName: MAIN_TABLE_NAME,
      Key: { PK: `USER#${userId}`, SK: `DOC#${documentId}` },
    })
  );
  const item = (res.Item || null) as any;
  if (!item || item.userId !== userId) return null;
  return item;
}

async function safeUpdateStatus(
  userId: string,
  documentId: string,
  status: 'PENDING' | 'UPLOADED' | 'PROCESSING' | 'COMPLETE' | 'FAILED',
  partial?: { summaryText?: string }
) {
  const now = new Date().toISOString();
  const expr: string[] = ['#status = :status', '#updatedAt = :updatedAt'];
  const names: Record<string, string> = { '#status': 'status', '#updatedAt': 'updatedAt' };
  const values: Record<string, any> = { ':status': status, ':updatedAt': now };
  if (partial && Object.prototype.hasOwnProperty.call(partial, 'summaryText')) {
    expr.push('#summaryText = :summaryText');
    names['#summaryText'] = 'summaryText';
    values[':summaryText'] = partial.summaryText ?? null;
  }
  try {
    await dynamoDbDocumentClient.send(
      new UpdateCommand({
        TableName: MAIN_TABLE_NAME,
        Key: { PK: `USER#${userId}`, SK: `DOC#${documentId}` },
        UpdateExpression: 'SET ' + expr.join(', '),
        ExpressionAttributeNames: names,
        ExpressionAttributeValues: values,
      })
    );
  } catch (e) {
    console.error('Failed to update status', { userId, documentId, status, e });
  }
}

async function getObjectText(bucket: string, key: string): Promise<{ text: string; contentType?: string }>
{
  const obj = await s3Client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
  const contentType = obj.ContentType;
  const buf = await streamToBuffer(obj.Body as any);
  const text = await extractTextFromBuffer(buf, contentType);
  return { text: text || '', contentType };
}

async function summarizeText(text: string, config: AppConfig, useMock: boolean): Promise<string> {
  if (useMock || !config.geminiApiKey) {
    const cleaned = text.replace(/\s+/g, ' ').slice(0, 800);
    return `요약(모의): ${cleaned}${cleaned.length === 800 ? '…' : ''}`;
  }

  const genAI = new GoogleGenerativeAI(config.geminiApiKey);
  const model = genAI.getGenerativeModel({ model: SUMMARIZE_MODEL });

  const promptTemplate = process.env.SUMMARIZE_PROMPT_TEMPLATE || `아래 문서 내용을 한국어로 간결하게 요약해 주세요.\n---\n${text}\n---\n요약:`;
  const generationConfig: GenerationConfig = {
    maxOutputTokens: SUMMARIZE_MAX_OUTPUT_TOKENS,
  };

  const timeout = new Promise<string>((_, reject) =>
    setTimeout(() => reject(new Error('Summarization timed out')), SUMMARIZE_TIMEOUT_MS)
  );

  const task = (async () => {
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: promptTemplate }] }],
      generationConfig,
    });
    const resp = await result.response;
    return resp.text();
  })();

  return (await Promise.race([task, timeout])) as string;
}

function formatError(error: unknown) {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
  }
  return { message: String(error) };
}

function logFailure(stage: string, context: Record<string, unknown>) {
  const { error, ...rest } = context;
  console.error('[AiProcessor]', stage, {
    ...rest,
    error: error ? formatError(error) : undefined,
  });
}
