
import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { BatchGetCommand } from '@aws-sdk/lib-dynamodb';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import {
  ok,
  badRequest,
  serverError,
  unauthorized,
  type NormalizedResponse,
} from '@echo-ai/api-core';
import { verifyTokenDetailed } from '@echo-ai/auth';
import {
  dynamoDbDocumentClient,
  DOCUMENTS_TABLE_NAME,
  DOCUMENT_CONTENT_TABLE_NAME,
  s3Client,
} from '@echo-ai/aws-clients';
import { getConfig, hydrateConfigFromSecrets } from '@echo-ai/config';
import { streamToBuffer } from '@echo-ai/documents';

// --- Reusable helpers ---

const CHAT_MODEL = process.env.CHAT_MODEL || 'gemini-2.5-flash';
const MAX_SELECTED_DOCUMENTS = Number(process.env.CHAT_MAX_DOCUMENTS || 3);
const CHUNK_SIZE = Number(process.env.CHAT_CHUNK_SIZE || 600) || 600;
const MAX_CHUNKS_PER_DOCUMENT = Number(
  process.env.CHAT_MAX_CHUNKS_PER_DOC || 3,
);
const MAX_CONTEXT_CHUNKS =
  Number(process.env.CHAT_MAX_CONTEXT_CHUNKS || 6) || 6;
let genAI: GoogleGenerativeAI | null = null;

function getCorsHeaders(event: APIGatewayProxyEvent): Record<string, string> {
  const allowOrigin = process.env.CORS_ALLOW_ORIGIN || 'http://localhost:5173';
  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Headers': 'authorization,content-type',
  };
}

function toApiGatewayResponse(res: NormalizedResponse, headers: Record<string, string>): APIGatewayProxyResult {
    return {
        statusCode: res.status,
        headers: { ...headers, ...res.headers },
        body: JSON.stringify(res.body),
    };
}

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

async function ensureGenAIClient(): Promise<GoogleGenerativeAI> {
  if (genAI) {
    return genAI;
  }
  await hydrateConfigFromSecrets();
  const config = getConfig();
  if (!config.geminiApiKey) {
    throw new Error('GEMINI_API_KEY is not configured.');
  }
  genAI = new GoogleGenerativeAI(config.geminiApiKey);
  return genAI;
}


// --- Chat Handler with Context from Summaries ---

export const chat = async (
  event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> => {
  const corsHeaders = getCorsHeaders(event);
  try {
    await hydrateConfigFromSecrets();
    const authResult = getAuth(event.headers);
    if (!authResult.ok) {
      return toApiGatewayResponse(authResult.res, corsHeaders);
    }
    const { userId } = authResult;
    const config = getConfig();

    if (!event.body) {
      return toApiGatewayResponse(
        badRequest('질문과 문서 정보를 포함한 본문이 필요합니다.'),
        corsHeaders,
      );
    }

    let payload: any;
    try {
      payload = JSON.parse(event.body);
    } catch {
      return toApiGatewayResponse(
        badRequest('요청 본문이 JSON 형식이 아닙니다.'),
        corsHeaders,
      );
    }

    const questionInput = typeof payload?.question === 'string' ? payload.question.trim() : '';
    if (!questionInput) {
      return toApiGatewayResponse(
        badRequest('질문(question)은 비어 있지 않은 문자열이어야 합니다.'),
        corsHeaders,
      );
    }

    const docIdsInput = Array.isArray(payload?.documentIds)
      ? payload.documentIds
      : [];
    const normalizedDocIds = Array.from(
      new Set(
        docIdsInput
          .map((id: unknown) => (typeof id === 'string' ? id.trim() : ''))
          .filter((id) => id.length > 0),
      ),
    );
    if (normalizedDocIds.length === 0) {
      return toApiGatewayResponse(
        badRequest('documentIds 배열에 최소 한 개의 문서를 지정해야 합니다.'),
        corsHeaders,
      );
    }
    if (normalizedDocIds.length > MAX_SELECTED_DOCUMENTS) {
      return toApiGatewayResponse(
        badRequest(`문서는 최대 ${MAX_SELECTED_DOCUMENTS}개까지 선택할 수 있습니다.`),
        corsHeaders,
      );
    }

    const documents = await loadSelectedDocuments(
      userId,
      normalizedDocIds,
      config.s3BucketName,
    );
    if (documents.length !== normalizedDocIds.length) {
      return toApiGatewayResponse(
        badRequest('선택한 문서 중 처리할 수 없는 문서가 있습니다. 상태를 확인하세요.'),
        corsHeaders,
      );
    }

    const selectedChunks = selectRelevantChunks(questionInput, documents);
    if (selectedChunks.length === 0) {
      return toApiGatewayResponse(
        ok({
          reply: '제공된 문서에서는 관련 정보를 찾을 수 없습니다.',
          sources: [],
        }),
        corsHeaders,
      );
    }

    const prompt = buildPrompt(questionInput, documents, selectedChunks);
    const client = await ensureGenAIClient();
    const model = client.getGenerativeModel({ model: CHAT_MODEL });
    const result = await model.generateContent(prompt);
    const reply = result.response.text();

    const sources = selectedChunks.map((chunk) => ({
      documentId: chunk.documentId,
      filename: chunk.filename,
      chunkIndex: chunk.chunkIndex,
      snippet: chunk.text.slice(0, 400),
    }));

    return toApiGatewayResponse(ok({ reply, sources }), corsHeaders);
  } catch (error) {
    console.error('Chat handler error:', error);
    const res = serverError('채팅 처리 중 오류가 발생했습니다.');
    return toApiGatewayResponse(res, corsHeaders);
  }
};

type LoadedDocument = {
  documentId: string;
  filename: string;
  summaryText: string | null;
  text: string;
};

type SelectedChunk = {
  documentId: string;
  filename: string;
  chunkIndex: number;
  text: string;
  score: number;
};

async function loadSelectedDocuments(
  userId: string,
  documentIds: string[],
  bucketName: string,
): Promise<LoadedDocument[]> {
  if (!documentIds.length) return [];

  const keys = documentIds.map((id) => ({
    PK: `USER#${userId}`,
    SK: `DOC#${id}`,
  }));

  const [metaRes, contentRes] = await Promise.all([
    dynamoDbDocumentClient.send(
      new BatchGetCommand({
        RequestItems: {
          [DOCUMENTS_TABLE_NAME]: { Keys: keys },
        },
      }),
    ),
    dynamoDbDocumentClient.send(
      new BatchGetCommand({
        RequestItems: {
          [DOCUMENT_CONTENT_TABLE_NAME]: { Keys: keys },
        },
      }),
    ),
  ]);

  const metaItems =
    (metaRes.Responses?.[DOCUMENTS_TABLE_NAME] as any[]) ?? [];
  const contentItems =
    (contentRes.Responses?.[DOCUMENT_CONTENT_TABLE_NAME] as any[]) ?? [];

  const metaMap = new Map<string, any>();
  for (const meta of metaItems) {
    metaMap.set(meta.documentId, meta);
  }

  const contentMap = new Map<string, any>();
  for (const content of contentItems) {
    contentMap.set(content.documentId, content);
  }

  const documents: LoadedDocument[] = [];

  for (const documentId of documentIds) {
    const meta = metaMap.get(documentId);
    if (!meta || meta.userId !== userId || meta.status !== 'COMPLETE') {
      continue;
    }
    const content = contentMap.get(documentId);
    if (!content || !content.contentS3Key) {
      continue;
    }
    const text = await fetchDocumentText(bucketName, content.contentS3Key);
    documents.push({
      documentId,
      filename: meta.filename || documentId,
      summaryText: content.summaryText || null,
      text,
    });
  }

  return documents;
}

async function fetchDocumentText(bucket: string, key: string): Promise<string> {
  try {
    const res = await s3Client.send(
      new GetObjectCommand({
        Bucket: bucket,
        Key: key,
      }),
    );
    const buffer = await streamToBuffer(res.Body as any);
    return buffer.toString('utf8');
  } catch (error) {
    console.error('Failed to retrieve document text', { bucket, key, error });
    throw error;
  }
}

function selectRelevantChunks(
  question: string,
  documents: LoadedDocument[],
): SelectedChunk[] {
  const tokens = tokenize(question);
  const allChunks: SelectedChunk[] = [];

  for (const doc of documents) {
    const parts = chunkText(doc.text, CHUNK_SIZE);
    const scored = parts.map((text, idx) => ({
      documentId: doc.documentId,
      filename: doc.filename,
      chunkIndex: idx,
      text,
      score: scoreChunk(tokens, text),
    }));
    scored.sort((a, b) => b.score - a.score);
    const limit = Math.min(
      Math.max(1, MAX_CHUNKS_PER_DOCUMENT),
      scored.length,
    );
    const top = scored.slice(0, limit);
    if (top.length === 0 && scored.length > 0) {
      top.push(scored[0]);
    }
    allChunks.push(...top);
  }

  allChunks.sort((a, b) => b.score - a.score);
  const maxChunks = Math.max(
    1,
    Math.min(MAX_CONTEXT_CHUNKS, allChunks.length),
  );
  return allChunks.slice(0, maxChunks);
}

function chunkText(text: string, size: number): string[] {
  const normalized = text.replace(/\r\n/g, '\n');
  const paragraphs = normalized.split(/\n{2,}/);
  const chunks: string[] = [];
  let current = '';

  for (const paragraph of paragraphs) {
    const trimmed = paragraph.trim();
    if (!trimmed) continue;
    if (!current) {
      if (trimmed.length > size) {
        for (let i = 0; i < trimmed.length; i += size) {
          chunks.push(trimmed.slice(i, i + size));
        }
        current = '';
      } else {
        current = trimmed;
      }
      continue;
    }
    if ((current + '\n\n' + trimmed).length <= size) {
      current = `${current}\n\n${trimmed}`;
    } else {
      chunks.push(current);
      if (trimmed.length > size) {
        for (let i = 0; i < trimmed.length; i += size) {
          chunks.push(trimmed.slice(i, i + size));
        }
        current = '';
      } else {
        current = trimmed;
      }
    }
  }

  if (current) chunks.push(current);
  if (chunks.length === 0 && text.trim()) {
    chunks.push(text.trim().slice(0, size));
  }

  return chunks.map((chunk) => chunk.trim()).filter(Boolean);
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^0-9a-zA-Z가-힣\s]/g, ' ')
    .split(/\s+/)
    .filter((token) => token.length > 1);
}

function scoreChunk(tokens: string[], chunk: string): number {
  if (tokens.length === 0) return 0;
  const normalized = chunk.toLowerCase();
  let score = 0;
  for (const token of tokens) {
    if (normalized.includes(token)) {
      score += 1;
    }
  }
  return score;
}

function buildPrompt(
  question: string,
  documents: LoadedDocument[],
  chunks: SelectedChunk[],
): string {
  const docSummaries = documents
    .map(
      (doc) =>
        `- ${doc.filename} (ID: ${doc.documentId}) 요약: ${
          doc.summaryText ? doc.summaryText : '요약 없음'
        }`,
    )
    .join('\n');

  const contextBlocks = chunks
    .map(
      (chunk, index) =>
        `### 출처 ${index + 1}\n문서명: ${chunk.filename}\n문서 ID: ${
          chunk.documentId
        }\n청크 번호: ${chunk.chunkIndex + 1}\n내용:\n${chunk.text}`,
    )
    .join('\n\n');

  return `
당신은 회사 HR 규정과 정책을 정확히 안내하는 AI 어시스턴트입니다.
- 반드시 제공된 문서 청크와 요약에서 근거를 찾아 답변하세요.
- 근거가 없다면 "제공된 문서에서는 관련 정보를 찾을 수 없습니다."라고 답하십시오.
- 답변 마지막에 참조한 문서 ID와 청크 번호를 괄호로 표기하세요. 예: (문서 ID: abc123, 청크: 2)
- 답변은 한국어로 작성하세요.

선택된 문서와 요약:
${docSummaries || '제공된 요약이 없습니다.'}

참고할 문서 청크:
${contextBlocks}

사용자 질문:
${question}

가능한 한 명확하고 간결하게 답변하세요.
`.trim();
}
