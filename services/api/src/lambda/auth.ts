import type { APIGatewayProxyEventV2, APIGatewayProxyHandlerV2 } from 'aws-lambda';
import { dynamoDbDocumentClient, MAIN_TABLE_NAME } from '@echo-ai/aws-clients';
import { GetCommand, PutCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { generateAccessToken, hashPassword, validatePasswordPolicy, verifyTokenDetailed } from '@echo-ai/auth';
import { ok, created, badRequest, unauthorized, serverError, parseJson, getAuthToken } from './http';
import { randomUUID } from 'crypto';
import { loginHandler, signupHandler, meHandler } from '@echo-ai/api-core';

export const signup: APIGatewayProxyHandlerV2 = async (event) => {
  const res = await signupHandler({
    method: event.requestContext?.http?.method || 'POST',
    path: event.rawPath || '/auth/signup',
    headers: event.headers as any,
    query: event.queryStringParameters as any,
    body: event.body || null,
  });
  return { statusCode: res.status, headers: res.headers, body: JSON.stringify(res.body ?? {}) };
};

export const login: APIGatewayProxyHandlerV2 = async (event) => {
  // Adapt API Gateway event to shared normalized request
  const req = {
    method: event.requestContext?.http?.method || 'POST',
    path: event.rawPath || '/auth/login',
    headers: (event.headers || {}) as Record<string, string | undefined>,
    query: event.queryStringParameters as Record<string, string | undefined>,
    body: event.body || null,
  } as const;
  const res = await loginHandler(req);
  return {
    statusCode: res.status,
    headers: { 'content-type': 'application/json; charset=utf-8', ...(res.headers || {}) },
    body: JSON.stringify(res.body ?? {}),
  };
};

export const me: APIGatewayProxyHandlerV2 = async (event) => {
  const res = await meHandler({
    method: event.requestContext?.http?.method || 'GET',
    path: event.rawPath || '/me',
    headers: event.headers as any,
  });
  return { statusCode: res.status, headers: res.headers, body: JSON.stringify(res.body ?? {}) };
};

// json409 no longer used; shared handlers return proper structure
