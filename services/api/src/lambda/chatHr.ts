
import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { DynamoDBDocumentClient, QueryCommand } from '@aws-sdk/lib-dynamodb';
import {
  ok,
  badRequest,
  serverError,
  unauthorized,
  type NormalizedResponse,
} from '@echo-ai/api-core';
import { verifyTokenDetailed } from '@echo-ai/auth';
import { dynamoDbDocumentClient, MAIN_TABLE_NAME } from '@echo-ai/aws-clients';
import { getConfig, hydrateConfigFromSecrets } from '@echo-ai/config';

// --- Reusable helpers ---

const CHAT_MODEL = process.env.CHAT_MODEL || 'gemini-2.5-flash';
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

export const chat = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const corsHeaders = getCorsHeaders(event);
  try {
    // 1. Authenticate the user
    await hydrateConfigFromSecrets();
    const authResult = getAuth(event.headers);
    if (!authResult.ok) {
      return toApiGatewayResponse(authResult.res, corsHeaders);
    }
    const { userId } = authResult;

    // 2. Parse the question from the request body
    if (!event.body) {
      return toApiGatewayResponse(badRequest('질문 내용이 없습니다.'), corsHeaders);
    }
    const { question } = JSON.parse(event.body);
    if (!question || typeof question !== 'string') {
      return toApiGatewayResponse(badRequest('질문(question)은 문자열이어야 합니다.'), corsHeaders);
    }

    // 3. Fetch document summaries from DynamoDB
    const queryCommand = new QueryCommand({
      TableName: MAIN_TABLE_NAME,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :prefix)',
      FilterExpression: '#status = :statusVal AND attribute_exists(summaryText)',
      ExpressionAttributeNames: {
        '#status': 'status',
      },
      ExpressionAttributeValues: {
        ':pk': `USER#${userId}`,
        ':prefix': 'DOC#',
        ':statusVal': 'COMPLETE',
      },
    });

    const { Items: documents = [] } = await dynamoDbDocumentClient.send(queryCommand);
    const context = documents.map((doc) => doc.summaryText).join('\n\n---\n\n');

    // 4. Construct the prompt with context
    const prompt = `
      당신은 회사의 HR 규정 전문가입니다. 아래 제공된 HR 문서들의 요약본을 바탕으로 사용자의 질문에 대해 답변해주세요.
      문서에 관련 내용이 없으면 "제공된 문서에서는 관련 정보를 찾을 수 없습니다."라고 답변하세요.
      추측해서 답변하지 마세요. 답변은 항상 한국어로 작성해주세요.

      [HR 문서 요약본]
      ${context || '관련 문서 요약본 없음'}

      [사용자 질문]
      ${question}

      답변:
    `;

    // 5. Call the Google Gemini API
    const client = await ensureGenAIClient();
    const model = client.getGenerativeModel({ model: CHAT_MODEL });
    
    const result = await model.generateContent(prompt);
    const reply = result.response.text();

    // 6. Return the response
    return toApiGatewayResponse(ok({ reply }), corsHeaders);

  } catch (error) {
    console.error('Chat handler error:', error);
    const res = serverError('채팅 처리 중 오류가 발생했습니다.');
    return toApiGatewayResponse(res, corsHeaders);
  }
};