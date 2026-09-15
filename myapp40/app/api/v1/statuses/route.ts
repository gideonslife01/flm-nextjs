// app/api/v1/statuses/route.ts - 글쓰기 DB저장 / Creating status and saving to DB
// ✅ myapp34-2

import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { randomUUID } from 'crypto';

const DOMAIN = process.env.DOMAIN || 'aloy-horizon.duckdns.org';

export async function POST(req: Request) {
  try {
    const auth = req.headers.get('Authorization') || '';
    const token = auth.replace('Bearer ', '');

    // 토큰으로 유저 찾기 / Find user by token
    let oauthToken: any;
    try {
      oauthToken = db.prepare('SELECT * FROM oauth_tokens WHERE access_token=?').get(token) as any;
    } catch {}

    const username = oauthToken?.username || 'user1';
    const body = await req.json();
    const content = body.status || '';

    const id = randomUUID();
    const now = Date.now();

    console.log(`📝 글쓰기 / Creating status: ${username}: ${content}`);

    // ✅ posts 테이블 생성 + 저장 / Creating + saving posts table
    try {
      db.prepare(`
      CREATE TABLE posts (
          id TEXT PRIMARY KEY,
          content TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        , username TEXT DEFAULT 'user1');
      `).run();

      db.prepare(`INSERT INTO posts (id, content, created_at, username) VALUES (?,?,?,?)`)
        .run(id,content, now, username);
    } catch (e) { console.error('posts 저장 에러/posts save error', e); }

    // ✅ outbox 테이블 생성 + 저장! (ActivityPub용! myapp32 연결!) / Creating + saving outbox table! (For ActivityPub! myapp32 connection!)
    try {
      db.prepare(`
        CREATE TABLE IF NOT EXISTS outbox (
          id TEXT PRIMARY KEY,
          type TEXT,
          actor TEXT,
          object TEXT,
          created_at INTEGER
        )
      `).run();

      const note = {
        id: `https://${DOMAIN}/users/${username}/statuses/${id}`,
        type: 'Note',
        content: `<p>${content}</p>`,
        attributedTo: `https://${DOMAIN}/users/${username}`,
        published: new Date(now).toISOString(),
        to: ['https://www.w3.org/ns/activitystreams#Public']
      };

      db.prepare(`INSERT INTO outbox (id, type, actor, object, created_at) VALUES (?,?,?,?,?)`)
        .run(id, 'Create', `https://${DOMAIN}/users/${username}`, JSON.stringify(note), now);
    } catch (e) { console.error('outbox 저장 에러 / outbox save error', e); }

    // Mastodon 형식으로 리턴 / Return in Mastodon format
    return NextResponse.json({
      id: id,
      uri: `https://${DOMAIN}/users/${username}/statuses/${id}`,
      url: `https://${DOMAIN}/users/${username}/statuses/${id}`,
      account: {
        id: username === 'user1' ? '1' : '2',
        username: username,
        acct: `${username}@${DOMAIN}`,
        display_name: username,
        avatar: `https://${DOMAIN}/icon.png`
      },
      content: `<p>${content}</p>`,
      created_at: new Date(now).toISOString(),
      visibility: 'public',
      reblogs_count: 0,
      favourites_count: 0,
      replies_count: 0
    }, {
      headers: { 'Access-Control-Allow-Origin': '*' }
    });

  } catch (e) {
    console.error('statuses 에러', e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}