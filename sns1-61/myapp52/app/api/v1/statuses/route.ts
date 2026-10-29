// app/api/v1/statuses/route.ts 
// - ✅ myapp48 visibility
// - ✅ myapp51 image upload

import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { randomUUID } from 'crypto';
import { sendNote } from '@/lib/ap';

const DOMAIN = process.env.DOMAIN || 'aloy-horizon.duckdns.org';


export async function POST(req: Request) {
  try {
    const auth = req.headers.get('Authorization') || '';
    const token = auth.replace('Bearer ', '');

    // ✅ myapp49 - pinafore,local server login 
    let username: string | null = null;

    // ✅ myapp49 - 1. Bearer 토큰 체크 / Bearer token check (Pinafore)
    if (token) {
      try {
        const oauthToken = db.prepare('SELECT username FROM oauth_tokens WHERE access_token=?').get(token) as any;
        if (oauthToken?.username) username = oauthToken.username;
      } catch {}
    }

    // 2. 쿠키 체크 (로컬 서버) / Cookie Check (Local Server)
    if (!username) {
      try {
        const { getViewerFromRequest } = await import('@/lib/visibility');
        username = getViewerFromRequest(req);
      } catch {}
    }

    // ✅ 3. 둘 다 없으면 401 - 'user1' 폴백 절대 금지
    // If neither exists, return 401—falling back to 'user1' is strictly prohibited.
    if (!username) {
      return NextResponse.json({ error: 'unauthorized - Bearer token or login required' }, { status: 401 });
    }

    // let oauthToken: any;
    // try {
    //   oauthToken = db.prepare('SELECT * FROM oauth_tokens WHERE access_token=?').get(token) as any;
    // } catch {}

    // const username = oauthToken?.username || 'user1';


    const body = await req.json();
    const content = body.status || '';
    const visibility = body.visibility || 'public';

    // ✅ myapp51 
    // -  image upload 
    // -  3가지 케이스 모두 지원(마스토돈,로컬,안드로이드앱) + 크래시 방지
    // -  Supports all three scenarios (Mastodon, local, Android app) + crash prevention.
    const raw_ids = body.media_ids || body.media?.ids || body.mediaIds || [];
    const media_ids: string[] = Array.isArray(raw_ids) ? raw_ids : [];

    const id = randomUUID();
    const now = Date.now();

    console.log(`📝 글쓰기/write post: ${username}: [${visibility}] ${content}`);

    // posts 저장 / save posts
    // ✅ myapp48 - add visibility
    try {
      db.prepare(`INSERT INTO posts (id, content, created_at, username, visibility) VALUES (?,?,?,?,?)`)
        .run(id, content, now, username, visibility);
    } catch (e) {
      console.error('posts 저장 에러 / posts save error', e);
    }

    // ✅ myapp51 - image upload , 소유권 체크 후 연결 / Connect after verifying ownership
    // ['a','b'] → ... → 'a', 'b'
    let attachments: any[] = [];
    if (media_ids.length > 0) {
      const placeholders = media_ids.map(() => '?').join(',');
      attachments = db.prepare(
        `SELECT * FROM media_attachments WHERE id IN (${placeholders}) AND username=?`
      ).all(...media_ids, username) as any[];

      for (const m of attachments) {
        try {
          db.prepare('INSERT INTO post_media (post_id, media_id) VALUES (?,?)').run(id, m.id);
        } catch (e) {
          console.error('post_media insert fail', e);
        }
      }
    }
    
    // -  url 절대경로 보정 / Adjusting absolute URL paths
    const toAbsoluteUrl = (u: string) => u.startsWith('http') ? u : `https://${DOMAIN}${u}`;


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
    // ✅ myapp48 + myapp51
    const note = {
      id: `https://${DOMAIN}/users/${username}/statuses/${id}`,
      type: 'Note',
      content: `<p>${content}</p>`,
      attributedTo: `https://${DOMAIN}/users/${username}`,
      published: new Date(now).toISOString(),
      to,
      cc,
      attachment: attachments.map(m => ({ // ✅ myapp51 - image uload
        type: 'Document',
        mediaType: m.type,
        url: toAbsoluteUrl(m.url)
      }))
    };


    // outbox 저장
    // ✅ myapp48 - add visibility
    try {
      db.prepare(`INSERT INTO outbox (id, type, actor, object, created_at, visibility) VALUES (?,?,?,?,?,?)`)
        .run(randomUUID(), 'Create', `https://${DOMAIN}/users/${username}`, JSON.stringify(note), now, visibility);
    } catch (e) {
      console.error('outbox 저장 에러', e);
    }

    // 배달 / delivery
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
      replies_count: 0,
      // ✅ myapp51 - Pinafore/Tusky 미리보기 / 
      media_attachments: attachments.map(m => ({
        id: m.id,
        type: 'image',
        url: toAbsoluteUrl(m.url),
        preview_url: toAbsoluteUrl(m.url)
      }))
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