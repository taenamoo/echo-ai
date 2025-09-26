/**
 * @file src/app/api/study/search/route.ts
 * @module StudySearchAPI
 * @description 사용자의 스터디 노트 전체를 대상으로 AI 기반 검색을 수행하는 API 라우트 핸들러입니다.
 * @overview
 * 이 파일은 Next.js의 App Router를 기반으로 동작하는 서버 측 코드입니다.
 * React 클라이언트(AiSearchButton 컴포넌트)에서 사용자가 입력한 검색어(searchTerm)를 받아,
 * 해당 사용자의 모든 스터디 노트를 AWS DynamoDB에서 조회합니다.
 * 조회된 노트 내용을 '컨텍스트(Context)'로 구성하여 Gemini AI 모델에 전달하고,
 * AI가 생성한 답변을 다시 클라이언트로 반환하는 '검색 증강 생성(RAG)' 패턴을 구현합니다.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api/auth';
import { dynamoDbDocumentClient, STUDY_TABLE_NAME } from '@echo-ai/aws-clients';
import { QueryCommand } from '@aws-sdk/lib-dynamodb';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { getConfig } from '@echo-ai/config';

// --- AI 모델 초기화 ---
// [클린 코드] AI 모델 클라이언트를 전역 상수로 초기화하여 재사용하고, API 키는 환경 변수에서 안전하게 관리합니다.
const { geminiApiKey } = getConfig();
const genAI = new GoogleGenerativeAI(geminiApiKey);

/**
 * @function callAiSearchModel
 * @description Gemini AI 모델을 호출하여 사용자의 질문에 대한 답변을 생성하는 헬퍼 함수입니다.
 * @param {string} context - 사용자의 모든 스터디 노트 내용을 하나로 합친 문자열.
 * @param {string} query - 사용자가 입력한 검색어 또는 질문.
 * @returns {Promise<string>} AI가 생성한 답변 문자열.
 * @rationale
 * [클린 코드] AI 모델과의 통신 로직을 별도의 함수로 분리하면, 메인 핸들러(POST)의 코드가 간결해지고
 * 책임(Authentication, Data Fetching, AI Call)이 명확하게 나뉘어 유지보수성이 향상됩니다.
 */
async function callAiSearchModel(context: string, query: string): Promise<string> {
  try {
    // [기능: AI 모델 선택]
    // "gemini-1.5-flash" 모델은 빠른 응답 속도와 우수한 성능을 균형 있게 제공하여 대화형 검색 기능에 적합합니다.
    const model = genAI.getGenerativeModel({ model: process.env.SUMMARIZE_MODEL ?? "gemini-1.5-flash" });
    const hasContent = context && context.trim() !== '';

    // [기능: 프롬프트 엔지니어링 (Prompt Engineering)]
    // AI가 최상의 결과를 생성하도록 명확하고 구조화된 지침(프롬프트)을 설계합니다.
    // '역할 부여', '컨텍스트 제공(RAG)', '질문 전달', '출력 형식 지정' 등의 기법을 사용합니다.
    const prompt = `
      당신은 매우 유능한 AI 검색 어시스턴트입니다.
      아래에 주어진 [스터디 노트 데이터]와 사용자의 [질문]을 참고하여 지침에 따라 답변을 생성해주세요.

      [스터디 노트 데이터]
      ${hasContent ? context : "제공된 스터디 노트 데이터가 없습니다."}

      [질문]
      ${query}

      ---

      ### 지침:
      1.  **내용 분석:** 먼저 [스터디 노트 데이터]에서 [질문]과 가장 관련성이 높은 내용을 찾습니다.
      2.  **답변 생성:**
          * **관련 내용을 찾았을 경우:**
              -   "### 스터디 노트에서 찾은 내용" 제목 아래에, 관련 노트의 제목과 핵심 내용을 요약해서 설명해주세요.
              -   그 다음, "---" 구분선을 넣고 "### AI 추가 의견" 제목 아래에, 찾은 내용과 관련하여 React 초보 개발자에게 도움이 될 만한 추가적인 설명이나 팁을 제공해주세요.
          * **관련 내용을 찾지 못했을 경우:**
              -   "스터디 노트에서 관련된 내용을 찾을 수 없습니다." 라고 명확하게 답변해주세요.
              -   그 다음, "---" 구분선을 넣고 "### AI 추가 의견" 제목 아래에, 사용자의 [질문]에 대해 일반적인 웹 지식을 바탕으로 설명해주세요.

      -   답변은 반드시 한국어로, 친절하고 명확한 어조로, Markdown을 사용하여 보기 좋게 작성해주세요.
    `;
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error("AI Search Model Call Error:", error);
    return "AI 검색 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.";
  }
}

/**
 * @function POST
 * @description POST /api/study/search
 * 사용자의 검색 요청을 받아 AI를 통해 답변을 생성하고 반환합니다.
 * @param {NextRequest} req - 클라이언트로부터의 요청 객체.
 * @returns {Promise<NextResponse>} AI가 생성한 검색 결과 또는 에러 메시지를 포함하는 응답.
 */
export async function POST(req: NextRequest) {
  try {
    // 1. [인증] 요청 헤더에서 인증 토큰을 추출하고 유효성을 검사합니다.
    const auth = requireAuth(req);
    if (!auth.ok) return auth.res;

    // 2. [요청 파싱] 클라이언트에서 보낸 검색어(searchTerm)를 추출합니다.
    const { searchTerm } = await req.json();
    if (!searchTerm) {
      return NextResponse.json({ message: '검색어가 필요합니다.' }, { status: 400 });
    }

    // 3. [데이터 조회 - RAG의 Retrieval 단계]
    //    AI에게 질문하기 전에, AI가 참고할 자료(사용자의 모든 스터디 노트)를 DB에서 가져옵니다.
    const queryCommand = new QueryCommand({
      TableName: STUDY_TABLE_NAME,
      KeyConditionExpression: 'user_id = :userId',
      ExpressionAttributeValues: { ':userId': auth.userId },
    });
    const { Items } = await dynamoDbDocumentClient.send(queryCommand);
    
    // 4. [컨텍스트 구성] 조회된 노트들을 AI가 이해하기 쉬운 텍스트 형식으로 가공합니다.
    const context = (Items || [])
      .map(item => `제목: ${item.title}\n내용: ${item.content || ''}\n좋은 예시: ${item.good_example || ''}\n나쁜 예시: ${item.bad_example || ''}`)
      .join('\n\n---\n\n');

    // 5. [AI 호출 - RAG의 Generation 단계]
    //    가공된 컨텍스트와 사용자의 질문을 AI 모델에 전달하여 최종 답변을 생성합니다.
    const searchResult = await callAiSearchModel(context, searchTerm);

    // 6. [응답] 생성된 결과를 클라이언트(React)에 반환합니다.
    return NextResponse.json({ result: searchResult });

  } catch (error) {
    console.error('AI Search API Error:', error);
    return NextResponse.json({ message: 'AI 검색 API 처리 중 오류가 발생했습니다.' }, { status: 500 });
  }
}
