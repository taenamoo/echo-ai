/**
 * @file src/app/api/study/analyze/route.ts
 * @module StudyAnalyzeAPI
 * @description 사용자가 입력한 스터디 노트의 내용과 코드 예시를 AI를 통해 분석하고 피드백(추가 의견)을 생성하는 API 라우트 핸들러입니다.
 * @overview
 * 이 파일은 Next.js의 App Router를 기반으로 동작하는 서버 측 코드입니다.
 * React 클라이언트(StudyForm 컴포넌트)에서 스터디 노트를 저장할 때,
 * 입력된 '내용', '좋은 예시', '나쁜 예시'를 받아 각각에 대해 Gemini AI 모델을 호출합니다.
 * AI는 코드 리뷰 멘토의 역할을 수행하도록 설계된 프롬프트를 바탕으로 각 항목에 대한 심층적인 분석과 조언을 생성하고,
 * 이를 종합하여 클라이언트에 반환합니다.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api/auth';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { config } from '@/lib/config';

const genAI = new GoogleGenerativeAI(config.geminiApiKey);

/**
 * @function callAiModel
 * @description Gemini AI 모델을 호출하여 주어진 프롬프트에 대한 텍스트를 생성하는 헬퍼 함수입니다.
 * @param {string} prompt - AI에게 전달할 구체적인 지침과 내용이 포함된 문자열.
 * @returns {Promise<string>} AI가 생성한 분석 결과 문자열.
 */
async function callAiModel(prompt: string): Promise<string> {
  try {
    // [오류 수정] 정상적으로 동작하는 quiz API와 동일한 모델("gemini-2.5-flash-preview-05-20")을 사용하도록 수정합니다.
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-preview-05-20"});
    
    // [오류 수정] generateContent 메소드에 올바른 형식의 객체를 전달하도록 수정합니다.
    const result = await model.generateContent({
        contents: [{ role: "user", parts: [{ text: prompt }] }]
    });

    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error("AI Model Call Error:", error);
    return "AI 분석 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.";
  }
}

/**
 * @function POST
 * @description POST /api/study/analyze
 * 스터디 노트의 내용을 받아 AI를 통해 분석하고 추가 의견을 생성합니다.
 * @param {NextRequest} req - 'content', 'good_example', 'bad_example'을 포함하는 요청 객체.
 * @returns {Promise<NextResponse>} AI가 생성한 분석 결과 또는 에러 메시지를 포함하는 응답.
 */
export async function POST(req: NextRequest) {
  try {
    const auth = requireAuth(req);
    if (!auth.ok) return auth.res;

    const { content, good_example, bad_example } = await req.json();
    const suggestions: string[] = [];

    if (content && content.trim() !== '') {
      const contentPrompt = `
        당신은 리액트(React) 초보 개발자를 위한 친절한 코드 리뷰 멘토입니다.
        아래 주어진 "내용"을 바탕으로, 초보자가 이해하기 쉽게 핵심을 짚어주는 추가 의견을 작성해주세요.
        - 내용의 핵심 개념을 설명해주세요.
        - 이 개념과 관련하여 초보자가 추가로 알면 좋을 팁이나 다른 개념이 있다면 알려주세요.
        - 답변은 한국어로, 친절하고 상세한 어조로 작성해주세요.

        [내용]
        ${content}
      `;
      const contentSuggestion = await callAiModel(contentPrompt);
      suggestions.push(`### 내용 분석\n${contentSuggestion}`);
    }

    if (good_example && good_example.trim() !== '' && bad_example && bad_example.trim() !== '') {
        const examplePrompt = `
          당신은 리액트(React) 초보 개발자를 위한 친절한 코드 리뷰 멘토입니다.
          아래 "좋은 예시"와 "나쁜 예시"를 비교 분석하고, 초보자가 이해하기 쉽게 설명해주세요.
          - "좋은 예시"가 왜 좋은 코드인지 설명해주세요.
          - "나쁜 예시"가 왜 문제가 될 수 있는지, 그리고 어떻게 개선할 수 있는지 설명해주세요.
          - 답변은 한국어로, 친절하고 상세한 어조로 작성해주세요.

          [좋은 예시]
          ${good_example}

          [나쁜 예시]
          ${bad_example}
        `;
        const exampleSuggestion = await callAiModel(examplePrompt);
        suggestions.push(`### 예시 비교 분석\n${exampleSuggestion}`);
    }

    if (suggestions.length === 0) {
        return NextResponse.json({ suggestion: "분석할 내용이나 예시가 부족하여 AI 추가의견을 생성할 수 없습니다." });
    }

    return NextResponse.json({ suggestion: suggestions.join('\n\n---\n\n') });

  } catch (error) {
    console.error('AI Analyze API Error:', error);
    return NextResponse.json({ message: 'AI 분석 중 오류가 발생했습니다.' }, { status: 500 });
  }
}

