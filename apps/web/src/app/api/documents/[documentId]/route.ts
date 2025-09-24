import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api/auth';
import { dynamoDbDocumentClient, MAIN_TABLE_NAME } from '@echo-ai/aws-clients';
import { GetCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';
import { s3Client } from '@echo-ai/aws-clients';
import { ListObjectsV2Command, DeleteObjectsCommand } from '@aws-sdk/client-s3';
import { getConfig } from '@echo-ai/config';

const { s3BucketName: BUCKET } = getConfig();

// Type guard for DynamoDB document item ownership
function isOwnedByUser(item: unknown, userId: string): item is { userId: string } {
  return !!item && typeof (item as any).userId === 'string' && (item as any).userId === userId;
}

async function deleteS3Prefix(bucket: string, prefix: string) {
  let ContinuationToken: string | undefined = undefined;
  do {
    const listed = await s3Client.send(
      new ListObjectsV2Command({ Bucket: bucket, Prefix: prefix, ContinuationToken })
    );
    const contents = listed.Contents || [];
    if (contents.length === 0) break;
    const Objects = contents.map((obj) => ({ Key: obj.Key! }));
    await s3Client.send(
      new DeleteObjectsCommand({ Bucket: bucket, Delete: { Objects } })
    );
    ContinuationToken = listed.IsTruncated ? listed.NextContinuationToken : undefined;
  } while (ContinuationToken);
}

export async function GET(
  req: NextRequest,
  { params }: { params: { documentId: string } }
) {
  try {
    // userId is derived from the Authorization token, not from params
    const auth = requireAuth(req);
    if (!auth.ok) return auth.res;
    const userId = auth.userId;
    const documentId = params.documentId;

    const getRes = await dynamoDbDocumentClient.send(
      new GetCommand({
        TableName: MAIN_TABLE_NAME,
        Key: { PK: `USER#${userId}`, SK: `DOC#${documentId}` },
      })
    );
    if (!getRes.Item)
      return NextResponse.json({ message: '문서를 찾을 수 없습니다.' }, { status: 404 });
    if (!isOwnedByUser(getRes.Item, userId)) {
      return NextResponse.json({ message: '문서에 접근할 권한이 없습니다.' }, { status: 403 });
    }

    return NextResponse.json(getRes.Item);
  } catch (error) {
    console.error('Get Document Error:', error);
    return NextResponse.json({ message: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { documentId: string } }
) {
  try {
    // userId is derived from the Authorization token, not from params
    const auth = requireAuth(req);
    if (!auth.ok) return auth.res;
    const userId = auth.userId;
    const documentId = params.documentId;

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

    const prefix = `uploads/${userId}/${documentId}/`;
    await deleteS3Prefix(BUCKET, prefix);

    await dynamoDbDocumentClient.send(
      new DeleteCommand({
        TableName: MAIN_TABLE_NAME,
        Key: { PK: `USER#${userId}`, SK: `DOC#${documentId}` },
      })
    );

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Delete Document Error:', error);
    return NextResponse.json({ message: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
