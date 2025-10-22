// app/api/chat/stream/route.ts
import { NextRequest } from 'next/server';



// -----------------------------------------------------------------
// Pub/Sub 리스너 관리 (개발용 인메모리)
// -----------------------------------------------------------------
type Listener = (data: string) => void;
const listeners = new Map<string, Set<Listener>>();

export function broadcast(threadId: string, dataString: string) {
  const threadListeners = listeners.get(threadId);
  if (threadListeners) {
    threadListeners.forEach((listener) => {
      try {
        listener(dataString);
      } catch (e) {
        console.error('Failed to send message to a listener:', e);
      }
    });
  }
}
// -----------------------------------------------------------------


export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const threadId = searchParams.get('threadId');

  if (!threadId) {
    return new Response(JSON.stringify({ error: 'threadId is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const encoder = new TextEncoder();
  let send: Listener;

  const stream = new ReadableStream({
    start(controller) {
      // 메시지 전송 함수
      send = (dataString: string) => {
        controller.enqueue(encoder.encode(dataString));
      };

      // 구독자 리스트에 추가
      if (!listeners.has(threadId)) {
        listeners.set(threadId, new Set());
      }
      listeners.get(threadId)!.add(send);
      console.log(`Client connected to ${threadId}. Total listeners: ${listeners.get(threadId)!.size}`);
    },
    cancel() {
      // 클라이언트 연결 종료 시 구독자 리스트에서 제거
      if (threadId && send) {
        const threadListeners = listeners.get(threadId);
        if (threadListeners) {
          threadListeners.delete(send);
          if (threadListeners.size === 0) {
            listeners.delete(threadId);
          }
          console.log(`Client disconnected from ${threadId}. Remaining listeners: ${threadListeners.size}`);
        }
      }
    },
  });

  return new Response(stream, {
    headers: {
      
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}