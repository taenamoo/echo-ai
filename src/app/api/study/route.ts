import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { verifyToken } from '@/lib/auth/token';
import docClient, { STUDY_TABLE_NAME } from '@/lib/aws/dynamodb'; // 수정된 부분
import { PutCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';

const TABLE_NAME = STUDY_TABLE_NAME; // [수정] STUDY_TABLE_NAME 사용

// 계층 구조를 위한 타입 정의
interface StudyNode {
  study_id: string;
  parent_id: string | null;
  children: StudyNode[];
  [key: string]: any; // 다른 모든 속성을 포함
}

// GET: 사용자의 모든 스터디 노트를 계층 구조로 가져옵니다.
export async function GET(req: NextRequest) {
  try {
    const token = req.headers.get('authorization')?.split(' ')[1];
    if (!token) return NextResponse.json({ message: '인증 토큰이 없습니다.' }, { status: 401 });
    
    const decoded = verifyToken(token);
    if (!decoded || !decoded.userId) return NextResponse.json({ message: '유효하지 않은 토큰입니다.' }, { status: 401 });

    const queryCommand = new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: 'user_id = :userId',
      ExpressionAttributeValues: { ':userId': decoded.userId },
    });

    const { Items } = await docClient.send(queryCommand);
    
    const studies = (Items || []).filter(item => typeof item.study_id === 'string');
    const studyMap = new Map<string, StudyNode>();

    studies.forEach(item => {
      const node: StudyNode = {
        study_id: item.study_id,
        parent_id: item.parent_id || null,
        children: [],
        ...item,
      };
      studyMap.set(item.study_id, node);
    });

    const hierarchicalStudies: StudyNode[] = [];

    studies.forEach(study => {
      if (study.parent_id && studyMap.has(study.parent_id)) {
        const parentNode = studyMap.get(study.parent_id);
        const childNode = studyMap.get(study.study_id);
        
        if (parentNode && childNode) {
          parentNode.children.push(childNode);
        }
      } else {
        const rootNode = studyMap.get(study.study_id);
        if (rootNode) {
          hierarchicalStudies.push(rootNode);
        }
      }
    });

    return NextResponse.json(hierarchicalStudies);

  } catch (error: any) {
    console.error('Get Studies Error:', error.message || error);
    return NextResponse.json({ message: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}

// POST: 새로운 스터디 노트를 생성합니다.
export async function POST(req: NextRequest) {
  try {
    const token = req.headers.get('authorization')?.split(' ')[1];
    if (!token) return NextResponse.json({ message: '인증 토큰이 없습니다.' }, { status: 401 });

    const decoded = verifyToken(token);
    if (!decoded || !decoded.userId) return NextResponse.json({ message: '유효하지 않은 토큰입니다.' }, { status: 401 });

    const body = await req.json();
    if (!body.title || body.study_order === undefined) {
      return NextResponse.json({ message: '제목과 순서는 필수입니다.' }, { status: 400 });
    }

    const newStudy = {
      user_id: decoded.userId,
      study_id: uuidv4(),
      parent_id: body.parent_id || null,
      title: body.title,
      content: body.content || null,
      good_example: body.good_example || null,
      bad_example: body.bad_example || null,
      study_order: Number(body.study_order),
      created_at: new Date().toISOString(),
    };

    await docClient.send(new PutCommand({
      TableName: TABLE_NAME,
      Item: newStudy,
    }));

    return NextResponse.json(newStudy, { status: 201 });

  } catch (error: any) {
    console.error('Create Study Error:', error.message || error);
    return NextResponse.json({ message: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
