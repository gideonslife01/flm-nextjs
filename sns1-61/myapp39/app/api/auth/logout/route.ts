// ✅ myapp39 - app/api/auth/logout/route.ts
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const url = new URL(req.url);
  const res = NextResponse.json({ ok: true });

  // 쿠키! 삭제!
  res.cookies.set('token', '', {
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 0,
    path: '/'
  });

  console.log('✅ 로그아웃/Log out');
  return res;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const res = NextResponse.redirect(new URL('/auth/login', url.origin).toString());

  res.cookies.set('token', '', {
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 0,
    path: '/'
  });

  return res;
}