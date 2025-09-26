import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api/auth';
import { getDocumentHandler, deleteDocumentHandler } from '@echo-ai/api-core';

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ documentId: string }> }
) {
  try {
    // userId is derived from the Authorization token, not from params
    const auth = requireAuth(req);
    if (!auth.ok) return auth.res;
    const userId = auth.userId;
    const { documentId } = await context.params;

    const res = await getDocumentHandler({
      method: 'GET',
      path: `/api/documents/${documentId}`,
      headers: Object.fromEntries(req.headers.entries()),
      params: { id: documentId },
    });
    return NextResponse.json(res.body ?? {}, { status: res.status, headers: res.headers });
  } catch (error) {
    console.error('Get Document Error:', error);
    return NextResponse.json({ message: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ documentId: string }> }
) {
  try {
    // userId is derived from the Authorization token, not from params
    const auth = requireAuth(req);
    if (!auth.ok) return auth.res;
    const userId = auth.userId;
    const { documentId } = await context.params;

    // Load to get s3Key, also verify ownership
    const getRes = await dynamoDbDocumentClient.send(
      new GetCommand({
        TableName: MAIN_TABLE_NAME,
        Key: { PK: `USER#${userId}`, SK: `DOC#${documentId}` },
      })
    );
    if (!getRes.Item)
      return NextResponse.json({ message: '문서를 찾을 수 없습니다.' }, { status: 404 });
    if (!isOwnedByUser(getRes.Item, userId)) {
      return NextResponse.json({ message: '문서를 삭제할 권한이 없습니다.' }, { status: 403 });
    }

    const res = await deleteDocumentHandler({
      method: 'DELETE',
      path: `/api/documents/${documentId}`,
      headers: Object.fromEntries(req.headers.entries()),
      params: { id: documentId },
    });
    return NextResponse.json(res.body ?? {}, { status: res.status, headers: res.headers });
  } catch (error) {
    console.error('Delete Document Error:', error);
    return NextResponse.json({ message: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
