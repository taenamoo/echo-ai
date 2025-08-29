import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { verifyToken } from '@/lib/auth/token';
import docClient, { MAIN_TABLE_NAME } from '@/lib/aws/dynamodb'; // 수정된 부분
import { s3Client } from '@/lib/aws/s3';
import { PutCommand } from '@aws-sdk/lib-dynamodb';
import { PutObjectCommand } from '@aws-sdk/client-s3';

const S3_BUCKET_NAME = process.env.S3_BUCKET_NAME;

export async function POST(req: NextRequest) {
  try {
    const token = req.headers.get('authorization')?.split(' ')[1];
    if (!token) {
      return NextResponse.json({ message: '인증 토큰이 없습니다.' }, { status: 401 });
    }
    const decoded = verifyToken(token);
    if (!decoded || !decoded.userId) {
      return NextResponse.json({ message: '유효하지 않은 토큰입니다.' }, { status: 401 });
    }
    const userId = decoded.userId;

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
