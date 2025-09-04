/**
 * @file src/app/api/study/route.ts
 * @module StudyAPI
 * @description 스터디 노트 데이터의 조회(GET) 및 생성(POST)을 처리하는 API 라우트 핸들러입니다.
 * @overview
 * 이 파일은 Next.js의 App Router를 기반으로 동작하는 서버 측 코드입니다.
 * React 클라이언트(예: page.tsx)에서 axios를 통해 '/api/study'로 보내는 HTTP 요청을 받아 처리하고,
 * AWS DynamoDB와 통신하여 데이터를 관리한 후 결과를 클라이언트에 응답합니다.
 */

import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { requireAuth } from '@/lib/api/auth';
import docClient, { STUDY_TABLE_NAME } from '@/lib/aws/dynamodb';
import { PutCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';

// --- 상수 정의 ---
// [클린 코드] 하드코딩된 문자열 대신 상수를 사용하여 코드의 일관성과 유지보수성을 높입니다.
const TABLE_NAME = STUDY_TABLE_NAME;

// --- TypeScript 인터페이스 정의 ---
// [클린 코드] 데이터의 구조를 타입으로 명확하게 정의하여 코드의 안정성과 가독성을 향상시킵니다.
interface StudyNode {
  study_id: string;
  parent_id: string | null;
  children: StudyNode[];
  [key: string]: any; // DynamoDB에서 오는 다른 모든 속성을 포함합니다.
}

/**
 * @function buildHierarchy
 * @description 평면적인 스터디 데이터 배열을 부모-자식 관계를 갖는 계층 구조(트리)로 변환합니다.
 * @param {any[]} studies - DynamoDB에서 조회한 스터디 아이템들의 배열.
 * @returns {StudyNode[]} 계층 구조로 정렬된 스터디 노드 배열.
 * @rationale
 * 데이터베이스에는 데이터가 보통 평면적으로 저장됩니다. 하지만 UI(React)에서는
 * 중첩된 메뉴나 목록 형태로 보여줘야 할 때가 많습니다. 이 함수는 데이터베이스에서 가져온
 * 원본 데이터를 UI에서 사용하기 좋은 트리 구조로 가공하는 역할을 합니다.
 */
const buildHierarchy = (studies: any[]): StudyNode[] => {
  const studyMap = new Map<string, StudyNode>();

  // 1. 모든 스터디 아이템을 Map에 저장하여 O(1) 시간 복잡도로 빠르게 찾을 수 있도록 준비합니다.
  studies.forEach(item => {
    // study_id가 문자열이 아닌 경우를 필터링하여 데이터 정합성을 보장합니다.
    if (typeof item.study_id === 'string') {
        studyMap.set(item.study_id, {
            ...item,
            children: [],
        });
    }
  });

  const hierarchicalStudies: StudyNode[] = [];

  // 2. 다시 모든 아이템을 순회하면서 부모-자식 관계를 설정합니다.
  studies.forEach(study => {
    // study_id가 유효한지 다시 확인합니다.
    if (typeof study.study_id !== 'string') return;
    
    // 부모 ID(parent_id)가 있고, Map에 해당 부모가 존재하면 자식으로 추가합니다.
    if (study.parent_id && studyMap.has(study.parent_id)) {
      const parentNode = studyMap.get(study.parent_id)!;
      const childNode = studyMap.get(study.study_id)!;
      if (childNode) {
          parentNode.children.push(childNode);
      }
    } 
    // 부모 ID가 없는 최상위 노드는 최종 결과 배열에 직접 추가합니다.
    else {
      const rootNode = studyMap.get(study.study_id);
      if (rootNode) {
        hierarchicalStudies.push(rootNode);
      }
    }
  });

  return hierarchicalStudies;
};


/**
 * @function GET
 * @description GET /api/study
 * 사용자의 모든 스터디 노트를 조회하여 계층 구조로 반환합니다.
 * @param {NextRequest} req - 클라이언트로부터의 요청 객체.
 * @returns {Promise<NextResponse>} 스터디 노트 목록 또는 에러 메시지를 포함하는 응답.
 */
export async function GET(req: NextRequest) {
  try {
    // 1. 요청 헤더에서 인증 토큰을 추출하고 유효성을 검사합니다.
    const auth = requireAuth(req);
    if (!auth.ok) return auth.res;

    // 2. DynamoDB에 보낼 쿼리 명령을 준비합니다.
    //    user_id를 기준으로 해당 사용자의 모든 스터디 노트를 조회합니다.
    const queryCommand = new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: 'user_id = :userId',
      ExpressionAttributeValues: { ':userId': auth.userId },
    });

    // 3. DynamoDB에 쿼리를 실행하고 결과를 가져옵니다.
    const { Items } = await docClient.send(queryCommand);
    
    // 4. 조회된 평면적인 데이터를 UI에서 사용하기 좋은 계층 구조로 변환합니다.
    const hierarchicalStudies = buildHierarchy(Items || []);

    // 5. 최종적으로 가공된 데이터를 클라이언트(React)에 JSON 형태로 응답합니다.
    return NextResponse.json(hierarchicalStudies);

  } catch (error: any) {
    console.error('Get Studies Error:', error.message || error);
    return NextResponse.json({ message: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}

/**
 * @function POST
 * @description POST /api/study
 * 새로운 스터디 노트를 생성합니다.
 * @param {NextRequest} req - 클라이언트의 폼(Form) 데이터를 포함하는 요청 객체.
 * @returns {Promise<NextResponse>} 생성된 스터디 노트 객체 또는 에러 메시지를 포함하는 응답.
 */
export async function POST(req: NextRequest) {
  try {
    // 1. 요청 헤더에서 인증 토큰을 추출하고 유효성을 검사합니다.
    const auth = requireAuth(req);
    if (!auth.ok) return auth.res;

    // 2. React 클라이언트의 폼(StudyForm)에서 보낸 요청 본문(body)을 파싱합니다.
    const body = await req.json();
    
    // 3. 필수 입력값(title, study_order)이 있는지 유효성을 검사합니다.
    if (!body.title || body.study_order === undefined) {
      return NextResponse.json({ message: '제목과 순서는 필수입니다.' }, { status: 400 });
    }

    // 4. DynamoDB에 저장할 새로운 스터디 객체를 생성합니다.
    const newStudy = {
      user_id: auth.userId,
      study_id: uuidv4(), // [기능: 고유 ID 생성] 각 노트에 고유한 ID를 부여합니다. React 리스트의 'key' prop과 유사한 역할을 합니다.
      parent_id: body.parent_id || null,
      title: body.title,
      content: body.content || null,
      good_example: body.good_example || null,
      bad_example: body.bad_example || null,
      study_order: Number(body.study_order),
      created_at: new Date().toISOString(),
    };

    // 5. DynamoDB에 새로운 스터디 아이템을 저장하는 명령을 실행합니다.
    await docClient.send(new PutCommand({
      TableName: TABLE_NAME,
      Item: newStudy,
    }));

    // 6. 성공적으로 생성된 스터디 객체를 클라이언트에 반환합니다. (HTTP 상태 코드 201: Created)
    return NextResponse.json(newStudy, { status: 201 });

  } catch (error: any) {
    console.error('Create Study Error:', error.message || error);
    return NextResponse.json({ message: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
