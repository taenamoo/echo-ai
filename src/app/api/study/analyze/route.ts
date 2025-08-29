import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth/token';
import { GoogleGenerativeAI } from "@google/generative-ai";

const geminiApiKey = process.env.GEMINI_API_KEY || "";
const genAI = new GoogleGenerativeAI(geminiApiKey);

async function callAiModel(prompt: string): Promise<string> {
  try {
    // [수정] 최신 모델 이름으로 변경 (gemini-pro -> gemini-1.5-flash)
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash"});
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error("AI Model Call Error:", error);
    return "AI 분석 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.";
  }
}


export async function POST(req: NextRequest) {
  try {
    // --- [디버깅 로그 추가 시작] ---
    console.log("--- AI Analyze API Start ---");
    // 1. API 키가 제대로 불러와졌는지 확인
    console.log("Loaded GEMINI_API_KEY:", geminiApiKey ? `"...${geminiApiKey.slice(-4)}"` : "API Key is MISSING!");
    // --- [디버깅 로그 추가 끝] ---

    const token = req.headers.get('authorization')?.split(' ')[1];
    if (!token) return NextResponse.json({ message: '인증 토큰이 없습니다.' }, { status: 401 });

    const decoded = verifyToken(token);
    if (!decoded) return NextResponse.json({ message: '유효하지 않은 토큰입니다.' }, { status: 401 });

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
      // [디버깅 로그 추가] AI에게 보낼 프롬프트를 확인합니다.
      console.log("\n[Sending to AI - Content Analysis]:\n", contentPrompt);
      const contentSuggestion = await callAiModel(contentPrompt);
      suggestions.push(`[내용 분석]\n${contentSuggestion}`);
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
        // [디버깅 로그 추가] AI에게 보낼 프롬프트를 확인합니다.
        console.log("\n[Sending to AI - Example Analysis]:\n", examplePrompt);
        const exampleSuggestion = await callAiModel(examplePrompt);
        suggestions.push(`[예시 비교 분석]\n${exampleSuggestion}`);
    }

    if (suggestions.length === 0) {
        return NextResponse.json({ suggestion: "분석할 내용이나 예시가 부족하여 AI 추가의견을 생성할 수 없습니다." });
    }

    console.log("--- AI Analyze API End ---");
    return NextResponse.json({ suggestion: suggestions.join('\n\n---\n\n') });

  } catch (error) {
    console.error('AI Analyze API Error:', error);
    return NextResponse.json({ message: 'AI 분석 중 오류가 발생했습니다.' }, { status: 500 });
  }
}
