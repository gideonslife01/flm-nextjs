// app/api/v1/accounts/verify_credentials/route.ts 
// - ✅ myapp33-5 + myapp55 + myapp57

import { NextResponse } from 'next/server';
import db from '@/lib/db';

const DOMAIN = process.env.DOMAIN || 'aloy-horizon.duckdns.org';

// ✅ myapp57 - getUser함수로 계정 확인 / Verify the account using the `getUser` function.
function getUser(req: Request) {
  const auth = req.headers.get('Authorization')?.replace('Bearer ','').trim();
  if (auth) {
    // 1. oauth_tokens에서 access_token 검색
    // Retrieve access_token from oauth_tokens
    const o = db.prepare('SELECT username FROM oauth_tokens WHERE access_token=?').get(auth) as any;
    if (o?.username) return o.username;
    // 2. sessions에서 refresh_token도 검색
    // Also search for refresh_token in sessions
    const s = db.prepare('SELECT username FROM sessions WHERE refresh_token=?').get(auth) as any;
    if (s?.username) return s.username;
  }
  const cookie = req.headers.get('cookie') || '';
  const m = cookie.match(/refresh_token=([^;]+)/);
  if (m) {
    const s = db.prepare('SELECT username FROM sessions WHERE refresh_token=?').get(m[1]) as any;
    if (s?.username) return s.username;
  }
  return null;
}

export async function GET(req: Request) {
    const username = getUser(req);
    if (!username) return NextResponse.json({error:'unauthorized'}, {status:401});

  // ✅ myapp57 - id를 mastodId로 수정함 / Changed id to mastodId
  let mastodonId: string;
  try {
    const row = db.prepare('SELECT mastodon_id FROM users WHERE username=?').get(username) as any;
    mastodonId = String(row?.mastodon_id || username);
  } catch {
    mastodonId = username;
  }

  // ✅ Mastodon 형식으로 리턴 / Return in Mastodon format
  return NextResponse.json({
    id:  mastodonId, // ✅ myapp57
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