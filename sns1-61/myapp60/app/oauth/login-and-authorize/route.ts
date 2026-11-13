// app/oauth/login-and-authorize/route.ts
// ✅ myapp55 - OAuth 로그인 처리 / OAuth login processing
import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { verifyPassword, createSession } from '@/lib/auth';
import { randomUUID } from 'crypto';

export async function POST(req: Request) {
  const form = await req.formData();
  const username = form.get('username') as string;
  const password = form.get('password') as string;
  const clientId = form.get('client_id') as string;
  const redirectUri = form.get('redirect_uri') as string;
  const scope = form.get('scope') as string;
  const DOMAIN = process.env.DOMAIN || 'aloy-horizon.duckdns.org';

  // 실패시 돌아갈 URL
  const params = new URLSearchParams({ client_id: clientId, redirect_uri: redirectUri, scope, response_type: 'code' });
  const authorizeUrl = `/oauth/authorize?${params.toString()}`;
  const fullAuthorizeUrl = `https://${DOMAIN}/oauth/authorize?${params.toString()}`;

  const user = db.prepare('SELECT * FROM users WHERE username=? OR email=?').get(username, username) as any;
  
  // 유저가 없으면 로그인 실패 페이지 보여주기 / If user not found, show login failure page 
  if (!user) {
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
    <body style="font-family:sans-serif;max-width:400px;margin:50px auto;padding:20px;text-align:center">
      <h3 style="color:red">❌ 유저 없음 / No user</h3>
      <p>${username} 유저가 없습니다 / User not found</p>
      <a href="${fullAuthorizeUrl}" style="display:inline-block;margin-top:20px;padding:12px 20px;background:#6364ff;color:white;border-radius:8px;text-decoration:none">다시 시도 / Retry</a>
    </body></html>`;
    return new NextResponse(html, { status: 401, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
  }

  // 비밀번호가 틀리면 입력폼 다시 보여주기 / If password is incorrect, show the input form again
  const ok = await verifyPassword(password, user.password_hash);
  if (!ok) {
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
    <body style="font-family:sans-serif;max-width:400px;margin:50px auto;padding:20px;text-align:center">
      <h3 style="color:red">❌ 비밀번호 틀림 / Wrong password</h3>
      <p>다시 입력하세요 / Please try again</p>
      <form method="POST" action="/oauth/login-and-authorize" style="margin-top:20px">
        <input type="hidden" name="client_id" value="${clientId}">
        <input type="hidden" name="redirect_uri" value="${redirectUri}">
        <input type="hidden" name="scope" value="${scope}">
        <input name="username" value="${username}" style="width:100%;padding:12px;margin:8px 0" required>
        <input name="password" type="password" placeholder="password" style="width:100%;padding:12px;margin:8px 0" required autofocus>
        <button type="submit" style="width:100%;padding:12px;background:#6364ff;color:white;border:0;border-radius:8px">다시 로그인 / Try Again</button>
      </form>
      <p style="margin-top:15px"><a href="${fullAuthorizeUrl}">처음으로 / Back to Authorization</a></p>
    </body></html>`;
    return new NextResponse(html, { status: 401, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
  }

  // 성공 - 기존 코드 그대로 / Success - keep the existing code
  const { refreshToken, accessToken } = createSession(user.username, req.headers.get('user-agent'), 'oauth');
  const code = randomUUID();
  db.prepare(`CREATE TABLE IF NOT EXISTS oauth_codes (code TEXT PRIMARY KEY, client_id TEXT, redirect_uri TEXT, scope TEXT, username TEXT, created_at INTEGER)`).run();
  db.prepare(`INSERT INTO oauth_codes VALUES (?,?,?,?,?,?)`).run(code, clientId, redirectUri, scope, user.username, Date.now());

  const sep = redirectUri.includes('?') ? '&' : '?';
  const finalUrl = `${redirectUri}${sep}code=${code}`;

  let html: string;
  if (finalUrl.startsWith('oauth2redirect://') || finalUrl.includes('tusky') || finalUrl.includes('com.keylesspalace')) {
    html = `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
    <body style="font-family:sans-serif;max-width:500px;margin:50px auto;padding:20px;text-align:center">
      <h3>✅ ${user.username} 승인됨 / Authorized</h3>
      <p>Tusky로 돌아가는 중 / Transferring to Tusky...</p>
      <p><a href="${finalUrl}" style="word-break:break-all">${finalUrl}</a></p>
      <script>setTimeout(()=>{window.location.href="${finalUrl}"},300)</script>
    </body></html>`;
  } else {
    try {
      const u = new URL(redirectUri);
      u.searchParams.set('code', code);
      html = `<!DOCTYPE html><html><body><script>window.location.href="${u.toString()}"</script><a href="${u.toString()}">Continue</a></body></html>`;
    } catch {
      html = `<!DOCTYPE html><html><body><script>window.location.href="${finalUrl}"</script><a href="${finalUrl}">${finalUrl}</a></body></html>`;
    }
  }

  const res = new NextResponse(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
  res.cookies.set('token', accessToken, { httpOnly: true, secure: true, sameSite: 'lax', maxAge: 60*15, path: '/' });
  res.cookies.set('refresh_token', refreshToken, { httpOnly: true, secure: true, sameSite: 'lax', maxAge: 60*60*24*7, path: '/' });
  return res;
}