import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth/token';
import docClient, { STUDY_TABLE_NAME } from '@/lib/aws/dynamodb';
import { QueryCommand } from '@aws-sdk/lib-dynamodb';
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

async function callAiSearchModel(context: string, query: string): Promise<string> {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const hasContent = context && context.trim() !== '';

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

export async function POST(req: NextRequest) {
  try {
    const token = req.headers.get('authorization')?.split(' ')[1];
    if (!token) return NextResponse.json({ message: '인증 토큰이 없습니다.' }, { status: 401 });

    const decoded = verifyToken(token);
    if (!decoded) return NextResponse.json({ message: '유효하지 않은 토큰입니다.' }, { status: 401 });

    const { searchTerm } = await req.json();
    if (!searchTerm) {
      return NextResponse.json({ message: '검색어가 필요합니다.' }, { status: 400 });
    }

    const queryCommand = new QueryCommand({
      TableName: STUDY_TABLE_NAME,
      KeyConditionExpression: 'user_id = :userId',
      ExpressionAttributeValues: { ':userId': decoded.userId },
    });
    const { Items } = await docClient.send(queryCommand);
    
    const context = (Items || [])
      .map(item => `제목: ${item.title}\n내용: ${item.content || ''}\n좋은 예시: ${item.good_example || ''}\n나쁜 예시: ${item.bad_example || ''}`)
      .join('\n\n---\n\n');

    const searchResult = await callAiSearchModel(context, searchTerm);

    return NextResponse.json({ result: searchResult });

  } catch (error) {
    console.error('AI Search API Error:', error);
    return NextResponse.json({ message: 'AI 검색 API 처리 중 오류가 발생했습니다.' }, { status: 500 });
  }
}
