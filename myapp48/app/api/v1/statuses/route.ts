// app/api/v1/statuses/route.ts - myapp48 visibility 최종!
import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { randomUUID } from 'crypto';
import { sendNote } from '@/lib/ap';

const DOMAIN = process.env.DOMAIN || 'aloy-horizon.duckdns.org';

export async function POST(req: Request) {
  try {
    const auth = req.headers.get('Authorization') || '';
    const token = auth.replace('Bearer ', '');

    let oauthToken: any;
    try {
      oauthToken = db.prepare('SELECT * FROM oauth_tokens WHERE access_token=?').get(token) as any;
    } catch {}

    const username = oauthToken?.username || 'user1';
    const body = await req.json();
    const content = body.status || '';
    const visibility = body.visibility || 'public';

    const id = randomUUID();
    const now = Date.now();

    console.log(`📝 글쓰기/write post: ${username}: [${visibility}] ${content}`);
    /*-- 테이블 생성 부분 삭제 / Delete the table creation section. */

    // posts 저장 / save posts
    // ✅ myapp48 - add visibility
    try {
      db.prepare(`INSERT INTO posts (id, content, created_at, username, visibility) VALUES (?,?,?,?,?)`)
        .run(id, content, now, username, visibility);
    } catch (e) {
      console.error('posts 저장 에러 / posts save error', e);
    }

    //✅ myapp48 -  to,cc 구분 / to,CC distinction
    const followersUrl = `https://${DOMAIN}/users/${username}/followers`;
    let to: string[] = [];
    let cc: string[] = [];

    if (visibility === 'public') {
      to = ['https://www.w3.org/ns/activitystreams#Public'];
      cc = [followersUrl];
    } else if (visibility === 'unlisted') {
      to = [followersUrl];
      cc = ['https://www.w3.org/ns/activitystreams#Public'];
    } else if (visibility === 'private') {
      to = [followersUrl];
      cc = [];
    }
    // ✅ myapp48
    const note = {
      id: `https://${DOMAIN}/users/${username}/statuses/${id}`,
      type: 'Note',
      content: `<p>${content}</p>`,
      attributedTo: `https://${DOMAIN}/users/${username}`,
      published: new Date(now).toISOString(),
      to,
      cc,
    };

    /*-- 테이블 생성 부분 삭제 / Delete the table creation section. */
    // outbox 저장
    // ✅ myapp48 - add visibility
    try {
      db.prepare(`INSERT INTO outbox (id, type, actor, object, created_at, visibility) VALUES (?,?,?,?,?,?)`)
        .run(randomUUID(), 'Create', `https://${DOMAIN}/users/${username}`, JSON.stringify(note), now, visibility);
    } catch (e) {
      console.error('outbox 저장 에러', e);
    }

    // 배달
    try {
      const followers = db.prepare('SELECT * FROM followers WHERE username = ?').all(username) as any[];
      console.log(`📤 [${username}][${visibility}] ${followers.length}명에게 배달`);
      await Promise.allSettled(
        followers.map(async (f) => {
          try {
            await sendNote(f.inbox, note, username, id, content);
          } catch {}
        })
      );
    } catch (e) {
      console.error('배달 에러 / Delivery Error', e);
    }

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
      visibility: visibility, 
      reblogs_count: 0,
      favourites_count: 0,
      replies_count: 0
    }, {
      headers: { 'Access-Control-Allow-Origin': '*' }
    });

  } catch (e) {
    console.error('statuses 에러 / error', e);
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