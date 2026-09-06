// ✅ myapp33/middleware.ts - CORS 전체 처리! / CORS handling for all requests

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(req: NextRequest) {

  // ✅ OPTIONS preflight 처리 / Handle OPTIONS preflight requests
  if (req.method === 'OPTIONS') {
    return new NextResponse(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Max-Age': '86400',
      },
    });
  }

  // ✅ 일반 요청에도 CORS 헤더 추가 / Add CORS headers for normal requests as well
  const res = NextResponse.next();
  res.headers.set('Access-Control-Allow-Origin', '*');
  res.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  return res;
}

export const config = {
  matcher: ['/api/:path*', '/oauth/:path*', '/.well-known/:path*', '/users/:path*'],
};