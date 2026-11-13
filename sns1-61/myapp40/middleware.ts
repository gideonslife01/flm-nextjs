// ✅ myapp40/middleware.ts - CORS + 로그인 체크 / CORS + Login Check

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(req: NextRequest) {
  const origin = req.headers.get('origin') || '';
  const path = req.nextUrl.pathname;
  const DOMAIN = process.env.DOMAIN;

  // ✅ 허용할 origin 목록 / List of allowed origins
  const allowedOrigins = [
    `https://${DOMAIN}`,
    `https://pinafore.social`,
    `http://localhost:3000`,
    `http://localhost:3001`
  ];
  const isAllowedOrigin = allowedOrigins.includes(origin) ||!origin;

  // // ===== 1. 로그인 체크 (페이지 보호) / Login check (page protection) =====

  // const token = req.cookies.get('token')?.value;
  // const refreshToken = req.cookies.get('refresh_token')?.value;

  // 로그인이 필요한 페이지 / Page requiring login
  // const protectedPaths = ['/admin', '/settings', '/oauth/authorize'];
  // const isProtected = protectedPaths.some(p => path.startsWith(p));

  // if (isProtected &&!token &&!refreshToken) {
  //   // 토큰 없으면 로그인 페이지로 / Redirect to the login page if there is no token.
  //   const loginUrl = new URL('/auth/login', req.url);
  //   loginUrl.searchParams.set('next', path);
  //   return NextResponse.redirect(loginUrl);
  // }

  // ===== 2. OPTIONS preflight =====
  if (req.method === 'OPTIONS') {
    return new NextResponse(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': isAllowedOrigin? origin : allowedOrigins[0],
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Credentials': 'true',
        'Access-Control-Max-Age': '86400',
      },
    });
  }

  // ===== 3. 일반 요청 / general request =====
  const res = NextResponse.next();

  if (isAllowedOrigin) {
    res.headers.set('Access-Control-Allow-Origin', origin || allowedOrigins[0]);
  }
  res.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.headers.set('Access-Control-Allow-Credentials', 'true');

  return res;
}

export const config = {
  // -  /admin, /settings도 추가!해야 middleware가 실행됨
  // You must also add /admin and /settings for the middleware to execute.
  matcher: ['/api/:path*', '/oauth/:path*', '/.well-known/:path*', '/users/:path*', '/admin/:path*', '/settings/:path*'],
};