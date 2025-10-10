import type { APIGatewayProxyHandlerV2 } from 'aws-lambda';
import { createPresignHandler } from '@echo-ai/api-core';
import { toApiGatewayResponse } from './utils/response';

export const createPresign: APIGatewayProxyHandlerV2 = async (event) => {
  const res = await createPresignHandler({
    method: event.requestContext?.http?.method || 'POST',
    path: event.rawPath || '/documents/presign',
    headers: event.headers as any,
    body: event.body || null,
  });
  return toApiGatewayResponse(res, event.headers ?? {});
};
