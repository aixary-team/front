// app/api/diaries/[diaryId]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { store } from '@/lib/store';

export async function GET(
  request: NextRequest,
  { params }: { params: { diaryId: string } }
) {
  const diary = store.getDiary(params.diaryId);
  
  if (!diary) {
    return NextResponse.json(
      { error: 'Diary not found' },
      { status: 404 }
    );
  }

  return NextResponse.json(diary);
}