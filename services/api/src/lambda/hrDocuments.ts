import type {
  APIGatewayProxyHandlerV2,
  APIGatewayProxyEventV2,
} from 'aws-lambda';
import { listDocumentsHandler } from '@echo-ai/api-core';
import { toApiGatewayResponse } from './utils/response';

export const list: APIGatewayProxyHandlerV2 = async (
  event: APIGatewayProxyEventV2,
) => {
  const res = await listDocumentsHandler({
    method: event.requestContext?.http?.method || 'GET',
    path: event.rawPath || '/hr-documents',
    headers: event.headers as any,
    query: {
      ...event.queryStringParameters,
      tags: ['hr'], // Always filter by 'hr' tag
    } as any,
  });
  return toApiGatewayResponse(res, event.headers ?? {});
};