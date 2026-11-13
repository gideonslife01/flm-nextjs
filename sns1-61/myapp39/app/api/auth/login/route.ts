// ✅ myapp39 - app/api/auth/login/route.ts
import { NextResponse } from 'next/server';
import { getUserByEmail, getUser, verifyPassword, createToken } from '@/lib/auth';
import db from '@/lib/db';

export async function POST(req: Request) {
  try {
    const { email, password, username } = await req.json();
    const loginId = email || username;

    if (!loginId || !password) {
      return NextResponse.json({ error: '입력값 없음!' }, { status: 400 });
    }

    // email 또는 username으로 찾기!
    let user = getUserByEmail(loginId);
    if (!user) user = getUser(loginId);

    if (!user) {
      return NextResponse.json({ error: '유저 없음!' }, { status: 404 });
    }

    const ok = await verifyPassword(password, user.password_hash);
    if (!ok) {
      return NextResponse.json({ error: '비밀번호 틀림!' }, { status: 401 });
    }

    const token = createToken(user.username);

    // oauth_tokens에도 저장! (Pinafore 호환!)
    db.prepare(`
      INSERT OR REPLACE INTO oauth_tokens (access_token, client_id, username, scope, created_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(token, 'web', user.username, 'read write follow', Math.floor(Date.now()/1000));

    console.log(`✅ 로그인: ${user.username}`);

    const res = NextResponse.json({ 
      ok: true, 
      username: user.username, 
      token,
      display_name: user.display_name 
    });

    // 쿠키!에! 저장! (웹 UI용!)
    res.cookies.set('token', token, {
      httpOnly: false, // JS에서 읽어야 하니까!
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60*60*24*7,
      path: '/'
    });

    return res;
  } catch (e) {
    console.error('login 에러', e);
    return NextResponse.json({ error: '서버 에러!' }, { status: 500 });
  }
}