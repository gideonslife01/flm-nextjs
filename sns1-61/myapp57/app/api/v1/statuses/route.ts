// app/api/v1/statuses/route.ts 
// - ✅ myapp48 visibility
// - ✅ myapp51 image upload
// - ✅ myapp57 reply

import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { randomUUID } from 'crypto';
import { sendNote } from '@/lib/ap';

const DOMAIN = process.env.DOMAIN || 'aloy-horizon.duckdns.org';
// ✅ myapp57
function getUser(req: Request) {
  const auth = req.headers.get('Authorization')?.replace('Bearer ','').trim();
  if (auth) {
    // 1. oauth_tokens에서 access_token 검색
    const o = db.prepare('SELECT username FROM oauth_tokens WHERE access_token=?').get(auth) as any;
    if (o?.username) return o.username;
    // 2. sessions에서 refresh_token도 검색 (추가!)
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

export async function POST(req: Request) {
  try {
    // ✅ myapp57 - 기존 로직 제거 getuser함수로 대체 / Removed existing logic and replaced it with the `getuser` function.
    const username = getUser(req);
     if (!username) return NextResponse.json({error:'unauthorized'}, {status:401});

    // ✅ myapp57 - mastodon_id 조회 / select mastodon_id
    const userRow = db.prepare('SELECT mastodon_id FROM users WHERE username=?').get(username) as any;
    const mastodonId = userRow?.mastodon_id || username;

    const body = await req.json();
    const content = body.status || '';
    const visibility = body.visibility || 'public';

    // ✅ myapp57 - Add Reply
    const inReplyToId = body.in_reply_to_id || body.inReplyToId || null;
    let inReplyToUsername = body.in_reply_to_username || body.inReplyToUsername || null;

    // ✅ myapp51 
    // -  image upload 
    // -  3가지 케이스 모두 지원(마스토돈,로컬,안드로이드앱) + 크래시 방지
    // -  Supports all three scenarios (Mastodon, local, Android app) + crash prevention.
    const raw_ids = body.media_ids || body.media?.ids || body.mediaIds || [];
    const media_ids: string[] = Array.isArray(raw_ids) ? raw_ids : [];

    const id = randomUUID();
    const now = Date.now();

    console.log(`📝 글쓰기/write post: ${username}: [${visibility}] ${content}`);

    // ✅ myapp57 - 부모조회
    let inReplyToAccountId: string | null = null;

    let parentRow: any = null;
    if (inReplyToId) {
      try {
        parentRow = db.prepare(`
          SELECT p.id, p.username, p.original_id, u.mastodon_id
          FROM posts p LEFT JOIN users u ON p.username=u.username WHERE p.id=?
          UNION
          SELECT p.id, p.username, p.original_id, u.mastodon_id
          FROM inbox_posts p LEFT JOIN users u ON p.username=u.username WHERE p.id=?
          LIMIT 1
        `).get(inReplyToId, inReplyToId) as any;
        if (parentRow) {
          inReplyToAccountId = String(parentRow.mastodon_id || parentRow.username);
          inReplyToUsername = parentRow.username;
        }
      } catch {}
    }

       console.log(`📝 ${username}: replyTo=${inReplyToId} account=${inReplyToAccountId} user=${inReplyToUsername}`);


    // ✅ myapp57 - posts 저장에 reply 컬럼 추가 / Added reply column to posts storage
    try {
    db.prepare(`
      INSERT INTO posts (id, content, created_at, username, visibility, in_reply_to_id, in_reply_to_username, in_reply_to_account_id)
      VALUES (?,?,?,?,?,?,?,?)
    `).run(id, content, now, username, visibility, inReplyToId, inReplyToUsername, inReplyToAccountId);

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
    
    // - url 절대경로 보정 / Adjusting absolute URL paths
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
    // ✅ myapp48 + myapp51 + myapp57 
    // - any로 해야 inReplyTo 추가 가능 / you need to add "any" type so then you can to use "ReplyTo"
    const note : any = {
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

    // ✅ myapp57 - ActivityPub inReplyTo
    if (parentRow) {
      note.inReplyTo = parentRow.original_id || `https://${DOMAIN}/users/${parentRow.username}/statuses/${parentRow.id}`;
    } else if (inReplyToId && typeof inReplyToId === 'string' && inReplyToId.startsWith('http')) {
      note.inReplyTo = inReplyToId;
    } else if (inReplyToId) {
      note.inReplyTo = inReplyToId;
    }

    // outbox에 저장 / Save to outbox
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
        //id: username === 'user1' ? '1' : '2',
        id: mastodonId, // ✅ myapp57
        username: username,
        acct: `${username}@${DOMAIN}`,
        display_name: username,
        avatar: `https://${DOMAIN}/icon.png`
      },
      content: `<p>${content}</p>`,
      created_at: new Date(now).toISOString(),
      visibility: visibility, 
      // ✅ myapp57 - inReplyTo
      in_reply_to_id: inReplyToId,
      in_reply_to_account_id: inReplyToAccountId, 
      reblogs_count: 0,
      favourites_count: 0,
      replies_count: 0,
      // ✅ myapp51 - Pinafore/Tusky / Preview pinafore,tusky
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