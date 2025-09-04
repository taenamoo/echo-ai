import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api/auth';
import docClient, { MAIN_TABLE_NAME } from '@/lib/aws/dynamodb';
import { GetCommand } from '@aws-sdk/lib-dynamodb';

export async function GET(req: Request) {
  try {
    // NextRequest type not required for header-only use here
    // but we can cast for requireAuth compatibility
    const res = requireAuth(req as any);
    if (!res.ok) return res.res;
    const userId = res.userId;

    const get = await docClient.send(new GetCommand({
      TableName: MAIN_TABLE_NAME,
      Key: { PK: `USER#${userId}`, SK: `PROFILE#${userId}` },
    }));
    if (!get.Item) {
      return NextResponse.json({ userId }, { status: 200 });
    }
    const { email, name } = get.Item as any;
    return NextResponse.json({ userId, email, name: name || '' });
  } catch (error) {
    console.error('GET /api/me error', error);
    return NextResponse.json({ message: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}

