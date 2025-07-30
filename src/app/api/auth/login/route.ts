import { NextRequest, NextResponse } from 'next/server';
import docClient, { DYNAMODB_TABLE_NAME } from '@/lib/aws/dynamodb';
import { QueryCommand } from '@aws-sdk/lib-dynamodb';
import { comparePassword } from '@/lib/auth/password';
import { generateAccessToken } from '@/lib/auth/token';

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { message: '이메일과 비밀번호를 입력해주세요.' },
        { status: 400 }
      );
    }

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

    const accessToken = generateAccessToken(user.userId, user.email);

    return NextResponse.json({
      userId: user.userId,
      email: user.email,
      accessToken,
    });
  } catch (error) {
    console.error('Login Error:', error);
    return NextResponse.json(
      { message: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
