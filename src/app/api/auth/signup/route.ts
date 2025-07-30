import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import docClient, { DYNAMODB_TABLE_NAME } from '@/lib/aws/dynamodb';
import { QueryCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import { hashPassword } from '@/lib/auth/password';
import { generateAccessToken } from '@/lib/auth/token';

export async function POST(req: NextRequest) {
  try {
    const { email, password, name } = await req.json();

    // Validate inputs
    if (!email || !password) {
      return NextResponse.json(
        { message: '이메일과 비밀번호를 입력해주세요.' },
        { status: 400 }
      );
    }

    // Check if user already exists
    const queryCommand = new QueryCommand({
      TableName: DYNAMODB_TABLE_NAME,
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

    // Create new user
    const userId = uuidv4();
    const hashedPassword = await hashPassword(password);

    const putCommand = new PutCommand({
      TableName: DYNAMODB_TABLE_NAME,
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

    // Generate access token
    const accessToken = generateAccessToken(userId, email);

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
