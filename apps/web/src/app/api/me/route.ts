import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api/auth';
import { dynamoDbDocumentClient, MAIN_TABLE_NAME } from '@echo-ai/aws-clients';
import { GetCommand } from '@aws-sdk/lib-dynamodb';

interface UserProfile {
  userId: string;
  email?: string;
  name?: string;
}

export async function GET(req: NextRequest) {
  try {
    const res = requireAuth(req);
    if (!res.ok) return res.res;
    const userId = res.userId;

    const get = await dynamoDbDocumentClient.send(new GetCommand({
      TableName: MAIN_TABLE_NAME,
      Key: { PK: `USER#${userId}`, SK: `PROFILE#${userId}` },
    }));
    if (!get.Item) {
      return NextResponse.json({ userId }, { status: 200 });
    }
    const { email, name } = get.Item as UserProfile;
    return NextResponse.json({ userId, email, name: name || '' });
  } catch (error) {
    console.error('GET /api/me error', error);
    return NextResponse.json({ message: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
