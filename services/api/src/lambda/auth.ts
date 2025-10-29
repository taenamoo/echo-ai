import type { APIGatewayProxyHandlerV2 } from 'aws-lambda';
import { loginHandler, signupHandler, meHandler } from '@echo-ai/api-core';
import { toApiGatewayResponse } from './utils/response';

export const signup: APIGatewayProxyHandlerV2 = async (event) => {
  const res = await signupHandler({
    method: event.requestContext?.http?.method || 'POST',
    path: event.rawPath || '/auth/signup',
    headers: event.headers as any,
    query: event.queryStringParameters as any,
    body: event.body || null,
  });
  return toApiGatewayResponse(res, event.headers ?? {});
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
  return toApiGatewayResponse(res, event.headers ?? {});
};

export const me: APIGatewayProxyHandlerV2 = async (event) => {
  const res = await meHandler({
    method: event.requestContext?.http?.method || 'GET',
    path: event.rawPath || '/me',
    headers: event.headers as any,
  });
  return toApiGatewayResponse(res, event.headers ?? {});
};

// json409 no longer used; shared handlers return proper structure
