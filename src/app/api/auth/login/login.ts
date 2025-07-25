import type { NextApiRequest, NextApiResponse } from 'next';
import docClient, { DYNAMODB_TABLE_NAME } from '@/lib/aws/dynamodb';
import { QueryCommand } from '@aws-sdk/lib-dynamodb';
import { comparePassword } from '@/lib/auth/password';
import { generateAccessToken } from '@/lib/auth/token';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: '이메일과 비밀번호를 입력해주세요.' });
  }

  try {
    const queryCommand = new QueryCommand({
      TableName: DYNAMODB_TABLE_NAME,
      IndexName: 'EmailIndex',
      KeyConditionExpression: 'email = :email',
      ExpressionAttributeValues: { ':email': email },
    });

    const { Items } = await docClient.send(queryCommand);
    if (!Items || Items.length === 0) {
      return res.status(401).json({ message: '이메일 또는 비밀번호가 올바르지 않습니다.' });
    }

    const user = Items[0];

    const isPasswordValid = await comparePassword(password, user.hashedPassword);
    if (!isPasswordValid) {
      return res.status(401).json({ message: '이메일 또는 비밀번호가 올바르지 않습니다.' });
    }

    const accessToken = generateAccessToken(user.userId, user.email);

    return res.status(200).json({ userId: user.userId, email: user.email, accessToken });

  } catch (error) {
    console.error('Login Error:', error);
    return res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
}
