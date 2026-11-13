// app/oauth/authorize/route.ts - ✅ myapp39 - 실제 로그인 유저로 변경 / 

import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { randomUUID } from 'crypto';
import { verifyToken } from '@/lib/auth';

const DOMAIN = process.env.DOMAIN || 'aloy-horizon.duckdns.org';
//const DOMAIN = 'aloy-horizon.duckdns.org';
const ORIGIN = `https://${DOMAIN}`;

function getUsernameFromCookie(req: Request): string | null {
  const cookie = req.headers.get('cookie') || '';
  const m = cookie.match(/(?:^|;\s*)token=([^;]+)/);
  if (!m) return null;
  try {
    const decoded = verifyToken(decodeURIComponent(m[1]));
    return decoded?.username || null;
  } catch {
    return null;
  }
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const clientId = url.searchParams.get('client_id') || '';
  const redirectUri = url.searchParams.get('redirect_uri') || '';
  const scope = url.searchParams.get('scope') || 'read write follow';

  // ✅ myapp39 - 로그인 체크 / login check
  const username = getUsernameFromCookie(req);

  // if (!username) {
  //   // 로그인 안 됐으면! /auth/login으로!
  //   //const loginUrl = new URL('/auth/login', url.origin);
  //   const loginUrl = new URL(`https://${DOMAIN}/auth/login`);
  //   loginUrl.searchParams.set('next', req.url);
  //   return NextResponse.redirect(loginUrl.toString());
  // }

  // ✅ for CORS error
  if (!username) {
      const loginUrl = new URL('/auth/login', ORIGIN); // ✅ 도메인, not loacalhost / Domain, not localhost
      const realNextUrl = `${ORIGIN}${url.pathname}${url.search}`; // ✅ Use the domain for Next.js, not localhost.
      loginUrl.searchParams.set('next', realNextUrl);
      return NextResponse.redirect(loginUrl.toString());
  }

  // 앱 정보 / App info.
  let clientName = 'Unknown App';
  try {
    const app = db.prepare('SELECT client_name FROM oauth_apps WHERE client_id =?').get(clientId) as any;
    if (app) clientName = app.client_name;
  } catch {}

  const html = `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Authorize ${clientName}</title>
    <style>
      body { font-family: sans-serif; max-width: 500px; margin: 50px auto; padding: 20px; }
     .card { border: 1px solid #ccc; border-radius: 10px; padding: 20px; }
      button { background: #6364ff; color: white; border: none; padding: 12px 20px; border-radius: 8px; font-size: 16px; cursor: pointer; width: 100%; }
      button:hover { background: #5354ee; }
     .info { background: #f5f5ff; padding: 10px; border-radius: 5px; margin: 15px 0; }
    </style>
  </head>
  <body>
    <div class="card">
      <h2>🔐 ${clientName} 승인</h2>
      <div class="info">
        <strong>${clientName}</strong>이 다음 권한을 요청합니다:<br>
        <code>${scope}</code>
      </div>
      <p>계정: <strong>${username}@aloy-horizon.duckdns.org</strong></p>
      <form method="POST" action="/oauth/authorize">
        <input type="hidden" name="client_id" value="${clientId}">
        <input type="hidden" name="redirect_uri" value="${redirectUri}">
        <input type="hidden" name="scope" value="${scope}">
        <button type="submit">✅ 승인하기</button>
      </form>
      <p style="font-size:12px; color:#888; margin-top:15px;">myapp39 - ${username}로 로그인됨</p>
    </div>
  </body>
  </html>
  `;

  return new NextResponse(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' }
  });
}

export async function POST(req: Request) {
  const formData = await req.formData();
  const clientId = formData.get('client_id') as string;
  const redirectUri = (formData.get('redirect_uri') as string) || 'urn:ietf:wg:oauth:2.0:oob';
  const scope = (formData.get('scope') as string) || 'read write follow';

  // ✅ myapp39 - POST에서도! 실제 유저! 체크!
  const username = getUsernameFromCookie(req);
  if (!username) {
    return NextResponse.json({ error: 'Unauthorized - 먼저 /auth/login에서 로그인!' }, { status: 401 });
  }

  const code = randomUUID();

  try {
    db.prepare(`
      CREATE TABLE IF NOT EXISTS oauth_codes (
        code TEXT PRIMARY KEY,
        client_id TEXT,
        redirect_uri TEXT,
        scope TEXT,
        username TEXT,
        created_at INTEGER
      )
    `).run();

    db.prepare(`
      INSERT INTO oauth_codes (code, client_id, redirect_uri, scope, username, created_at)
      VALUES (?,?,?,?,?,?)
    `).run(code, clientId, redirectUri, scope, username, Date.now());

    console.log(`✅ OAuth Code 발급: ${code} for ${clientId} / user=${username}`);
  } catch (e) {
    console.error('oauth_codes 저장 에러:', e);
  }

  if (!redirectUri || redirectUri === 'urn:ietf:wg:oauth:2.0:oob' || redirectUri.includes('oob')) {
    const html = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"><title>Authorized</title></head>
    <body style="font-family:sans-serif; max-width:500px; margin:50px auto; padding:20px; text-align:center;">
      <h2>✅ 승인됨! ${username}</h2>
      <p>이 코드를 Pinafore에 붙여넣으세요:</p>
      <code style="font-size:20px; background:#f0f0f0; padding:15px; display:block; border-radius:8px; word-break:break-all;">${code}</code>
    </body></html>
    `;
    return new NextResponse(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
  }

  try {
    const redirectUrl = new URL(redirectUri);
    redirectUrl.searchParams.set('code', code);
    return NextResponse.redirect(redirectUrl.toString());
  } catch (e) {
    console.error('redirectUri invalid:', redirectUri, e);
    const html = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"><title>Authorized</title></head>
    <body style="font-family:sans-serif; max-width:500px; margin:50px auto; padding:20px; text-align:center;">
      <h2>✅ 승인됨! ${username}</h2>
      <p>코드: <code style="font-size:20px; background:#f0f0f0; padding:15px; display:block;">${code}</code></p>
    </body></html>
    `;
    return new NextResponse(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
  }
}