// app/api/chat/messages/[messageId]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { store } from '@/lib/store';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { messageId: string } }
) {
  const message = store.getMessage(params.messageId);
  
  if (!message) {
    return NextResponse.json(
      { error: 'Message not found' },
      { status: 404 }
    );
  }

  const thread = store.getThread(message.threadId);
  if (thread?.status === 'archived') {
    return NextResponse.json(
      { error: 'Thread is finalized' },
      { status: 409 }
    );
  }

  const deleted = store.deleteMessage(params.messageId);
  
  if (!deleted) {
    return NextResponse.json(
      { error: 'Failed to delete message' },
      { status: 500 }
    );
  }

  return new NextResponse(null, { status: 204 });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { messageId: string } }
) {
  try {
    const body = await request.json();
    const { content } = body;

    if (!content) {
      return NextResponse.json(
        { error: 'content is required' },
        { status: 400 }
      );
    }

    const message = store.getMessage(params.messageId);
    
    if (!message) {
      return NextResponse.json(
        { error: 'Message not found' },
        { status: 404 }
      );
    }

    const thread = store.getThread(message.threadId);
    if (thread?.status === 'archived') {
      return NextResponse.json(
        { error: 'Thread is finalized' },
        { status: 409 }
      );
    }

    const updated = store.updateMessage(params.messageId, content);
    
    if (!updated) {
      return NextResponse.json(
        { error: 'Failed to update message' },
        { status: 500 }
      );
    }

    const updatedMessage = store.getMessage(params.messageId);
    return NextResponse.json(updatedMessage);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to update message' },
      { status: 400 }
    );
  }
}