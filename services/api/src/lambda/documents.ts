import type { APIGatewayProxyHandlerV2 } from 'aws-lambda';
import {
  createDocumentHandler,
  listDocumentsHandler,
  getDocumentHandler,
  deleteDocumentHandler,
  summarizeDocumentHandler,
} from '@echo-ai/api-core';
import { toApiGatewayResponse } from './utils/response';

// Now adapters delegate to shared handlers in @echo-ai/api-core

// POST /documents (metadata save after presign upload)
export const create: APIGatewayProxyHandlerV2 = async (event) => {
  const res = await createDocumentHandler({
    method: event.requestContext?.http?.method || 'POST',
    path: event.rawPath || '/documents',
    headers: event.headers as any,
    query: event.queryStringParameters as any,
    body: event.body || null,
  });
  return toApiGatewayResponse(res, event.headers ?? {});
};

// GET /documents?limit=&cursor=
export const list: APIGatewayProxyHandlerV2 = async (event) => {
  const res = await listDocumentsHandler({
    method: event.requestContext?.http?.method || 'GET',
    path: event.rawPath || '/documents',
    headers: event.headers as any,
    query: event.queryStringParameters as any,
  });
  return toApiGatewayResponse(res, event.headers ?? {});
};

// GET /documents/{id}
export const get: APIGatewayProxyHandlerV2 = async (event) => {
  const res = await getDocumentHandler({ method: 'GET', path: event.rawPath || '/documents/{id}', headers: event.headers as any, query: event.queryStringParameters as any, body: null, params: { id: event.pathParameters?.id! } });
  return toApiGatewayResponse(res, event.headers ?? {});
};

// DELETE /documents/{id}
export const remove: APIGatewayProxyHandlerV2 = async (event) => {
  const res = await deleteDocumentHandler({ method: 'DELETE', path: event.rawPath || '/documents/{id}', headers: event.headers as any, query: event.queryStringParameters as any, body: null, params: { id: event.pathParameters?.id! } });
  return toApiGatewayResponse(res, event.headers ?? {});
};

// POST /documents/{id}/summarize (enqueue)
export const summarize: APIGatewayProxyHandlerV2 = async (event) => {
  const res = await summarizeDocumentHandler({ method: 'POST', path: event.rawPath || '/documents/{id}/summarize', headers: event.headers as any, query: event.queryStringParameters as any, body: null, params: { id: event.pathParameters?.id! } });
  return toApiGatewayResponse(res, event.headers ?? {});
};
