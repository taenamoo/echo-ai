/**
 * @file src/app/api/study/[id]/route.ts
 * @module StudyDetailAPI
 * @description 특정 스터디 노트의 수정(PUT) 및 삭제(DELETE)를 처리하는 동적 API 라우트 핸들러입니다.
 * @overview
 * 이 파일은 Next.js의 App Router의 동적 세그먼트(Dynamic Segments) 기능을 사용합니다.
 * 파일 경로의 `[id]` 부분은 URL 경로의 일부(예: /api/study/abc-123)를 동적으로 받아오며,
 * 이를 통해 특정 스터디 노트를 식별하여 수정하거나 삭제하는 작업을 수행합니다.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthStatus } from '@/lib/api/auth';
import docClient, { STUDY_TABLE_NAME } from '@/lib/aws/dynamodb';
import { PutCommand, DeleteCommand, GetCommand, BatchWriteCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';

// --- 상수 정의 ---
// [클린 코드] 하드코딩된 문자열 대신 상수를 사용하여 코드의 일관성과 유지보수성을 높입니다.
const TABLE_NAME = STUDY_TABLE_NAME;

/**
 * @function PUT
 * @description PUT /api/study/{study_id}
 * 특정 스터디 노트를 수정합니다.
 * @param {NextRequest} req - 수정할 데이터를 포함하는 요청 객체.
 * @returns {Promise<NextResponse>} 수정된 스터디 노트 객체 또는 에러 메시지를 포함하는 응답.
 */
export async function PUT(req: NextRequest) {
  try {
    // 1. [동적 라우팅] URL 경로에서 동적 세그먼트인 study_id를 추출합니다.
    const id = req.nextUrl.pathname.split('/').pop();
    if (!id) return NextResponse.json({ message: 'ID가 필요합니다.' }, { status: 400 });

    // 2. [인증] 요청 헤더에서 인증 토큰을 추출하고 유효성을 검사합니다.
    const auth = getAuthStatus(req);
    if (auth.status !== 'ok') {
      const msg = auth.status === 'missing' ? '인증 토큰이 없습니다.' : auth.status === 'expired' ? '만료된 토큰입니다.' : '유효하지 않은 토큰입니다.';
      return NextResponse.json({ message: msg }, { status: 401 });
    }

    // 3. [요청 파싱] 클라이언트(StudyForm)에서 보낸 수정 데이터를 추출합니다.
    const body = await req.json();
    // [클린 코드] 클라이언트에서 받은 데이터 중 불필요한 `children` 속성을 제거하여 데이터 정합성을 유지합니다.
    delete body.children;

    // 4. [데이터 조회] 수정하기 전에, 원본 데이터를 조회하여 기존 값과 병합할 준비를 합니다.
    const { Item: existingStudy } = await docClient.send(new GetCommand({
        TableName: TABLE_NAME,
        Key: { user_id: auth.userId, study_id: id }
    }));

    // [클린 코드] 원본 데이터가 없는 경우를 명시적으로 처리하여 안정성을 높입니다.
    if (!existingStudy) {
        return NextResponse.json({ message: '수정할 스터디 노트를 찾을 수 없습니다.' }, { status: 404 });
    }

    // 5. [데이터 병합] 원본 데이터(existingStudy)에 새로운 수정 데이터(body)를 덮어씁니다.
    const updatedStudy = { ...existingStudy, ...body };

    // 6. [데이터베이스 쓰기] DynamoDB에 수정된 스터디 아이템을 저장하는 명령을 실행합니다.
    await docClient.send(new PutCommand({
      TableName: TABLE_NAME,
      Item: updatedStudy,
    }));

    // 7. [응답] 성공적으로 수정된 객체를 클라이언트에 반환합니다.
    return NextResponse.json(updatedStudy);

  } catch (error: any) {
    console.error('Update Study Error:', error.message || error);
    return NextResponse.json({ message: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}

/**
 * @function DELETE
 * @description DELETE /api/study/{study_id}
 * 특정 스터디 노트와 그 하위 노트들을 모두 삭제합니다.
 * @param {NextRequest} req - 삭제할 노트의 ID를 경로에 포함하는 요청 객체.
 * @returns {Promise<NextResponse>} 성공 메시지 또는 에러 메시지를 포함하는 응답.
 */
export async function DELETE(req: NextRequest) {
  try {
    // 1. [동적 라우팅] URL 경로에서 삭제할 study_id를 추출합니다.
    const studyIdToDelete = req.nextUrl.pathname.split('/').pop();
    if (!studyIdToDelete) {
        return NextResponse.json({ message: 'ID가 필요합니다.' }, { status: 400 });
    }

    // 2. [인증] 토큰 유효성을 검사합니다.
    const auth = getAuthStatus(req);
    if (auth.status !== 'ok') {
      const msg = auth.status === 'missing' ? '인증 토큰이 없습니다.' : auth.status === 'expired' ? '만료된 토큰입니다.' : '유효하지 않은 토큰입니다.';
      return NextResponse.json({ message: msg }, { status: 401 });
    }

    const userId = auth.userId;

    // 3. [데이터 조회] 삭제할 노트의 하위 노트들을 찾기 위해 사용자의 모든 노트를 조회합니다.
    const queryCommand = new QueryCommand({
        TableName: TABLE_NAME,
        KeyConditionExpression: 'user_id = :userId',
        ExpressionAttributeValues: { ':userId': userId },
    });
    const { Items } = await docClient.send(queryCommand);

    // 4. [삭제 대상 식별] 삭제할 메인 노트와 그 자식 노트들의 ID 목록을 만듭니다.
    const childrenToDelete = (Items || []).filter(item => item.parent_id === studyIdToDelete);
    const allItemsToDelete = [
        { Key: { user_id: userId, study_id: studyIdToDelete } }, // 삭제할 메인 노트
        ...childrenToDelete.map(child => ({ Key: { user_id: userId, study_id: child.study_id } })) // 삭제할 자식 노트들
    ];

    // [클린 코드] 삭제할 아이템이 있을 때만 DB에 요청을 보냅니다.
    if (allItemsToDelete.length > 0) {
        // [기능: 배치(Batch) 작업]
        // 여러 개의 삭제 요청을 한 번의 API 호출로 처리하여 네트워크 오버헤드를 줄이고 성능을 향상시킵니다.
        const deleteRequests = allItemsToDelete.map(item => ({ DeleteRequest: item }));
        
        // DynamoDB는 한 번에 최대 25개의 항목만 배치로 쓸 수 있으므로, 청크로 나누어 처리합니다.
        for (let i = 0; i < deleteRequests.length; i += 25) {
            const chunk = deleteRequests.slice(i, i + 25);
            const batchWriteCommand = new BatchWriteCommand({
                RequestItems: {
                    [TABLE_NAME]: chunk
                }
            });
            await docClient.send(batchWriteCommand);
        }
    }

    // 5. [응답] 성공 메시지를 클라이언트에 반환합니다.
    return NextResponse.json({ message: '삭제되었습니다.' }, { status: 200 });
    
  } catch (error: any) {
    console.error('Delete Study Error:', error.message || error);
    return NextResponse.json({ message: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
