import type { NormalizedRequest, NormalizedResponse } from './types';
import { dynamoDbDocumentClient, ACCOUNTS_TABLE_NAME } from '@echo-ai/aws-clients';
import { GetCommand, PutCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { comparePassword, generateAccessToken, verifyTokenDetailed } from '@echo-ai/auth';
import { LoginSchema, SignupSchema } from './schemas';
import { hydrateConfigFromSecrets } from '@echo-ai/config';
import { ok, badRequest, unauthorized, conflict, serverError, json } from './http';

export async function loginHandler(req: NormalizedRequest): Promise<NormalizedResponse> {
  try {
    await hydrateConfigFromSecrets();
    const parsed = req.body ? safeJson<unknown>(req.body) : null;
    const result = LoginSchema.safeParse(parsed);
    if (!result.success) return badRequest('이메일과 비밀번호를 입력해주세요.', { issues: result.error.issues }, 'VALIDATION_ERROR');
    const body = result.data;

    const query = new QueryCommand({
      TableName: ACCOUNTS_TABLE_NAME,
      IndexName: 'EmailIndex',
      KeyConditionExpression: 'email = :email',
      ExpressionAttributeValues: { ':email': body.email },
    });
    const { Items } = await dynamoDbDocumentClient.send(query);
    if (!Items || Items.length === 0) return unauthorized('이메일 또는 비밀번호가 올바르지 않습니다.');

    const user: any = Items[0];
    const okPw = await comparePassword(body.password, user.hashedPassword);
    if (!okPw) return unauthorized('이메일 또는 비밀번호가 올바르지 않습니다.');

    const accessToken = generateAccessToken(user.userId, user.email, { expiresIn: '1h' });
    return ok({ userId: user.userId, email: user.email, name: user.name || '', accessToken });
  } catch (e) {
    console.error('loginHandler error', e);
    return serverError();
  }
}

export async function signupHandler(req: NormalizedRequest): Promise<NormalizedResponse> {
  try {
    await hydrateConfigFromSecrets();
    const parsed = req.body ? safeJson<unknown>(req.body) : null;
    const checkInput = SignupSchema.safeParse(parsed);
    if (!checkInput.success) return badRequest('이메일과 비밀번호를 입력해주세요.', { issues: checkInput.error.issues }, 'VALIDATION_ERROR');
    const body = checkInput.data;

    const { validatePasswordPolicy, hashPassword } = await import('@echo-ai/auth');
    const check = validatePasswordPolicy(body.password);
    if (!check.ok) return badRequest(check.message || '비밀번호 정책을 충족하지 않습니다.');

    const exists = await dynamoDbDocumentClient.send(new QueryCommand({
      TableName: ACCOUNTS_TABLE_NAME,
      IndexName: 'EmailIndex',
      KeyConditionExpression: 'email = :email',
      ExpressionAttributeValues: { ':email': body.email },
    }));
    if (exists.Items && exists.Items.length > 0) return conflict('이미 가입된 이메일입니다.');

    const { randomUUID } = await import('crypto');
    const userId = randomUUID();
    const hashedPassword = await hashPassword(body.password);
    await dynamoDbDocumentClient.send(new PutCommand({
      TableName: ACCOUNTS_TABLE_NAME,
      Item: {
        PK: `USER#${userId}`,
        SK: `PROFILE#${userId}`,
        userId,
        email: body.email,
        hashedPassword,
        name: body.name || '',
        createdAt: new Date().toISOString(),
      },
    }));
    const accessToken = generateAccessToken(userId, body.email, { expiresIn: '1h' });
    return json(201, { userId, email: body.email, name: body.name || '', accessToken });
  } catch (e) {
    console.error('signupHandler error', e);
    return serverError();
  }
}

export async function meHandler(req: NormalizedRequest): Promise<NormalizedResponse> {
  try {
    await hydrateConfigFromSecrets();
    const token = getAuthToken(req.headers);
    if (!token) return unauthorized('인증 토큰이 없습니다.');
    const res = verifyTokenDetailed(token);
    if (!res.ok) return unauthorized(res.reason === 'expired' ? '만료된 토큰입니다.' : '유효하지 않은 토큰입니다.', { reason: res.reason });
    const payload = res.payload as any;
    const userId = payload?.userId as string;
    const get = await dynamoDbDocumentClient.send(new GetCommand({
      TableName: ACCOUNTS_TABLE_NAME,
      Key: { PK: `USER#${userId}`, SK: `PROFILE#${userId}` },
    }));
    if (!get.Item) return ok({ userId });
    const { email, name } = get.Item as any;
    return ok({ userId, email, name: name || '' });
  } catch (e) {
    console.error('meHandler error', e);
    return serverError();
  }
}

function safeJson<T>(raw: string): T | null {
  try { return JSON.parse(raw) as T; } catch { return null; }
}

// Shared HTTP helpers are used instead of local definitions

function getAuthToken(headers: Record<string, string | undefined>): string | null {
  const auth = headers['authorization'] || headers['Authorization'];
  if (!auth) return null;
  return auth.startsWith('Bearer ') ? auth.substring(7) : auth;
}
