// app/api/auth/refresh/route.ts
import { NextResponse } from 'next/server';
import { refreshAccessToken } from '@/lib/auth';

const IS_PROD = process.env.NODE_ENV === 'production';

export async function POST(req: Request) {
  const cookie = req.headers.get('cookie') || '';
  const m = cookie.match(/refresh_token=([^;]+)/);

  if (!m) {
    return NextResponse.json({ error: 'refresh_token 없음 / No refresh token' }, { status: 401 });
  }

  const refreshToken = decodeURIComponent(m[1]);
  const result = refreshAccessToken(refreshToken);

  if (!result) {
    const res = NextResponse.json({ error: 'refresh_token 만료 다시 로그인 / Refresh token expired; please log in again.' }, { status: 401 });
    res.cookies.set('token', '', { maxAge: 0, path: '/' });
    res.cookies.set('refresh_token', '', { maxAge: 0, path: '/' });
    return res;
  }

  console.log(`🔄 토큰 리프레시 / Token Refresh ${result.username}`);

  const res = NextResponse.json({ ok: true, username: result.username });
  res.cookies.set('token', result.accessToken, {
    httpOnly: true,
    secure: IS_PROD,
    sameSite: 'lax',
    maxAge: 60*15,
    path: '/'
  });

  return res;
}

// GET도 지원 (브라우저에서 fetch로 호출하기 쉽게)
// Also supports GET (to make it easy to call via fetch from a browser)
export async function GET(req: Request) {
  return POST(req);
}