import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth/token';
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

// AI가 생성할 퀴즈 데이터의 타입을 정의합니다.
interface Quiz {
  question: string;
  options: string[];
  answer: string;
  explanation: string;
}

async function generateQuiz(context: string): Promise<Quiz[]> {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const prompt = `
      당신은 React 초보 개발자를 위한 퀴즈 출제자입니다.
      아래 주어진 [학습 내용]을 바탕으로, 객관식 퀴즈를 1개에서 5개 사이로 생성해주세요.

      - 각 퀴즈는 질문(question), 4개의 보기(options), 정답(answer), 그리고 해설(explanation)을 포함해야 합니다.
      - 정답(answer)은 4개의 보기(options) 중 하나와 정확히 일치해야 합니다.
      - 질문은 초보자가 학습 내용을 잘 이해했는지 확인할 수 있도록 핵심 개념을 다루어야 합니다.
      - 답변은 반드시 한국어로, 아래와 같은 JSON 배열 형식을 따라야 합니다.

      [출력 형식 예시]
      \`\`\`json
      [
        {
          "question": "React에서 컴포넌트의 상태를 관리하기 위해 사용되는 Hook은 무엇인가요?",
          "options": ["useState", "useEffect", "useContext", "useReducer"],
          "answer": "useState",
          "explanation": "useState는 함수형 컴포넌트에서 상태를 추가할 수 있게 해주는 Hook입니다."
        },
        {
          "question": "...",
          "options": ["...", "...", "...", "..."],
          "answer": "...",
          "explanation": "..."
        }
      ]
      \`\`\`

      [학습 내용]
      ${context}
    `;
    const result = await model.generateContent(prompt);
    const response = await result.response;
    
    // [수정] AI가 생성한 텍스트에서 JSON 부분만 더 안정적으로 추출하고 파싱합니다.
    const textResponse = response.text();
    const jsonMatch = textResponse.match(/\[\s*\{[\s\S]*?\}\s*\]/);
    if (!jsonMatch) {
        throw new Error("Valid JSON array not found in AI response.");
    }
    return JSON.parse(jsonMatch[0]);

  } catch (error) {
    console.error("AI Quiz Generation Error:", error);
    return []; // 오류 발생 시 빈 배열 반환
  }
}

export async function POST(req: NextRequest) {
  try {
    const token = req.headers.get('authorization')?.split(' ')[1];
    if (!token) return NextResponse.json({ message: '인증 토큰이 없습니다.' }, { status: 401 });

    const decoded = verifyToken(token);
    if (!decoded) return NextResponse.json({ message: '유효하지 않은 토큰입니다.' }, { status: 401 });

    const { content, good_example, bad_example } = await req.json();
    const context = `내용: ${content}\n좋은 예시: ${good_example}\n나쁜 예시: ${bad_example}`;

    const quizData = await generateQuiz(context);
    
    if (quizData.length === 0) {
        return NextResponse.json({ error: "퀴즈 생성에 실패했습니다." }, { status: 500 });
    }

    return NextResponse.json({ quiz: quizData });

  } catch (error) {
    console.error('AI Quiz API Error:', error);
    return NextResponse.json({ message: 'API 처리 중 오류가 발생했습니다.' }, { status: 500 });
  }
}
