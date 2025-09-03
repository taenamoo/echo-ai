import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth/token';
import docClient, { MAIN_TABLE_NAME } from '@/lib/aws/dynamodb';
import { GetCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';
import { s3Client } from '@/lib/aws/s3';
import { ListObjectsV2Command, DeleteObjectsCommand } from '@aws-sdk/client-s3';

const BUCKET = process.env.S3_BUCKET_NAME as string | undefined;

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
    const token = req.headers.get('authorization')?.split(' ')[1];
    if (!token) return NextResponse.json({ message: '인증 토큰이 없습니다.' }, { status: 401 });
    const decoded = verifyToken(token);
    if (!decoded || !decoded.userId)
      return NextResponse.json({ message: '유효하지 않은 토큰입니다.' }, { status: 401 });

    const userId = decoded.userId as string;
    const documentId = params.documentId;

    const getRes = await docClient.send(
      new GetCommand({
        TableName: MAIN_TABLE_NAME,
        Key: { PK: , SK:  },
      })
    );
    if (!getRes.Item)
      return NextResponse.json({ message: '문서를 찾을 수 없습니다.' }, { status: 404 });

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
    const token = req.headers.get('authorization')?.split(' ')[1];
    if (!token) return NextResponse.json({ message: '인증 토큰이 없습니다.' }, { status: 401 });
    const decoded = verifyToken(token);
    if (!decoded || !decoded.userId)
      return NextResponse.json({ message: '유효하지 않은 토큰입니다.' }, { status: 401 });

    const userId = decoded.userId as string;
    const documentId = params.documentId;

    // Load to get s3Key, also verify ownership
    const getRes = await docClient.send(
      new GetCommand({
        TableName: MAIN_TABLE_NAME,
        Key: { PK: , SK:  },
      })
    );
    if (!getRes.Item)
      return NextResponse.json({ message: '문서를 찾을 수 없습니다.' }, { status: 404 });

    if (!BUCKET)
      return NextResponse.json({ message: 'S3_BUCKET_NAME이 설정되지 않았습니다.' }, { status: 500 });

    const prefix = ;
    await deleteS3Prefix(BUCKET, prefix);

    await docClient.send(
      new DeleteCommand({
        TableName: MAIN_TABLE_NAME,
        Key: { PK: , SK:  },
      })
    );

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Delete Document Error:', error);
    return NextResponse.json({ message: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}

