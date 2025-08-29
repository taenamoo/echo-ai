import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth/token';
import docClient, { STUDY_TABLE_NAME } from '@/lib/aws/dynamodb';
import { PutCommand, DeleteCommand, GetCommand, BatchWriteCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';

const TABLE_NAME = STUDY_TABLE_NAME;

// 특정 스터디 노트를 수정하는 핸들러 (PUT)
export async function PUT(req: NextRequest) {
  try {
    const id = req.nextUrl.pathname.split('/').pop();
    if (!id) return NextResponse.json({ message: 'ID가 필요합니다.' }, { status: 400 });

    const token = req.headers.get('authorization')?.split(' ')[1];
    if (!token) return NextResponse.json({ message: '인증 토큰이 없습니다.' }, { status: 401 });
    
    const decoded = verifyToken(token);
    if (!decoded || !decoded.userId) return NextResponse.json({ message: '유효하지 않은 토큰입니다.' }, { status: 401 });

    const body = await req.json();
    delete body.children;

    if (!body.title && body.content === undefined) {
      return NextResponse.json({ message: '필수 입력값이 부족합니다.' }, { status: 400 });
    }

    const { Item } = await docClient.send(new GetCommand({
        TableName: TABLE_NAME,
        Key: { user_id: decoded.userId, study_id: id }
    }));

    const updatedStudy = { ...Item, ...body, user_id: decoded.userId, study_id: id };

    await docClient.send(new PutCommand({
      TableName: TABLE_NAME,
      Item: updatedStudy,
    }));

    return NextResponse.json(updatedStudy);

  } catch (error: any) {
    console.error('Update Study Error:', error.message || error);
    return NextResponse.json({ message: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}

// 특정 스터디 노트를 삭제하는 핸들러 (DELETE)
export async function DELETE(req: NextRequest) {
  try {
    const studyIdToDelete = req.nextUrl.pathname.split('/').pop();
    if (!studyIdToDelete) {
        return NextResponse.json({ message: 'ID가 필요합니다.' }, { status: 400 });
    }

    const token = req.headers.get('authorization')?.split(' ')[1];
    if (!token) return NextResponse.json({ message: '인증 토큰이 없습니다.' }, { status: 401 });

    const decoded = verifyToken(token);
    if (!decoded || !decoded.userId) return NextResponse.json({ message: '유효하지 않은 토큰입니다.' }, { status: 401 });

    const userId = decoded.userId;

    const queryCommand = new QueryCommand({
        TableName: TABLE_NAME,
        KeyConditionExpression: 'user_id = :userId',
        ExpressionAttributeValues: { ':userId': userId },
    });
    const { Items } = await docClient.send(queryCommand);
    const childrenToDelete = (Items || []).filter(item => item.parent_id === studyIdToDelete);

    const deleteRequests = [{
        DeleteRequest: {
            Key: { user_id: userId, study_id: studyIdToDelete }
        }
    }];

    childrenToDelete.forEach(child => {
        deleteRequests.push({
            DeleteRequest: {
                Key: { user_id: userId, study_id: child.study_id }
            }
        });
    });
    
    if(deleteRequests.length > 0) {
        const batchWriteCommand = new BatchWriteCommand({
            RequestItems: {
                [TABLE_NAME]: deleteRequests
            }
        });
        await docClient.send(batchWriteCommand);
    }

    return NextResponse.json({ message: '삭제되었습니다.' }, { status: 200 });
    
  } catch (error: any) {
    console.error('Delete Study Error:', error.message || error);
    return NextResponse.json({ message: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
