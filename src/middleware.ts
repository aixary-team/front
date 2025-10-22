// src/middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // ⭐️⭐️⭐️ 터미널에 이 로그가 찍히는지 확인 ⭐️⭐️⭐️
  console.log(`✅ [Middleware] ${request.method} ${request.url}`);

  // Preflight (OPTIONS) 요청인지 확인
  if (request.method === 'OPTIONS') {
    console.log('✅ [Middleware] OPTIONS 요청 처리');
    
    // 단순하게 200 OK와 헤더만 반환
    const response = new NextResponse(null, { status: 200 });
    
    response.headers.set(
      'Access-Control-Allow-Origin',
      request.headers.get('origin') || '*' // 요청한 origin 그대로 허용
    );
    response.headers.set('Access-Control-Allow-Credentials', 'true');
    response.headers.set(
      'Access-Control-Allow-Methods',
      'GET, POST, PUT, PATCH, DELETE, OPTIONS'
    );
    response.headers.set(
      'Access-Control-Allow-Headers',
      'Content-Type, Authorization, X-Requested-With'
    );
    
    return response;
  }

  // Preflight가 아닌 경우, 다음 로직(API 라우트)으로 넘김
  return NextResponse.next();
}

// 이 미들웨어를 실행할 경로
export const config = {
  // ⭐️ /api/ 로 시작하는 모든 경로
  matcher: '/api/:path*',
};