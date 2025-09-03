/**
 * @file src/app/api/study/quiz/route.ts
 * @module AIQuizAPI
 * @description AI 기반 퀴즈 생성을 위한 API 라우트 핸들러입니다.
 * @overview
 * 이 파일은 Next.js의 App Router를 사용하여 `/api/study/quiz` 경로의 POST 요청을 처리합니다.
 * 클라이언트(page.tsx, aiQuiz.tsx)로부터 퀴즈 주제와 문항 수를 받아,
 * Google Gemini AI 모델을 호출하여 동적으로 객관식 퀴즈를 생성하고 결과를 반환합니다.
 * * @see {@link https://nextjs.org/docs/app/building-your-application/routing/route-handlers | Next.js Route Handlers}
 * @see {@link https://ai.google.dev/gemini-api/docs/json-mode | Gemini API JSON Mode}
 */

import { NextResponse } from 'next/server';
import { GoogleGenerativeAI, SchemaType, GenerationConfig } from '@google/generative-ai';

// --- 환경 변수 관리 ---
// [클린 코드] 환경 변수는 한 곳에서 관리하며, 값이 없을 경우를 대비해 기본값을 설정합니다.
// process.env는 서버 사이드에서만 접근 가능하므로 API 키를 안전하게 보호할 수 있습니다.
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";

// --- Google Generative AI 클라이언트 초기화 ---
// [React 개념: 서버 사이드 렌더링(SSR) 및 API 라우트]
// Next.js의 API 라우트는 서버에서 실행되므로, 외부 API(Gemini)와의 통신을 안전하게 처리할 수 있습니다.
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

/**
 * AI 퀴즈 생성 POST 요청 핸들러
 * @param {Request} request - 클라이언트로부터 받은 요청 객체
 * @returns {NextResponse} 생성된 퀴즈 데이터 또는 에러 메시지를 담은 응답
 */
export async function POST(request: Request) {
  try {
    // --- 1. 요청 데이터 파싱 및 유효성 검사 ---
    const { content, count } = await request.json();
    const questionCount = count || 5; // count가 명시되지 않은 경우 기본 5문항으로 설정합니다.

    if (!content) {
      return NextResponse.json({ error: '퀴즈 내용을 찾을 수 없습니다.' }, { status: 400 });
    }

    // --- 2. AI 모델 응답 형식 정의 ---
    // [기능] Gemini AI에 JSON 모드를 사용하도록 요청하여, 안정적으로 구조화된 데이터를 받습니다.
    const generationConfig: GenerationConfig = {
      responseMimeType: "application/json",
      responseSchema: {
        type: SchemaType.OBJECT,
        properties: {
          quiz: {
            type: SchemaType.ARRAY,
            description: `생성된 퀴즈 질문 리스트 (${questionCount}개)`,
            items: {
              type: SchemaType.OBJECT,
              properties: {
                question: { type: SchemaType.STRING, description: "퀴즈 질문" },
                options: {
                  type: SchemaType.ARRAY,
                  description: "4개의 선택지",
                  items: { type: SchemaType.STRING }
                },
                answer: { type: SchemaType.STRING, description: "정답" },
                explanation: { type: SchemaType.STRING, description: "정답에 대한 간결한 해설" }
              },
              required: ["question", "options", "answer", "explanation"]
            }
          }
        },
        required: ["quiz"]
      },
    };

    // --- 3. AI 모델 선택 ---
    const model = genAI.getGenerativeModel({
        model: "gemini-2.5-flash-preview-05-20",
    });

    // --- 4. AI 프롬프트 동적 구성 ---
    // [기능] 클라이언트에서 받은 `content`와 `questionCount`를 기반으로 AI에게 전달할 프롬프트를 동적으로 생성합니다.
    const prompt = `
      당신은 React.js 전문가입니다. 다음 내용을 기반으로 객관식 퀴즈 ${questionCount}개를 생성해주세요.
      각 질문에는 4개의 선택지가 있어야 하며, 명확한 정답과 간단한 해설이 반드시 포함되어야 합니다.
      결과는 JSON 형식으로만 응답해주세요.

      퀴즈 내용: "${content}"
    `;

    // --- 5. AI 모델 호출 및 결과 처리 ---
    // [클린 코드] 비동기 작업은 try-catch 블록으로 감싸 예외 상황을 안정적으로 처리합니다.
    const result = await model.generateContent({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig,
    });
    
    const response = result.response;
    const jsonText = response.text();
    const quizData = JSON.parse(jsonText);

    // --- 6. 성공 응답 반환 ---
    return NextResponse.json(quizData);

  } catch (error) {
    // [클린 코드] 에러 발생 시 콘솔에 상세 로그를 남겨 디버깅을 용이하게 하고,
    // 클라이언트에는 일반적인 에러 메시지를 반환하여 시스템 내부 정보를 노출하지 않습니다.
    console.error('API 라우트 처리 중 오류 발생:', error);
    return NextResponse.json({ error: '퀴즈 생성에 실패했습니다.' }, { status: 500 });
  }
}

