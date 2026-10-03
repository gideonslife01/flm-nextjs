// ✅ myapp40 - app/api/auth/logout/route.ts

import { NextResponse } from 'next/server';
import { deleteSessionByRefreshToken } from '@/lib/auth';

export async function POST(req: Request) {
  const cookie = req.headers.get('cookie') || '';
  const m = cookie.match(/refresh_token=([^;]+)/);

  if (m) {
    const refreshToken = decodeURIComponent(m[1]);
    deleteSessionByRefreshToken(refreshToken);
    console.log(`👋 로그아웃! refresh_token 삭제 / Logout delete refresh token`);
  }

  // oauth_tokens도 삭제 (Pinafore 토큰)
  // Delete oauth_tokens as well (Pinafore tokens)
  const tokenMatch = cookie.match(/token=([^;]+)/);
  if (tokenMatch) {
    try {
      const db = (await import('@/lib/db')).default;
      db.prepare('DELETE FROM oauth_tokens WHERE access_token =?').run(decodeURIComponent(tokenMatch[1]));
    } catch {}
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set('token', '', { maxAge: 0, path: '/' });
  res.cookies.set('refresh_token', '', { maxAge: 0, path: '/' });
  return res;
}

export async function GET(req: Request) {
  return POST(req);
}