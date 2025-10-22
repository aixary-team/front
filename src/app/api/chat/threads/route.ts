// app/api/chat/threads/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { store } from '@/lib/store';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const status = (searchParams.get('status') || 'active') as 'active' | 'archived';
  const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);
  const cursor = searchParams.get('cursor') || undefined;

  try {
    const result = store.listThreads(status, limit, cursor);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to list threads' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title } = body;

    const thread = store.createThread(title);
    return NextResponse.json(thread);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to create thread' },
      { status: 500 }
    );
  }
}