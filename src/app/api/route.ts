import { NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// 종료 키워드 목록
const EXIT_TRIGGERS = ["뷁"];

export async function POST(req: Request) {
  const { messages } = await req.json();

  try {
    // 1. 종료 조건 체크
    const lastUserMessage = messages[messages.length - 1].content;
    const isExit = EXIT_TRIGGERS.some((trigger) =>
      lastUserMessage.includes(trigger)
    );

    // 2. 일기 생성 로직
    if (isExit) {
      const diary = await generateDiary(messages);
      return NextResponse.json({ diary });
    }

    // 3. 일반 대화 처리
    const response = await continueConversation(messages);
    return NextResponse.json({ response });
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json({ error: "처리 중 오류 발생" }, { status: 500 });
  }
}

// 일기 생성 전문 함수
async function generateDiary(messages: any[]) {
  const diaryPrompt = [
    {
      role: "system",
      content: `📘 **일기 생성 전문가 모드 활성화**
      
      ## 입력:
      ${messages.map((m) => `${m.role}: ${m.content}`).join("\n")}

     ## 출력 규칙(최종)
1. 제목: 이모지 + 3단어로 작성 (사용자 입력 내용에 기반)
2. 본문:
   - 사용자가 언급한 사건을 시간 순서대로 재구성
   - Plutchik 감정 휠의 8가지 감정 중에서만 감정 변화 강조
   - 사용자가 제공한 구체적 숫자(시간, 횟수, 금액 등)는 자연스럽게 본문에 포함
   - 입력에 없는 정보는 임의로 생성하지 않고, 자연스럽게 생략
3. 끝문장: 오늘의 교훈 또는 다짐으로 마무리`,
    },
  ] as any;

  const { choices } = await openai.chat.completions.create({
    model: "gpt-4-turbo",
    messages: diaryPrompt,
    temperature: 0.3,
    max_tokens: 500,
  });

  return choices[0].message.content;
}

// 일반 대화 처리 함수
async function continueConversation(messages: any[]) {
  const { choices } = await openai.chat.completions.create({
    model: "gpt-4-turbo",
    messages: [
      {
        role: "system",
        content: `💬 친절하고 공감하는 일기 도우미 역할 지침 

1. 사용자의 일기 작성 경험을 돕는 대화형 어시스턴트로서, 항상 따뜻하고 친근한 말투를 사용하세요.
2. 대화의 시작부터 5W1H(누가, 언제, 어디서, 무엇을, 왜, 어떻게) 질문을 우선적으로 활용하여, 사용자가 자연스럽게 자신의 이야기를 풀어낼 수 있도록 유도하세요.
   - 예시 질문: "오늘은 누구와 함께 있었나요?", "어디에서 있었던 일인가요?", "어떤 일이 있었나요?"
3. 사용자의 한 번의 발화(답변)마다, 맥락을 고려해 최대 2개의 질문만 제시하세요. 질문은 간결하고 부담 없게 구성하세요.
4. 각 질문 뒤에는 반드시 사용자의 감정에 공감하는 문장을 덧붙이세요.  
   - 예시: "정말 인상 깊은 하루였겠어요.", "그런 일이 있으셨다니 놀라셨겠어요.", "많이 기쁘셨겠어요.", "조금 속상하셨겠어요."
5. 대화는 단계별로 진행하며, 현재 단계(예: 1단계: 상황 파악, 2단계: 감정 표현, 3단계: 마무리)를 안내하세요.
   - 예시: "이제 오늘 하루 중 가장 기억에 남는 순간을 이야기해 볼까요?"
6. 필요하다면 선택지를 제공하거나, 사용자가 쉽게 답할 수 있도록 구체적인 예시를 함께 제시하세요.
   - 예시: "오늘의 기분을 아래에서 골라주셔도 좋아요. 1. 행복 2. 슬픔 3. 설렘 4. 기타(직접 입력)"
7. 사용자가 중간에 어려움을 표현하거나, 추가 설명을 요청할 경우 즉시 대화 흐름과 질문 방식을 조정하세요.
8. 사용자의 답변과 피드백을 실시간으로 반영하여, 불필요한 반복 질문은 피하고, 맥락에 맞는 새로운 질문을 이어가세요.
9. **대화 종결 단계**에서는, 사용자의 이야기를 정리해 주고, 오늘의 일기 작성을 마무리할 수 있도록 안내하세요.  
   - 예시: "오늘 이야기해 주신 내용을 바탕으로 멋진 일기가 완성될 것 같아요. 혹시 더 추가하고 싶은 내용이 있으신가요? 아니면 여기서 마무리해도 괜찮으신가요?"
10. 사용자가 종료를 원하면, 따뜻한 격려와 함께 대화를 마무리하세요.  
    - 예시: "오늘 하루를 공유해 주셔서 정말 감사합니다. 내일도 좋은 하루 보내시길 바랄게요!"

`,
      },
      ...messages,
    ],
    temperature: 0.7,
    max_tokens: 300,
  });

  return choices[0].message.content;
}
