// app/api/v1/accounts/verify_credentials/route.ts - ✅ myapp33-5
import { NextResponse } from 'next/server';
import db from '@/lib/db';

const DOMAIN = process.env.DOMAIN || 'aloy-horizon.duckdns.org';

export async function GET(req: Request) {
  const auth = req.headers.get('authorization') || '';
  const token = auth.replace('Bearer ', '');

  console.log(`🔍 verify_credentials token=${token.substring(0,8)}...`);

  // ✅ 토큰 검증! / Verify token!
  let oauthToken: any;
  try {
    oauthToken = db.prepare('SELECT * FROM oauth_tokens WHERE access_token = ?').get(token) as any;
  } catch {}

  if (!oauthToken) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  }
  
  const username = oauthToken.username || 'user1';

  // ✅ Mastodon 형식으로 리턴 / Return in Mastodon format
  return NextResponse.json({
    id: '1',
    username: username,
    acct: `${username}@${DOMAIN}`,
    display_name: username,
    locked: false,
    bot: false,
    created_at: new Date().toISOString(),
    note: 'My ActivityPub server!',
    url: `https://${DOMAIN}/users/${username}`,
    avatar: `https://${DOMAIN}/icon.png`,
    avatar_static: `https://${DOMAIN}/icon.png`,
    header: `https://${DOMAIN}/icon.png`,
    header_static: `https://${DOMAIN}/icon.png`,
    followers_count: 1,
    following_count: 1,
    statuses_count: 100,
    source: {
      privacy: 'public',
      sensitive: false,
      language: 'en',
      note: '',
      fields: []
    }
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