import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { verifyToken } from '@/lib/auth/token';
import { getUserIdFromRequest } from '@/lib/api/auth';
import docClient, { MAIN_TABLE_NAME } from '@/lib/aws/dynamodb'; // 수정된 부분
import { s3Client } from '@/lib/aws/s3';
import { PutCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { PutObjectCommand } from '@aws-sdk/client-s3';

const S3_BUCKET_NAME = process.env.S3_BUCKET_NAME;

export async function POST(req: NextRequest) {
  try {
    const userId = getUserIdFromRequest(req);
    if (!userId) {
      return NextResponse.json({ message: '유효하지 않은 토큰입니다.' }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ message: '파일이 필요합니다.' }, { status: 400 });
    }
    
    if (!S3_BUCKET_NAME) {
      throw new Error("S3_BUCKET_NAME 환경 변수가 설정되지 않았습니다.");
    }

    const documentId = uuidv4();
    const fileBuffer = Buffer.from(await file.arrayBuffer());
    const s3Key = `uploads/${userId}/${documentId}/${file.name}`;

    const s3Command = new PutObjectCommand({
        Bucket: S3_BUCKET_NAME,
        Key: s3Key,
        Body: fileBuffer,
        ContentType: file.type,
    });
    await s3Client.send(s3Command);

    const documentItem = {
        PK: `USER#${userId}`,
        SK: `DOC#${documentId}`,
        userId,
        documentId,
        filename: file.name,
        s3Key,
        filetype: file.type,
        filesize: file.size,
        status: 'UPLOADED',
        createdAt: new Date().toISOString(),
    };

    const dbCommand = new PutCommand({
        TableName: MAIN_TABLE_NAME, // 수정된 부분
        Item: documentItem,
    });
    await docClient.send(dbCommand);

    return NextResponse.json({ documentId });

  } catch (error: any) {
    console.error('File Upload API Error:', error);
    if (error.name === 'JsonWebTokenError') {
        return NextResponse.json({ message: '손상된 토큰입니다.' }, { status: 401 });
    }
    return NextResponse.json({ message: '파일 업로드 중 서버 오류가 발생했습니다.' }, { status: 500 });
  }
}

// GET /api/documents?limit=20&cursor=<base64>
export async function GET(req: NextRequest) {
  try {
    const userId = getUserIdFromRequest(req);
    if (!userId) return NextResponse.json({ message: '유효하지 않은 토큰입니다.' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const limitParam = Number(searchParams.get('limit') || 20);
    const limit = Math.max(1, Math.min(100, isNaN(limitParam) ? 20 : limitParam));
    const cursor = searchParams.get('cursor');

    const pk = `USER#${userId}`;

    let ExclusiveStartKey: any = undefined;
    if (cursor) {
      try {
        ExclusiveStartKey = JSON.parse(Buffer.from(cursor, 'base64').toString('utf8'));
      } catch {
        return NextResponse.json({ message: '잘못된 cursor 값입니다.' }, { status: 400 });
      }
    }

    const cmd = new QueryCommand({
      TableName: MAIN_TABLE_NAME,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :prefix)',
      ExpressionAttributeValues: {
        ':pk': pk,
        ':prefix': 'DOC#',
      },
      Limit: limit,
      ExclusiveStartKey,
      ScanIndexForward: false,
    });
    const res = await docClient.send(cmd);

    const items = (res.Items || []).map((it: any) => ({
      documentId: it.documentId,
      filename: it.filename,
      filetype: it.filetype,
      filesize: it.filesize,
      status: it.status,
      createdAt: it.createdAt,
      updatedAt: it.updatedAt || null,
    }));

    const nextCursor = res.LastEvaluatedKey
      ? Buffer.from(JSON.stringify(res.LastEvaluatedKey), 'utf8').toString('base64')
      : undefined;

    return NextResponse.json({ items, nextCursor });
  } catch (error) {
    console.error('List Documents Error:', error);
    return NextResponse.json({ message: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
