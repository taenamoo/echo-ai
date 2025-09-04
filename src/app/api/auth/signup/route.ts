import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import docClient, { MAIN_TABLE_NAME } from '@/lib/aws/dynamodb'; // 수정된 부분
import { QueryCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import { hashPassword, validatePasswordPolicy } from '@/lib/auth/password';
import { generateAccessToken } from '@/lib/auth/token';

export async function POST(req: NextRequest) {
  try {
    const { email, password, name } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { message: '이메일과 비밀번호를 입력해주세요.' },
        { status: 400 }
      );
    }

    // 비밀번호 정책: 최소 8자, 숫자/문자 조합, 공백 금지
    const pwCheck = validatePasswordPolicy(password);
    if (!pwCheck.ok) {
      return NextResponse.json(
        { message: pwCheck.message || '비밀번호 정책을 충족하지 않습니다.' },
        { status: 400 }
      );
    }

    const queryCommand = new QueryCommand({
      TableName: MAIN_TABLE_NAME, // 수정된 부분
      IndexName: 'EmailIndex',
      KeyConditionExpression: 'email = :email',
      ExpressionAttributeValues: { ':email': email },
    });

    const { Items } = await docClient.send(queryCommand);
    if (Items && Items.length > 0) {
      return NextResponse.json(
        { message: '이미 가입된 이메일입니다.' },
        { status: 409 }
      );
    }

    const userId = uuidv4();
    const hashedPassword = await hashPassword(password);

    const putCommand = new PutCommand({
      TableName: MAIN_TABLE_NAME, // 수정된 부분
      Item: {
        PK: `USER#${userId}`,
        SK: `PROFILE#${userId}`,
        userId,
        email,
        hashedPassword,
        name: name || '',
        createdAt: new Date().toISOString(),
      },
    });

    await docClient.send(putCommand);

    const accessToken = generateAccessToken(userId, email, { expiresIn: '1h' });

    return NextResponse.json(
      {
        userId,
        email,
        name: name || '',
        accessToken,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Signup Error:', error);
    return NextResponse.json(
      { message: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
