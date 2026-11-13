// ✅ myapp40 - app/api/auth/me/route.ts - auto refresh 

import { NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import db from '@/lib/db';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET!;

// ✅ 쿠키 파싱 헬퍼 - token= 이 refresh_token 안에 있는 걸 피하기!
// Cookie Parsing Helper – Avoid matching `token=` inside the `refresh_token`!
function getCookieValue(cookieStr: string, name: string) {
  const match = cookieStr.match(new RegExp('(?:^|;\\s*)' + name + '=([^;]+)'));
  return match? decodeURIComponent(match[1]) : null;
}


export async function GET(req: Request) {
  const cookie = req.headers.get('cookie') || '';

  const token = getCookieValue(cookie, 'token');
  const refreshToken = getCookieValue(cookie, 'refresh_token');

  // 1. access_token 있으면 JWT 검증
  // If an access_token exists, verify the JWT!
  if (token) {
    try {
      const decoded = verifyToken(token) as any;
      if (decoded?.username) {
        console.log(`✅ Token 유효 - ${decoded.username}`);
        return NextResponse.json({ ok: true, username: decoded.username });
      } else {
        console.log(`❌ decoded.username 없음! decoded:`, decoded);
      }
    } catch (e: any) {
      console.log(`🔄 Token 만료/Expiration! ${e.message}`);
    }
    console.log(`🔄 Token 만료/expiration! refresh 시도/Attempting a refresh`);
  }

  // 2. refresh_token없으면 리턴
  // Return if refresh_token is missing.
  if (!refreshToken) {
    console.log(`❌ app/auth/me: refresh_token 없음 / no refresh_token available.`);
    return NextResponse.json({ error: 'Not logged in' }, { status: 401 });
  }

  // 3. refresh_token으로 access token재발급
  // Reissue access token using refresh token
  try {
    // 세션 만료일이 현재 시간 보다 미래인 것 / The session expiration date is in the future relative to the current time.
    const session = db.prepare(
      `SELECT * FROM sessions WHERE refresh_token =? AND expires_at > datetime('now')`
    ).get(refreshToken) as any;

    if (!session) {
      console.log(`❌ app/auth/me: refresh_token expiration`);
      return NextResponse.json({ error: 'Not logged in' }, { status: 401 });
    }

    console.log(`✅ app/auth/me: refresh success - ${session.username}`);

    // 엑세스 토큰을 JWT_SCECRET으로 사인 / Sign the access token with JWT_SCECRET
    /**
      * access 
      jwt.sign({ username, type: 'access' }, SECRET, { expiresIn: '15m' });

      * refresh
      jwt.sign({ username, type: 'refresh' }, SECRET, { expiresIn: '7d' });
     **/
    const newToken = jwt.sign({ username: session.username, type: 'access' }, JWT_SECRET, { expiresIn: '15m' });

    db.prepare(`UPDATE sessions SET access_token =?, last_used_at = CURRENT_TIMESTAMP WHERE refresh_token =?`)
     .run(newToken, refreshToken);

    const res = NextResponse.json({ ok: true, username: session.username });
    res.cookies.set('token', newToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 15
    });

    return res;
  } catch (err) {
    console.error('me 에러/me error', err);
    return NextResponse.json({ error: 'Not logged in' }, { status: 401 });
  }
}