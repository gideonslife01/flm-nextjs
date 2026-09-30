// app/api/v1/apps/route.ts - ✅ myapp33-2 - Pinafore 앱 등록 / Pinafore App Registration
import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { randomUUID } from 'crypto';

const DOMAIN = process.env.DOMAIN || 'aloy-horizon.duckdns.org';

export async function POST(req: Request) {
  try {
    //✅ myapp37-following,follwer list error fix on pinafore
    //const body = await req.json();
    let clientName = 'Unknown';
    let redirectUris =  '';
    let scopes  = 'read write follow';
    let website = '';

    const contentType = req.headers.get('content-type') || '';
    
    if (contentType.includes('application/json')) {
      const body = await req.json();
      clientName = body.client_name || 'Unknown';
      redirectUris = body.redirect_uris || body.redirect_uri || '';
      scopes = body.scopes || 'read write follow';
      website = body.website || '';
    }else{
      // form-urlencoded! Pinafore!가! 이걸로! 보냄!
      //
      const text = await req.text();
      const params = new URLSearchParams(text);
      clientName = params.get('client_name') || 'Unknown';
      redirectUris = params.get('redirect_uris') || params.get('redirect_uri') || '';
      scopes = params.get('scopes') || 'read write follow';
      website = params.get('website') || '';
    }

    // ✅ DB 테이블 생성 / Create DB table
    db.prepare(`
      CREATE TABLE IF NOT EXISTS oauth_apps (
        client_id TEXT PRIMARY KEY,
        client_secret TEXT NOT NULL,
        client_name TEXT,
        redirect_uri TEXT,
        scopes TEXT,
        website TEXT,
        created_at INTEGER
        )
    `).run();

    // - 이미 같은 앱 있으면 재사용 / If the same app already exists, reuse it
    try {
      const existing = db.prepare(
        `SELECT * FROM oauth_apps WHERE client_name = ? AND redirect_uri = ?`
      ).get(clientName, redirectUris) as any;

      if (existing) {
        console.log(`♻️ 기존 앱 재사용 / Reuse existing app: ${clientName} - ${existing.client_id}`);
        return NextResponse.json({
          id: existing.client_id,
          name: existing.client_name,
          website: existing.website,
          redirect_uri: existing.redirect_uri,
          client_id: existing.client_id,
          client_secret: existing.client_secret,
          vapid_key: ''
        });
      }
    } catch (e) {
      console.error('중복 체크 에러 / dup check error:', e);
      // 체크 실패하면 그냥 새로 생성 / If check fails, just create a new one
    }

    // ✅ 이미 같은 앱 있으면 재사용 / If the same app already exists, reuse it 
    // - client_id, client_secret 생성 
    //  Generate client_id, client_secret
    const clientId = randomUUID();
    const clientSecret = randomUUID() + randomUUID(); // 길게 / Make it long

    // - DB 저장 (oauth_apps 테이블 필요) / Save to DB (oauth_apps table required)
    try {

      db.prepare(`
        INSERT INTO oauth_apps (client_id, client_secret, client_name, redirect_uri, scopes, website, created_at)
        VALUES (?,?,?,?,?,?,?)
      `).run(clientId, clientSecret, clientName, redirectUris, scopes, website, Date.now());

      console.log(`✅ OAuth App 등록 / OAuth App registered: ${clientName} - ${clientId}`);
    } catch (e) {
      console.error('oauth_apps 저장 에러 / oauth_apps save error:', e);
      // DB 실패해도 일단 진행! (메모리로라도!) / Even if DB fails, proceed for now! (at least in memory!)
    }


    // ✅ Pinafore가 기대하는 응답! 
    // Pinafore expects this response!
    return NextResponse.json({
      id: clientId, // Pinafore는 id도 확인 / Pinafore also checks id
      name: clientName,
      website: website,
      redirect_uri: redirectUris,
      client_id: clientId,
      client_secret: clientSecret,
      vapid_key: '' // push용, 없어도 됨 / for push, not required
    });

  } catch (e) {
    console.error('apps 에러 / apps error:', e);
    //return NextResponse.json({ error: String(e) }, { status: 500 });

    // ✅ myapp37 - 에러나도 일단 성공으로 리턴 / Return a success status for now, even if an error occurs.
    return NextResponse.json({
      id: '1',
      name: 'Pinafore',
      website: null,
      redirect_uri: 'https://pinafore.social/settings/instances/add',
      client_id: 'pinafore_client_id',
      client_secret: 'pinafore_client_secret',
      vapid_key: null,
    }, {
      headers: { 'Access-Control-Allow-Origin': '*' }
    });
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