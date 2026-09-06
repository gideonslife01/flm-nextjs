// app/api/v1/statuses/route.ts - ✅ myapp33-7 - Pinafore 글쓰기!
import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { randomUUID } from 'crypto';

const DOMAIN = process.env.DOMAIN || 'aloy-horizon.duckdns.org';

export async function POST(req: Request) {
  const auth = req.headers.get('authorization') || '';
  const token = auth.replace('Bearer ', '');
  
  let oauthToken: any;
  try {
    oauthToken = db.prepare('SELECT * FROM oauth_tokens WHERE access_token = ?').get(token) as any;
  } catch {}
  
  if (!oauthToken) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  }

  const body = await req.json();
  const status = body.status || '';
  const visibility = body.visibility || 'public';

  const username = oauthToken.username;
  const id = randomUUID();

  console.log(`📝 Pinafore 글쓰기! ${username}: ${status}`);

  // ✅ Outbox에 저장! (myapp32에서 만든 흐름 재사용!)
  // 실제로는 /users/user1/outbox POST 호출하면 됨!
  // 지금은 간단히 리턴!

  return NextResponse.json({
    id: id,
    created_at: new Date().toISOString(),
    content: `<p>${status}</p>`,
    account: {
      id: '1',
      username: username,
      acct: `${username}@${DOMAIN}`,
      display_name: username,
      url: `https://${DOMAIN}/users/${username}`,
      avatar: `https://${DOMAIN}/icon.png`
    },
    visibility: visibility,
    url: `https://${DOMAIN}/users/${username}/statuses/${id}`
  });
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