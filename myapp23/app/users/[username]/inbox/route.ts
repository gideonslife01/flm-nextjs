import db from '@/lib/db';
import { sendAccept } from '@/lib/ap';

// myapp15 ✅
const DOMAIN = process.env.DOMAIN || 'aloy-horizon.duckdns.org'; 

// myapp13 ✅
export async function POST(req: Request, { params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  try {
    const body = await req.json();
    console.log(`📩 [${username}] INBOX:`, body.type, body.actor);

    const actorId = typeof body.actor === 'string' ? body.actor : body.actor?.id;
    const actorInbox = typeof body.actor === 'object' ? body.actor?.inbox : null;

    // ✅ myapp13  - 1. Undo는 제일 먼저! 검증 없이 처리해야 언팔로우가 됨 / Undo should be processed first without verification to allow unfollowing
    if (body.type === 'Undo') {
      const obj = body.object;
      const objType = typeof obj === 'object'? obj.type : null;

      // ✅ myapp22 - Follow Undo
      if (objType === 'Follow' || typeof obj === 'string' || obj?.id?.includes('#follow') || obj?.id?.includes('/follows/')) {
         const unfollowActorId = body.actor;
         db.prepare('DELETE FROM followers WHERE actor =? AND username =?').run(unfollowActorId, username);
         console.log(`🗑 [${username}] 언팔로우 / unfollow : ${unfollowActorId}`);
      }
      // ✅ myapp23 - Like Undo
      else if (objType === 'Like' || obj?.id?.includes('/likes/')) {
        const likeId = typeof obj === 'string'? obj : obj.id;
        db.prepare('DELETE FROM likes WHERE id =?').run(likeId);
        console.log(`💔 [${username}] Unlike 저장 / unlike : ${likeId} by ${actorId}`);
      }
      return new Response('', { status: 202 });
    }

    //  ✅ myapp14 - 2. Create - 새 글 받기! / Receive new post!
    if (body.type === 'Create') {
      const note = body.object;
      if (note && note.type === 'Note') {
        console.log(`📝 [${username}] 새 글 도착 / New post received from ${actorId}`);
        console.log(`내용/content: ${note.content?.slice(0, 100)}`);

        // ✅ myapp20 -inbox_posts주소 줄이기 / Shorten inbox_posts URL
        try {
          const longId = note.id || `https://remote/${Date.now()}-${Math.random()}`;
          const shortId = longId.split('/').pop()!; // 마지막 부분만 잘라내기 / Cut off only the last part
          const content = note.content || '';

          db.prepare(`
            INSERT OR IGNORE INTO inbox_posts (id, actor, content, username, original_id, created_at) 
            VALUES (?, ?, ?, ?, ?, ?)
          `).run(shortId, actorId, content, username, longId, note.published || new Date().toISOString());
          console.log(`✅ [${username}] inbox_posts 저장 완료/inbox_posts saved successfully. : ${shortId} (원본/original: ${longId})`);

        } catch (e) {
          console.error(`❌ 글 저장 실패 / Failed to save post`, e);
        }

      }
      return new Response('', { status: 202 });
    }

    // ✅ myapp14 - 3. 검증 - 테스트라 스킵, 근데 publicKeyPem 없을때 터지지 않게 방어 / Verification - skipped for testing, but defend against missing publicKeyPem
    try {
      const actorUrl = body.actor;
      const actorData = await fetch(actorUrl, {
        headers: { Accept: 'application/activity+json' }
      }).then(r => r.json());
      
      // optional chaining으로 방어 / Defend with optional chaining
      const publicKeyPem = actorData?.publicKey?.publicKeyPem;
      
      if (!publicKeyPem) {
        console.log(`⚠️ [${username}] publicKey 없음, 검증 스킵 / no publicKey, skip verify`);
      } else {
        // const isValid = verify(req, publicKeyPem); 
        // if (!isValid) return Response.json({}, { status: 401 });
      }
    } catch (verErr) {
      console.log(`⚠️ [${username}] actor fetch 실패, 검증 스킵 / fetch failed, skip verify`, verErr);
    }

    if (body.type === 'Follow') {
      const inboxUrl = actorInbox || `${actorId}/inbox`;
      
      // ✅ myapp15 - 팔로우 저장 / Save follow
      // db.prepare('INSERT OR IGNORE INTO followers (id, actor, inbox, username) VALUES (?,?,?,?)')
      // .run(body.id, actorId, inboxUrl, username);
      // console.log(`✅ [${username}] 팔로우 저장 / follow save : ${actorId}`);

      // ✅ myapp21 
      // 데이터베이스에 중복 입력 방지 / Preventing duplicate entries in the database
      const exists = db.prepare('SELECT 1 FROM followers WHERE actor = ? AND username = ?').get(actorId, username) as any;
      if (exists) {
        console.log(`ℹ [${username}] 이미 팔로워 / Already follower - Accept 스킵 / Skipp: ${actorId}`);
        return new Response('', { status: 202 }); // 여기서 종료, Accept 안 보냄 / Stopping here; not sending an 'Accept'.
      }
      // 새 팔로워만 저장 / Save new followers only + Accept
      // ✅ myapp22 - insert or ignore
      try {
        db.prepare('INSERT OR IGNORE INTO followers (id, actor, inbox, username) VALUES (?,?,?,?)')
          .run(body.id, actorId, inboxUrl, username);
        console.log(`✅ [${username}] 팔로우 저장 / follow save : ${actorId}`);
      } catch (e: any) {
        if (e.code === 'SQLITE_CONSTRAINT_UNIQUE') {
          console.log(`ℹ️ 중복 팔로워 차단 / Block Duplicate Followers (UNIQUE): ${actorId}`);
          return new Response('', { status: 202 });
        }
        throw e;
      }

      // Accept 비동기로 전송 (응답 빨리 주려고) / Send Accept asynchronously (to respond quickly)
      sendAccept(inboxUrl, body, username).catch(e => console.error('Accept 실패:', e));
    }

     // ✅ myapp23 - 좋아요 받기 / Get Likes !
    if (body.type === 'Like') {
      try {
        const likeId = body.id;
        const objectId = typeof body.object === 'string'? body.object : body.object?.id;
        console.log(`❤️ [${username}] Like 도착: ${actorId} -> ${objectId}`);

        db.prepare('INSERT OR IGNORE INTO likes (id, actor, object, username) VALUES (?,?,?,?)')
         .run(likeId, actorId, objectId, username);

        console.log(`✅ [${username}] likes 저장 완료: ${likeId}`);
      } catch (e) {
        console.error(`❌ Like 저장 실패 / Failed to save 'Like'`, e);
      }
      return new Response('', { status: 202 });
    }

    return new Response('', { status: 202 });
  } catch (e) {
    console.error('inbox 에러 / inbox error:', e);
    return new Response('', { status: 202 });
  }
}

export async function GET(_req: Request, { params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  return new Response(JSON.stringify({
    '@context': 'https://www.w3.org/ns/activitystreams',
    id: `https://${DOMAIN}/users/${username}/inbox`,
    type: 'OrderedCollection', orderedItems: []
  }), { headers: { 'Content-Type': 'application/activity+json' } });
}