import { NextRequest, NextResponse } from 'next/server';
import { openai, CHAT_MODEL } from '@/lib/openai';
import { store } from '@/lib/store';
import { broadcast } from '@/app/api/chat/stream/route'; // 1번 파일에서 broadcast 함수 가져오기





// POST 핸들러
export async function POST(request: NextRequest) {
  try {
    const { threadId, content } = await request.json();

    if (!threadId || !content) {
      return new NextResponse(JSON.stringify({ error: 'threadId and content are required' }), {
        status: 400,
        headers: {  'Content-Type': 'application/json' },
      });
    }
    
    // (선택) 스레드 상태 확인
    const thread = store.getThread(threadId);
    if (!thread) {
       return new NextResponse(JSON.stringify({ error: 'Thread not found' }), {
        status: 404, headers: { 'Content-Type': 'application/json' }
      });
    }
    if (thread.status === 'archived') {
       return new NextResponse(JSON.stringify({ error: 'Thread is finalized' }), {
        status: 409, headers: {  'Content-Type': 'application/json' }
      });
    }


    // 1. 사용자 메시지를 DB에 저장
    const userMessage = store.createMessage(threadId, content, 'user');
    
    // 2. (선택) 사용자 메시지를 모든 클라이언트에게 즉시 방송
    // 프론트 `ChatSSEService`의 `broadcast`와 다름!
    // const userMessageData = `data: ${JSON.stringify(userMessage)}\n\n`;
    // broadcast(threadId, userMessageData);

  const messagesResult = store.listMessages(threadId, 100);

// (추가) 시스템 프롬프트 정의
const systemMessage = {
  role: 'system',
  content: `
                당신은 공감 능력이 뛰어난 심리 상담 AI입니다.

                사용자의 감정과 생각을 경청하고, 따뜻하게 공감하며 대화하세요.
                - 사용자의 이야기를 판단하지 말고 그대로 수용
                - 감정을 인정하고 공감 표현
                - 필요시 부드러운 질문으로 사용자가 더 깊이 표현하도록 유도
                - 짧고 자연스러운 대화체 사용
                `
};

const historyMessages = messagesResult.items.map(msg => ({
  role: msg.role,
  content: msg.content,
}));

// (추가) 시스템 프롬프트와 대화 내역을 결합
const messages = [systemMessage, ...historyMessages];

    // 4. OpenAI 스트림 생성
    const chatStream = await openai.chat.completions.create({
      model: CHAT_MODEL,
      messages: messages as any,
      stream: true,
    });

    let fullContent = '';
    
    // 5. OpenAI 응답을 스트리밍하면서 클라이언트에게 '방송'
    for await (const chunk of chatStream) {
      const chunkContent = chunk.choices[0]?.delta?.content || '';
      if (chunkContent) {
        fullContent += chunkContent;
        // ⭐️ 중요: 청크를 JSON으로 감싸서 SSE 형식으로 방송
        const data = `data: ${JSON.stringify({ content: chunkContent })}\n\n`;
        broadcast(threadId, data);
      }
    }

    // 6. AI의 최종 응답을 DB에 저장
    if (fullContent) {
      store.createMessage(threadId, fullContent, 'assistant');
    }

    // 7. 종료 신호 방송
broadcast(threadId, 'data: [DONE]\n\n');
    // 8. POST 요청에 대한 응답 반환
    return new NextResponse(JSON.stringify({ success: true, message: fullContent }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in POST /api/chat/message:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new NextResponse(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: {'Content-Type': 'application/json' },
    });
  }
}