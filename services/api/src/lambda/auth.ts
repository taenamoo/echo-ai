import type { APIGatewayProxyEventV2, APIGatewayProxyHandlerV2 } from 'aws-lambda';
import { dynamoDbDocumentClient, MAIN_TABLE_NAME } from '@echo-ai/aws-clients';
import { GetCommand, PutCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { generateAccessToken, hashPassword, validatePasswordPolicy, verifyTokenDetailed } from '@echo-ai/auth';
import { ok, created, badRequest, unauthorized, serverError, parseJson, getAuthToken } from './http';
import { randomUUID } from 'crypto';

export const signup: APIGatewayProxyHandlerV2 = async (event) => {
  try {
    const body = parseJson<{ email?: string; password?: string; name?: string }>(event.body);
    if (!body?.email || !body?.password) return badRequest('이메일과 비밀번호를 입력해주세요.');

    const pwCheck = validatePasswordPolicy(body.password);
    if (!pwCheck.ok) return badRequest(pwCheck.message || '비밀번호 정책을 충족하지 않습니다.');

    const query = new QueryCommand({
      TableName: MAIN_TABLE_NAME,
      IndexName: 'EmailIndex',
      KeyConditionExpression: 'email = :email',
      ExpressionAttributeValues: { ':email': body.email },
    });
    const { Items } = await dynamoDbDocumentClient.send(query);
    if (Items && Items.length > 0) return json409('이미 가입된 이메일입니다.');

    const userId = randomUUID();
    const hashedPassword = await hashPassword(body.password);
    await dynamoDbDocumentClient.send(new PutCommand({
      TableName: MAIN_TABLE_NAME,
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
    return created({ userId, email: body.email, name: body.name || '', accessToken });
  } catch (e) {
    console.error('Auth.signup error', e);
    return serverError();
  }
};

export const login: APIGatewayProxyHandlerV2 = async (event) => {
  try {
    const body = parseJson<{ email?: string; password?: string }>(event.body);
    if (!body?.email || !body?.password) return badRequest('이메일과 비밀번호를 입력해주세요.');

    const query = new QueryCommand({
      TableName: MAIN_TABLE_NAME,
      IndexName: 'EmailIndex',
      KeyConditionExpression: 'email = :email',
      ExpressionAttributeValues: { ':email': body.email },
    });
    const { Items } = await dynamoDbDocumentClient.send(query);
    if (!Items || Items.length === 0) return unauthorized('이메일 또는 비밀번호가 올바르지 않습니다.');

    const user = Items[0] as any;
    const { comparePassword } = await import('@echo-ai/auth');
    const okPw = await comparePassword(body.password, user.hashedPassword);
    if (!okPw) return unauthorized('이메일 또는 비밀번호가 올바르지 않습니다.');

    const accessToken = generateAccessToken(user.userId, user.email, { expiresIn: '1h' });
    return ok({ userId: user.userId, email: user.email, name: user.name || '', accessToken });
  } catch (e) {
    console.error('Auth.login error', e);
    return serverError();
  }
};

export const me: APIGatewayProxyHandlerV2 = async (event) => {
  try {
    const token = getAuthToken(event.headers || {});
    if (!token) return unauthorized('인증 토큰이 없습니다.');
    const res = verifyTokenDetailed(token);
    if (!res.ok) return unauthorized(res.reason === 'expired' ? '만료된 토큰입니다.' : '유효하지 않은 토큰입니다.');
    const payload = res.payload as any;
    const userId = payload?.userId as string;

    const get = await dynamoDbDocumentClient.send(new GetCommand({
      TableName: MAIN_TABLE_NAME,
      Key: { PK: `USER#${userId}`, SK: `PROFILE#${userId}` },
    }));
    if (!get.Item) return ok({ userId });
    const { email, name } = get.Item as any;
    return ok({ userId, email, name: name || '' });
  } catch (e) {
    console.error('Auth.me error', e);
    return serverError();
  }
};

function json409(message: string) {
  return { statusCode: 409, headers: { 'content-type': 'application/json' }, body: JSON.stringify({ message }) };
}
