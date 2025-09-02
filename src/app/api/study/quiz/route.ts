import { NextResponse } from 'next/server';
import { GoogleGenerativeAI, SchemaType, GenerationConfig } from '@google/generative-ai';

// Google Generative AI 클라이언트를 초기화합니다.
// API 키는 환경 변수에서 안전하게 불러옵니다.
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export async function POST(request: Request) {
  try {
    // 요청 본문에서 퀴즈 생성에 필요한 내용과 문항 수를 추출합니다.
    const { content, count } = await request.json();
    const questionCount = count || 5; // count가 없으면 기본 5문항으로 설정합니다.

    if (!content) {
      return NextResponse.json({ error: '퀴즈 내용을 찾을 수 없습니다.' }, { status: 400 });
    }

    // AI에게 JSON 형식의 응답을 요청하기 위한 설정 (타입 명시)
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

    // AI 모델을 선택합니다.
    const model = genAI.getGenerativeModel({
        model: "gemini-2.5-flash-preview-05-20",
    });

    // AI에게 전달할 프롬프트를 동적으로 구성합니다.
    const prompt = `
      당신은 React.js 전문가입니다. 다음 내용을 기반으로 객관식 퀴즈 ${questionCount}개를 생성해주세요.
      각 질문에는 4개의 선택지가 있어야 하며, 명확한 정답과 간단한 해설이 반드시 포함되어야 합니다.
      결과는 JSON 형식으로만 응답해주세요.

      퀴즈 내용: "${content}"
    `;

    // AI 모델에 퀴즈 생성을 요청합니다.
    const result = await model.generateContent({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig,
    });
    
    const response = result.response;
    const jsonText = response.text();
    const quizData = JSON.parse(jsonText);

    // 생성된 퀴즈 데이터를 클라이언트에 반환합니다.
    return NextResponse.json(quizData);

  } catch (error) {
    console.error('API 라우트 처리 중 오류 발생:', error);
    return NextResponse.json({ error: '퀴즈 생성에 실패했습니다.' }, { status: 500 });
  }
}

