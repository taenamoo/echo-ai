import { NextResponse } from 'next/server';
import docClient, { DYNAMODB_TABLE_NAME } from '@/lib/aws/dynamodb';
import { QueryCommand } from '@aws-sdk/lib-dynamodb';
import { comparePassword } from '@/lib/auth/password';
import { generateAccessToken } from '@/lib/auth/token';

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { message: '이메일과 비밀번호를 입력해주세요.' },
        { status: 400 }
      );
    }

    // 1. 이메일로 사용자 조회
    const queryCommand = new QueryCommand({
      TableName: DYNAMODB_TABLE_NAME,
      IndexName: 'EmailIndex',
      KeyConditionExpression: 'email = :email',
      ExpressionAttributeValues: { ':email': email },
    });

    const { Items } = await docClient.send(queryCommand);
    if (!Items || Items.length === 0) {
      return NextResponse.json(
        { message: '이메일 또는 비밀번호가 올바르지 않습니다.' },
        { status: 401 }
      );
    }

    const user = Items[0];

    // 2. 비밀번호 비교
    const isPasswordValid = await comparePassword(
      password,
      user.hashedPassword
    );
    if (!isPasswordValid) {
      return NextResponse.json(
        { message: '이메일 또는 비밀번호가 올바르지 않습니다.' },
        { status: 401 }
      );
    }

    // 3. JWT Access Token 생성
    const accessToken = generateAccessToken(user.userId, user.email);

    // 4. 성공 응답 반환
    return NextResponse.json(
      { userId: user.userId, email: user.email, accessToken },
      { status: 200 }
    );
  } catch (error) {
    console.error('Login Error:', error);
    return NextResponse.json(
      { message: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
