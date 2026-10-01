// ✅ myapp40 - app/api/auth/login/route.ts

import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { verifyPassword, createSession } from '@/lib/auth';

const DOMAIN = process.env.DOMAIN || 'aloy-horizon.duckdns.org';
const ORIGIN = `https://${DOMAIN}`;
const IS_PROD = process.env.NODE_ENV === 'production';
console.log('현재 NODE_ENV:', process.env.NODE_ENV);

export async function POST(req: Request) {
  try {
    const { email, username, password } = await req.json();
    const loginId = email || username;

    if (!loginId ||!password) {
      return NextResponse.json({ error: '아이디와 비밀번호 필요 / ID and password required!' }, { status: 400 });
    }

    const user = db.prepare('SELECT * FROM users WHERE username =? OR email =?').get(loginId, loginId) as any;
    if (!user) {
      return NextResponse.json({ error: '유저 없음 / No users' }, { status: 401 });
    }

    const ok = await verifyPassword(password, user.password_hash);
    if (!ok) {
      return NextResponse.json({ error: '비밀번호 틀림 / Incorrect password' }, { status: 401 });
    }

    // ✅ myapp40 - sessions 테이블에 저장 / Save to the sessions table.
    const userAgent = req.headers.get('user-agent');
    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
    const { id, refreshToken, accessToken } = createSession(user.username, userAgent, ip); // save

    console.log(`✅ 로그인 / Login ${user.username} - session ${id}`);

    const res = NextResponse.json({
      ok: true,
      username: user.username,
      // accessToken은 쿠키로만 가고 JSON에는 안 줌 (httpOnly)
      // The accessToken is sent only via cookies and not included in the JSON response (httpOnly).
    });

    // ✅ Access Token - 15분 - 모든 경로에서 사용 / Use for all routes
    res.cookies.set('token', accessToken, {
      httpOnly: true, // ✅ true - JS에서 못 읽음 XSS 방어 / XSS protection: Unreadable by JS
      secure: IS_PROD, // only https
      sameSite: 'lax', // 다른 사이트에서 POST요청시 쿠키 안보냄 / Cookies are not sent during POST requests from other sites.
      maxAge: 60*15, // 15분 / 15minute
      path: '/'
    });

    // ✅ Refresh Token - 7일! - /api/auth/refresh 에서만 사용
    // Refresh Token - 7 days! - Used only at /api/auth/refresh
    res.cookies.set('refresh_token', refreshToken, {
      httpOnly: true,
      secure: IS_PROD,
      sameSite: 'lax',
      maxAge: 60*60*24*7, // 7일 / 7days
      path: '/'
    });

    return res;

  } catch (e) {
    console.error('login error', e);
    return NextResponse.json({ error: '로그인 실패/Login failed!' }, { status: 500 });
  }
}