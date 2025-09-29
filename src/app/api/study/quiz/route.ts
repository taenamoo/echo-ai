/**
 * @file src/app/api/study/quiz/route.ts
 * @module AIQuizAPI
 * @description AI 기반 퀴즈 생성을 위한 API 라우트 핸들러입니다.
 * @overview
 * 클라이언트로부터 퀴즈 주제(`content`)와 종류(`quizType`)를 받아,
 * Google Gemini AI 모델을 호출하여 동적으로 객관식 퀴즈를 생성하고 결과를 반환합니다.
 * AWS 퀴즈의 경우, 웹 검색을 통해 실제 영어 문제를 참조하여 한국어로 번역된 문제를 생성합니다.
 */

import { NextResponse } from 'next/server';
import { GoogleGenerativeAI, SchemaType, GenerationConfig, Tool } from '@google/generative-ai';
import { config } from '@/lib/config';

const genAI = new GoogleGenerativeAI(config.geminiApiKey);

/**
 * AI 퀴즈 생성 POST 요청 핸들러
 * @param {Request} request - 클라이언트로부터 받은 요청 객체
 * @returns {NextResponse} 생성된 퀴즈 데이터 또는 에러 메시지를 담은 응답
 */
export async function POST(request: Request) {
  try {
    // --- 1. 요청 데이터 파싱 및 유효성 검사 ---
    const { quizType, content, count } = await request.json();
    const questionCount = count || 10;

    if (!content || !quizType) {
      return NextResponse.json({ error: '퀴즈 주제와 타입은 필수 항목입니다.' }, { status: 400 });
    }

    // --- 2. AI 모델 및 설정 준비 ---
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-preview-05-20" });
    
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
                question: { type: SchemaType.STRING, description: "한국어로 된 퀴즈 질문" },
                options: { type: SchemaType.ARRAY, description: "한국어로 된 4개의 선택지", items: { type: SchemaType.STRING }},
                answer: { type: SchemaType.STRING, description: "한국어로 된 정답" },
                explanation: { type: SchemaType.STRING, description: "한국어로 된 정답에 대한 간결한 해설" }
              },
              required: ["question", "options", "answer", "explanation"]
            }
          }
        },
        required: ["quiz"]
      },
    };
    
    let quizData;

    // --- 3. 퀴즈 타입에 따라 API 호출 방식 분기 ---
    if (quizType === 'AWS_CCP' || quizType === 'AWS_SAA') {
      // [수정] AWS 퀴즈는 2단계로 처리: 1. 검색 -> 2. JSON 포맷팅
      const examName = quizType === 'AWS_CCP' 
        ? 'AWS Certified Cloud Practitioner' 
        : 'AWS Certified Solutions Architect - Associate';

      // 1단계: 웹 검색을 통해 관련 정보를 텍스트로 가져오기
      const searchPrompt = `
        You are an expert ${examName} exam writer.
        Search the web for real practice questions in English for "${content}".
        Based on your search results, gather ${questionCount} distinct questions with their correct answers and explanations.
        Present the gathered information clearly in a text format. You will format this into JSON in the next step.
      `;
      const searchTools = [{ googleSearch: {} } as unknown as Tool];
      const searchResult = await model.generateContent({
          contents: [{ role: "user", parts: [{ text: searchPrompt }] }],
          tools: searchTools,
      });
      const searchedContent = searchResult.response.text();

      // 2단계: 검색된 텍스트를 기반으로 JSON 형식의 퀴즈 생성
      const formatPrompt = `
        Based on the following content, create ${questionCount} multiple-choice quiz questions in Korean.
        Each question, its 4 options, the correct answer, and the explanation must be translated naturally into Korean.
        You must only respond in the specified JSON format.

        Content to format:
        ---
        ${searchedContent}
        ---
      `;
      const formatResult = await model.generateContent({
          contents: [{ role: "user", parts: [{ text: formatPrompt }] }],
          generationConfig: generationConfig, // JSON 스키마 적용
      });
      const jsonText = formatResult.response.text();
      quizData = JSON.parse(jsonText);

    } else {
      // [기존 방식] 'REACT' 퀴즈는 웹 검색 없이 한 번에 JSON으로 생성
      const prompt = `
        당신은 React.js 전문가입니다.
        다음 내용을 기반으로 한국어로 된 객관식 퀴즈 ${questionCount}개를 생성해주세요.
        각 질문에는 4개의 선택지가 있어야 하며, 명확한 정답과 간결한 해설이 반드시 포함되어야 합니다.
        난이도는 초급에서 중급 수준으로 맞춰주세요.
        결과는 반드시 지정된 JSON 형식으로만 응답해주세요.
    
        퀴즈 주제: "${content}"
      `;
      const result = await model.generateContent({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig,
      });
      const jsonText = result.response.text();
      quizData = JSON.parse(jsonText);
    }

    // --- 4. 성공 응답 반환 ---
    return NextResponse.json(quizData);

  } catch (error) {
    console.error('API 라우트 처리 중 오류 발생:', error);
    return NextResponse.json({ error: '퀴즈 생성에 실패했습니다.' }, { status: 500 });
  }
}

