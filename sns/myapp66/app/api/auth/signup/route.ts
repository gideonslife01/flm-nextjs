// app/api/auth/signup/route.ts

import { NextResponse } from 'next/server';
import { hashPassword, createUser, getUser, getUserByEmail } from '@/lib/auth';


export async function POST(req: Request) {
  try {
    const { username, email, password, display_name } = await req.json();

    if (!username || !email || !password) {
      // error : No required input values
      return NextResponse.json({ error: '필수 입력값 없음/No required input' }, { status: 400 });
    }

    if (username.length < 3 || !/^[a-zA-Z0-9_]+$/.test(username)) {
      // error : Usernames must be at least 3 characters long and consist only of English letters and numbers.
      return NextResponse.json({ error: 'username은 3자 이상 영문, 숫자만/Usernames must be at least 3 characters long and consist only of English letters and numbers.' }, { status: 400 });
    }

    if (password.length < 6) {
      // error : Password must be at least 6 characters long
      return NextResponse.json({ error: '비밀번호 6자 이상/Password must be at least 6 characters long' }, { status: 400 });
    }

    // username 중복 체크 / Duplicate username check
    if (await getUser(username)) {
      return NextResponse.json({ error: '이미 존재하는 username/User already exists' }, { status: 409 });
    }
    
    // email 중복 체크 / Duplicate email check
    if (await getUserByEmail(email)) {
      return NextResponse.json({ error: '이미 존재하는 email!/Email already exists' }, { status: 409 });
    }

    const passwordHash = await hashPassword(password);
    await createUser(username, email, passwordHash, display_name || username);

    console.log(`✅ 회원가입/join the membership: ${username} / ${email}`);

    return NextResponse.json({ ok: true, username }, { status: 201 });
  } catch (e) {
    console.error('signup 에러 / signup error', e);
    return NextResponse.json({ error: '서버 에러 / server error' }, { status: 500 });
  }
}