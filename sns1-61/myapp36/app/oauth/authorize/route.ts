// app/oauth/authorize/route.ts - ✅ myapp33-3 - 로그인 승인 페이지! / Login Authorization Page!
import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { randomUUID } from 'crypto';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const clientId = url.searchParams.get('client_id') || '';
  const redirectUri = url.searchParams.get('redirect_uri') || '';
  const scope = url.searchParams.get('scope') || 'read write follow';
  const responseType = url.searchParams.get('response_type') || 'code';

  // - 앱 정보 가져오기 / Get app info
  let clientName = 'Unknown App';
  try {
    const app = db.prepare('SELECT client_name FROM oauth_apps WHERE client_id = ?').get(clientId) as any;
    if (app) clientName = app.client_name;
  } catch {}

  // - 간단한 승인 페이지 HTML / Simple authorization page HTML
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
      <h2>🔐 ${clientName} 승인 / Authorize</h2>
      <div class="info">
        <strong>${clientName}</strong>이(가) 다음 권한을 요청합니다 <br> 
         <strong>${clientName}</strong>이is requesting the following permissions.:<br>
        <code>${scope}</code>
      </div>
      <p>계정: <strong>user1@aloy-horizon.duckdns.org</strong></p>
      <form method="POST" action="/oauth/authorize">
        <input type="hidden" name="client_id" value="${clientId}">
        <input type="hidden" name="redirect_uri" value="${redirectUri}">
        <input type="hidden" name="scope" value="${scope}">
        <button type="submit">✅ 승인하기 / Confirm (Authorize)</button>
      </form>
      <p style="font-size:12px; color:#888; margin-top:15px;">myapp33 - OAuth authorize</p>
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
  const redirectUri = (formData.get('redirect_uri') as string) || 'urn:ietf:wg:oauth:2.0:oob'; //  기본값 / Default to oob if not provided
  const scope = formData.get('scope') as string || 'read write follow';

  // - code 발급 / Issue code
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
    `).run(code, clientId, redirectUri, scope, 'user1', Date.now());

    console.log(`✅ OAuth Code 발급 / OAuth Code issued: ${code} for ${clientId}`);
  } catch (e) {
    console.error('oauth_codes 저장 에러 / Error saving oauth_codes:', e);
  }

  // - oob면 코드 화면에 표시! (가장 안전!) / If oob, display code on screen! (safest!)
  if (!redirectUri || redirectUri === 'urn:ietf:wg:oauth:2.0:oob' || redirectUri.includes('oob')) {
    const html = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"><title>Authorized</title></head>
    <body style="font-family:sans-serif; max-width:500px; margin:50px auto; padding:20px; text-align:center;">
      <h2>✅ 승인됨 / Authorized!</h2>
      <p>이 코드를 Pinafore에 붙여넣으세요 / Please paste this code into Pinafore:</p>
      <code style="font-size:20px; background:#f0f0f0; padding:15px; display:block; border-radius:8px; word-break:break-all;">${code}</code>
    </body></html>
    `;
    return new NextResponse(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
  }

  // - 일반 redirect  / Normal redirect
  try {
    const redirectUrl = new URL(redirectUri);
    redirectUrl.searchParams.set('code', code);
    return NextResponse.redirect(redirectUrl.toString());
  } catch (e) {
    console.error('redirectUri invalid:', redirectUri, e);

    // redirect 실패해도 oob처럼 코드 보여주기 / Even if redirect fails, show code like oob
    const html = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"><title>Authorized</title></head>
    <body style="font-family:sans-serif; max-width:500px; margin:50px auto; padding:20px; text-align:center;">
      <h2>✅ 승인됨 / Authorized!</h2>
      <p>코드: <code style="font-size:20px; background:#f0f0f0; padding:15px; display:block;">${code}</code></p>
    </body></html>
    `;
    return new NextResponse(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
  }
}