import type { APIGatewayProxyHandlerV2 } from 'aws-lambda';
import { dynamoDbDocumentClient, STUDY_TABLE_NAME } from '@echo-ai/aws-clients';
import { GetCommand, PutCommand, DeleteCommand, QueryCommand, BatchWriteCommand } from '@aws-sdk/lib-dynamodb';
import { verifyTokenDetailed } from '@echo-ai/auth';
import { GoogleGenerativeAI, SchemaType, type GenerationConfig } from '@google/generative-ai';
import { getConfig } from '@echo-ai/config';

function bearer(headers: Record<string, string | undefined>): string | null {
  const a = headers['authorization'] || headers['Authorization'];
  if (!a) return null; return a.startsWith('Bearer ') ? a.substring(7) : a;
}
function authUserId(headers: Record<string, string | undefined>): string | null {
  const t = bearer(headers); if (!t) return null; const r = verifyTokenDetailed(t); return r.ok ? ((r.payload as any)?.userId as string) : null;
}
function json(statusCode: number, body: unknown) { return { statusCode, headers: { 'content-type': 'application/json; charset=utf-8' }, body: JSON.stringify(body ?? {}) }; }

type StudyItem = {
  user_id: string;
  study_id: string;
  parent_id: string | null;
  title: string;
  content?: string | null;
  good_example?: string | null;
  bad_example?: string | null;
  study_order: number;
  created_at: string;
};

function buildHierarchy(items: any[]) {
  const map = new Map<string, any>();
  for (const it of items) {
    if (typeof it.study_id === 'string') map.set(it.study_id, { ...it, children: [] });
  }
  const roots: any[] = [];
  for (const it of items) {
    if (typeof it.study_id !== 'string') continue;
    if (it.parent_id && map.has(it.parent_id)) map.get(it.parent_id).children.push(map.get(it.study_id));
    else roots.push(map.get(it.study_id));
  }
  return roots;
}

export const list: APIGatewayProxyHandlerV2 = async (event) => {
  const userId = authUserId(event.headers as any);
  if (!userId) return json(401, { message: '인증이 필요합니다.' });
  const res = await dynamoDbDocumentClient.send(new QueryCommand({
    TableName: STUDY_TABLE_NAME,
    KeyConditionExpression: 'user_id = :uid',
    ExpressionAttributeValues: { ':uid': userId },
  }));
  const items = res.Items || [];
  return json(200, buildHierarchy(items));
};

export const create: APIGatewayProxyHandlerV2 = async (event) => {
  const userId = authUserId(event.headers as any);
  if (!userId) return json(401, { message: '인증이 필요합니다.' });
  const body = event.body ? JSON.parse(event.body) : {};
  if (!body?.title || body?.study_order === undefined) return json(400, { message: '제목과 순서는 필수입니다.' });
  const { randomUUID } = await import('crypto');
  const item: StudyItem = {
    user_id: userId,
    study_id: randomUUID(),
    parent_id: body.parent_id || null,
    title: body.title,
    content: body.content || null,
    good_example: body.good_example || null,
    bad_example: body.bad_example || null,
    study_order: Number(body.study_order),
    created_at: new Date().toISOString(),
  };
  await dynamoDbDocumentClient.send(new PutCommand({ TableName: STUDY_TABLE_NAME, Item: item }));
  return json(201, item);
};

export const update: APIGatewayProxyHandlerV2 = async (event) => {
  const userId = authUserId(event.headers as any);
  if (!userId) return json(401, { message: '인증이 필요합니다.' });
  const id = event.pathParameters?.id;
  if (!id) return json(400, { message: 'ID가 필요합니다.' });
  const body = event.body ? JSON.parse(event.body) : {};
  delete body.children;
  const { Item } = await dynamoDbDocumentClient.send(new GetCommand({ TableName: STUDY_TABLE_NAME, Key: { user_id: userId, study_id: id } }));
  if (!Item) return json(404, { message: '수정할 스터디 노트를 찾을 수 없습니다.' });
  const updated = { ...Item, ...body };
  await dynamoDbDocumentClient.send(new PutCommand({ TableName: STUDY_TABLE_NAME, Item: updated }));
  return json(200, updated);
};

export const remove: APIGatewayProxyHandlerV2 = async (event) => {
  const userId = authUserId(event.headers as any);
  if (!userId) return json(401, { message: '인증이 필요합니다.' });
  const id = event.pathParameters?.id;
  if (!id) return json(400, { message: 'ID가 필요합니다.' });
  const { Items } = await dynamoDbDocumentClient.send(new QueryCommand({ TableName: STUDY_TABLE_NAME, KeyConditionExpression: 'user_id = :uid', ExpressionAttributeValues: { ':uid': userId } }));
  const children = (Items || []).filter((x: any) => x.parent_id === id);
  const all = [ { Key: { user_id: userId, study_id: id } }, ...children.map((c: any) => ({ Key: { user_id: userId, study_id: c.study_id } })) ];
  if (all.length > 0) {
    for (let i = 0; i < all.length; i += 25) {
      const chunk = all.slice(i, i + 25).map((x) => ({ DeleteRequest: x }));
      await dynamoDbDocumentClient.send(new BatchWriteCommand({ RequestItems: { [STUDY_TABLE_NAME]: chunk } }));
    }
  }
  return json(200, { message: '삭제되었습니다.' });
};

export const quiz: APIGatewayProxyHandlerV2 = async (event) => {
  const userId = authUserId(event.headers as any);
  if (!userId) return json(401, { message: '인증이 필요합니다.' });
  const body = event.body ? JSON.parse(event.body) : {};
  const content = body?.content;
  const count = Number(body?.count || 5);
  if (!content) return json(400, { error: '퀴즈 내용을 찾을 수 없습니다.' });
  const { geminiApiKey } = getConfig();
  const genAI = new GoogleGenerativeAI(geminiApiKey);
  const generationConfig: GenerationConfig = {
    responseMimeType: 'application/json',
    responseSchema: {
      type: SchemaType.OBJECT,
      properties: {
        quiz: {
          type: SchemaType.ARRAY,
          items: {
            type: SchemaType.OBJECT,
            properties: {
              question: { type: SchemaType.STRING },
              options: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
              answer: { type: SchemaType.STRING },
              explanation: { type: SchemaType.STRING },
            },
            required: ['question', 'options', 'answer', 'explanation'],
          },
        },
      },
      required: ['quiz'],
    },
  };
  const prompt = `당신은 React.js 전문가입니다. 다음 내용을 기반으로 객관식 퀴즈 ${count}개를 생성해주세요. 각 질문에는 4개의 선택지, 정답과 간단한 해설이 포함되어야 합니다. JSON으로만 응답하세요.\n내용: "${content}"`;
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-lite' });
  const result = await model.generateContent({ contents: [{ role: 'user', parts: [{ text: prompt }] }], generationConfig });
  const response = result.response;
  const text = response.text();
  let quizData: any = null; try { quizData = JSON.parse(text); } catch { quizData = { quiz: [] }; }
  return json(200, quizData);
};

export const search: APIGatewayProxyHandlerV2 = async (event) => {
  const userId = authUserId(event.headers as any);
  if (!userId) return json(401, { message: '인증이 필요합니다.' });
  try {
    const body = event.body ? JSON.parse(event.body) : {};
    const term: string = String(body?.searchTerm || '').trim();
    if (!term) return json(400, { message: 'searchTerm은 필수입니다.' });
    const { geminiApiKey } = getConfig();
    const genAI = new GoogleGenerativeAI(geminiApiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-lite' });
    const prompt = `당신은 친절한 학습 도우미입니다. 다음 검색 질의에 대해 간결하고 실용적인 한국어 답변을 제공하세요. 필요 시 목록을 사용하고, 관련 개념과 참고 링크(공식 문서 우선)를 제안하세요.\n질의: ${term}`;
    const result = await model.generateContent({ contents: [{ role: 'user', parts: [{ text: prompt }] }] });
    const text = (await result.response).text();
    return json(200, { result: text || '결과가 비어있습니다.' });
  } catch (e: any) {
    return json(500, { message: 'AI 검색 처리 중 오류가 발생했습니다.' });
  }
};

export const analyze: APIGatewayProxyHandlerV2 = async (event) => {
  const userId = authUserId(event.headers as any);
  if (!userId) return json(401, { message: '인증이 필요합니다.' });
  try {
    const body = event.body ? JSON.parse(event.body) : {};
    const content: string = String(body?.content || '');
    const good: string = String(body?.good_example || '');
    const bad: string = String(body?.bad_example || '');
    const documentTitle: string = String(body?.title || '학습 노트');
    const { geminiApiKey } = getConfig();
    const genAI = new GoogleGenerativeAI(geminiApiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-lite' });
    const prompt = `당신은 React 초보 개발자를 위한 코드 리뷰 멘토입니다. 아래 내용과 예시에 대해 추가 의견을 한국어로 작성하세요.\n제목: ${documentTitle}\n[내용]\n${content}\n[좋은 예시]\n${good}\n[나쁜 예시]\n${bad}\n요구사항:\n- 핵심 개념 요약\n- 좋은 개선 포인트 3~5개\n- 피해야 할 실수 3~5개\n- 참고할 공식 문서 링크 1~3개`;
    const result = await model.generateContent({ contents: [{ role: 'user', parts: [{ text: prompt }] }] });
    const text = (await result.response).text();
    return json(200, { suggestion: text || '' });
  } catch (e: any) {
    return json(500, { message: 'AI 분석 처리 중 오류가 발생했습니다.' });
  }
};
