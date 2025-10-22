// app/api/chat/threads/[threadId]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { store } from '@/lib/store';

export async function GET(
  request: NextRequest,
  { params }: { params: { threadId: string } }
) {
  const thread = store.getThread(params.threadId);
  
  if (!thread) {
    return NextResponse.json(
      { error: 'Thread not found' },
      { status: 404 }
    );
  }

  return NextResponse.json(thread);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { threadId: string } }
) {
  const deleted = store.deleteThread(params.threadId);
  
  if (!deleted) {
    return NextResponse.json(
      { error: 'Thread not found' },
      { status: 404 }
    );
  }

  return new NextResponse(null, { status: 204 });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { threadId: string } }
) {
  try {
    const body = await request.json();
    const { status } = body;

    if (!status || !['active', 'archived'].includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status' },
        { status: 400 }
      );
    }

    const updated = store.updateThreadStatus(params.threadId, status);
    
    if (!updated) {
      return NextResponse.json(
        { error: 'Thread not found' },
        { status: 404 }
      );
    }

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to update thread' },
      { status: 400 }
    );
  }
}