// app/api/diaries/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { openai, CHAT_MODEL } from '@/lib/openai';
import { store } from '@/lib/store';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const threadId = searchParams.get('threadId');
  const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);
  const cursor = searchParams.get('cursor') || undefined;

  if (!threadId) {
    return NextResponse.json(
      { error: 'threadId is required' },
      { status: 400 }
    );
  }

  try {
    const result = store.listDiaries(threadId, limit, cursor);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to list diaries' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { threadId, title, mood } = body;

    if (!threadId) {
      return NextResponse.json(
        { error: 'threadId is required' },
        { status: 400 }
      );
    }

    const thread = store.getThread(threadId);
    if (!thread) {
      return NextResponse.json(
        { error: 'Thread not found' },
        { status: 404 }
      );
    }

    // Get all messages in thread
    const messagesResult = store.listMessages(threadId, 100);
    const messages = messagesResult.items;

    if (messages.length === 0) {
      return NextResponse.json(
        { error: 'No messages in thread' },
        { status: 400 }
      );
    }

    // Generate diary using OpenAI
    const conversationText = messages
      .map(msg => `${msg.role}: ${msg.content}`)
      .join('\n\n');

    const diaryPrompt = `
    당신은 감정 분석 전문가이자 일기 작성 도우미입니다.

                사용자와 AI의 대화 내역을 분석하여 다음을 수행하세요:
                1. 대화 속 사용자의 감정 상태와 심리 상태를 파악
                2. 주요 사건, 생각, 감정을 추출
                3. 사용자의 관점에서 1인칭 독백 형태의 일기로 재구성

                일기 작성 규칙:
                - 1인칭 시점 ("나는", "내가") 사용
                - 사용자의 감정을 섬세하게 표현
                - 대화의 맥락과 뉘앙스 보존
                - 자연스럽고 진솔한 톤 유지
                - 2-3문단으로 구성

    다음은 사용자와의 대화 내용입니다. 이를 바탕으로 일기를 작성해주세요.

대화 내용:
${conversationText}

다음 형식으로 JSON을 생성해주세요:
{
  "content": "일기 본문 (대화의 핵심 내용을 정리한 일기 형태의 글)",
  "summary": "요약 (한 문장으로 오늘의 핵심을 요약)"
}`;

    const completion = await openai.chat.completions.create({
      model: CHAT_MODEL,
      messages: [{ role: 'user', content: diaryPrompt }],
      response_format: { type: 'json_object' },
    });

    const result = JSON.parse(completion.choices[0].message.content || '{}');
    
    const diary = store.createDiary(
      threadId,
      title || `일기 ${new Date().toLocaleDateString('ko-KR')}`,
      mood || 'neutral',
      result.content || '',
      result.summary || ''
    );

    if (!diary) {
      return NextResponse.json(
        { error: 'Failed to create diary' },
        { status: 500 }
      );
    }

    return NextResponse.json(diary);
  } catch (error) {
    console.error('Diary creation error:', error);
    return NextResponse.json(
      { error: 'Failed to create diary' },
      { status: 500 }
    );
  }
}


