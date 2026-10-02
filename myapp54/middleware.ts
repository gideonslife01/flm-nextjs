// ✅ myapp42/middleware.ts 
// - CORS설정, 모든 앱 허용 / CORS configuration: Allow all apps

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(req: NextRequest) {
  const origin = req.headers.get('origin') || '';
  const path = req.nextUrl.pathname;
  const DOMAIN = process.env.DOMAIN;

 
  // ===== 1.CORS =====
  const isApi = path.startsWith('/api/') || path.startsWith('/oauth/') || path.startsWith('/.well-known/');

  // ✅ myapp42
  // API는 모든 웹 앱 허용! (Elk, Phanpy, Pinafore, Tusky Web, Fedilab Web 등)
  // 네이티브 앱(Tusky Android/IOS)은 Origin이 없어서!origin으로 통과
  // The API allows all web apps! (Elk, Phanpy, Pinafore, Tusky Web, Fedilab Web, etc.)
  // Native apps (Tusky Android/iOS) lack an Origin, so they pass via `!origin`
  const allowedOrigins = [
    `https://${DOMAIN}`,
    'https://pinafore.social',
    'https://elk.zone',
    'https://phanpy.social',
    'https://mastodon.social',
    'https://mastodon.online',
    'http://localhost:3000',
    'http://localhost:3001',
  ];

  // ✅ myapp42 - API면 모든 https Origin 허용
  // myapp42 - Allow all HTTPS origins for the API.
  const isAllowedOrigin = isApi
   ? true // API는 전부 허용 Mastodon 표준 / Full API access (Mastodon standard)
    : (allowedOrigins.includes(origin) ||!origin);

  // ===== 2. OPTIONS preflight =====
  if (req.method === 'OPTIONS') {
    return new NextResponse(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': origin || '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
        'Access-Control-Allow-Credentials': 'true',
        'Access-Control-Max-Age': '86400',
        'Vary': 'Origin',
      },
    });
  }

  // ===== 3. 일반 요청 / General Request =====
  const res = NextResponse.next();

  if (isAllowedOrigin) {
    // API는 요청 온 Origin 그대로 돌려주기! (credentials:true에선 * 불가)
    res.headers.set('Access-Control-Allow-Origin', origin || '*');
    res.headers.set('Vary', 'Origin');
  }
  res.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.headers.set('Access-Control-Allow-Credentials', 'true');

  return res;
}

export const config = {
  matcher: [
    '/@:username*',
    '/api/:path*',
    '/oauth/:path*',
    '/.well-known/:path*',
    '/users/:path*',
    '/usersui/:path*',
    '/admin/:path*',
    '/settings/:path*'
  ],
};