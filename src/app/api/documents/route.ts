import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { verifyToken } from '@/lib/auth/token';
import docClient, { DYNAMODB_TABLE_NAME } from '@/lib/aws/dynamodb';
import { s3Client } from '@/lib/aws/s3';
import { PutCommand } from '@aws-sdk/lib-dynamodb';
import { PutObjectCommand } from '@aws-sdk/client-s3';

const S3_BUCKET_NAME = process.env.S3_BUCKET_NAME;

// 이 API는 POST /api/documents 경로의 요청을 처리합니다.
export async function POST(req: NextRequest) {
  try {
    // 1. 인증 토큰 검증
    const token = req.headers.get('authorization')?.split(' ')[1];
    if (!token) {
      return NextResponse.json({ message: '인증 토큰이 없습니다.' }, { status: 401 });
    }
    const decoded = verifyToken(token);
    if (!decoded || !decoded.userId) {
      return NextResponse.json({ message: '유효하지 않은 토큰입니다.' }, { status: 401 });
    }
    const userId = decoded.userId;

    // 2. 폼 데이터에서 파일 추출
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ message: '파일이 필요합니다.' }, { status: 400 });
    }
    
    if (!S3_BUCKET_NAME) {
      throw new Error("S3_BUCKET_NAME 환경 변수가 설정되지 않았습니다.");
    }

    // 3. S3에 업로드할 준비
    const documentId = uuidv4();
    const fileBuffer = Buffer.from(await file.arrayBuffer());
    // S3에 저장될 파일 경로 및 이름 (예: uploads/유저ID/문서ID/원본파일이름)
    const s3Key = `uploads/${userId}/${documentId}/${file.name}`;

    // 4. S3에 파일 업로드 실행
    const s3Command = new PutObjectCommand({
        Bucket: S3_BUCKET_NAME,
        Key: s3Key,
        Body: fileBuffer,
        ContentType: file.type,
    });
    await s3Client.send(s3Command);

    // 5. DynamoDB에 문서 메타데이터 저장
    const documentItem = {
        PK: `USER#${userId}`,
        SK: `DOC#${documentId}`,
        userId,
        documentId,
        filename: file.name,
        s3Key, // S3에 저장된 파일의 경로
        filetype: file.type,
        filesize: file.size,
        status: 'UPLOADED', // 초기 상태는 '업로드 완료'
        createdAt: new Date().toISOString(),
    };

    const dbCommand = new PutCommand({
        TableName: DYNAMODB_TABLE_NAME,
        Item: documentItem,
    });
    await docClient.send(dbCommand);

    // 6. 성공 응답으로 문서 ID 반환
    // 클라이언트는 이 ID를 사용해 다음 단계인 요약 요청을 보냅니다.
    return NextResponse.json({ documentId });

  } catch (error: any) {
    console.error('File Upload API Error:', error);
    if (error.name === 'JsonWebTokenError') {
        return NextResponse.json({ message: '손상된 토큰입니다.' }, { status: 401 });
    }
    return NextResponse.json({ message: '파일 업로드 중 서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
