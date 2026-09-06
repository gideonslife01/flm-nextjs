// app/oauth/token/route.ts - ✅ myapp33-4 - 토큰 발급 / Token issuance
import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { randomUUID } from 'crypto';

export async function POST(req: Request) {
  try {
    const body = await req.text();
    const params = new URLSearchParams(body);
    
    const clientId = params.get('client_id') || '';
    const clientSecret = params.get('client_secret') || '';
    const code = params.get('code') || '';
    const grantType = params.get('grant_type') || 'authorization_code';
    const redirectUri = params.get('redirect_uri') || '';

    console.log(`🔑 Token 요청 / Requesting token for code=${code}, client_id=${clientId}`);

    // ✅ code 검증 / Validate code
    let oauthCode: any;
    try {
      oauthCode = db.prepare('SELECT * FROM oauth_codes WHERE code = ?').get(code) as any;
    } catch {}

    if (!oauthCode) {
      return NextResponse.json({ error: 'invalid_grant', error_description: 'Code not found' }, { status: 400 });
    }

    // ✅ 앱 검증 / Validate app
    let app: any;
    try {
      app = db.prepare('SELECT * FROM oauth_apps WHERE client_id = ?').get(clientId) as any;
    } catch {}

    if (!app || app.client_secret !== clientSecret) {
      return NextResponse.json({ error: 'invalid_client' }, { status: 400 });
    }

    // ✅ access_token 발급 / Issue access_token
    const accessToken = randomUUID() + randomUUID();

    try {
      db.prepare(`
        CREATE TABLE IF NOT EXISTS oauth_tokens (
          access_token TEXT PRIMARY KEY,
          client_id TEXT,
          username TEXT,
          scope TEXT,
          created_at INTEGER
        )
      `).run();

      db.prepare(`
        INSERT INTO oauth_tokens (access_token, client_id, username, scope, created_at)
        VALUES (?,?,?,?,?)
      `).run(accessToken, clientId, oauthCode.username, oauthCode.scope, Date.now());

      // ✅ code는 한번 쓰면 삭제 (재사용 방지) / The code should be deleted after one use! (Prevent reuse!)
      db.prepare('DELETE FROM oauth_codes WHERE code = ?').run(code);
      
      console.log(`✅ Token 발급 / Token issued: ${accessToken.substring(0,8)}... for ${oauthCode.username}`);
    } catch (e) {
      console.error('token 저장 에러 / Error saving token:', e);
    }

    // ✅ Pinafore가 기대하는 응답 / Pinafore expects this response
    return NextResponse.json({
      access_token: accessToken,
      token_type: 'Bearer',
      scope: oauthCode.scope,
      created_at: Math.floor(Date.now()/1000)
    });

  } catch (e) {
    console.error('token 에러 / Error occurred while issuing token:', e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

// CORS 에러 방지용 OPTIONS 처리 / Handle OPTIONS to prevent CORS errors
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}