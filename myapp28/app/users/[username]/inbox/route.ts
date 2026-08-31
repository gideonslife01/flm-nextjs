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
      // ✅ myapp25 - Announce Undo 추가!
      else if (objType === 'Announce') {
         const announceId = typeof obj === 'object' ? obj.id : null;
         const objectId = typeof obj.object === 'string' ? obj.object : obj.object?.id;
         if (announceId) {
           db.prepare('DELETE FROM announces WHERE id = ?').run(announceId);

           // ✅ myapp28 - Announce Undo시 원본 글 삭제 금지 처리 / Prevent deletion of the original post when performing "Announce Undo."
           //db.prepare('DELETE FROM inbox_posts WHERE original_id = ? AND actor = ?').run(objectId, body.actor);
           console.log(`🗑 [${username}] Announce 취소: ${announceId}`);
         }
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

    // ✅ myapp25 - 부스트 받기 / Receive Boost 
    if (body.type === 'Announce') {
      try {
        const announceId = body.id;
        const objectId = typeof body.object === 'string' ? body.object : body.object?.id;
        console.log(`🔁 [${username}] Announce 도착: ${actorId} -> ${objectId}`);

        // 1. announces 테이블에 기록
        // Record in announces table
        db.prepare('INSERT OR IGNORE INTO announces (id, username, object) VALUES (?,?,?)')
          .run(announceId, username, objectId);

        // 2. 원글 내용 가져와서 inbox_posts에 저장 (타임라인에 뜨게)
        // Retrieve the original post content and save it to inbox_posts (so it appears on the timeline)
        try {
          const noteRes = await fetch(objectId, {
            headers: { Accept: 'application/activity+json' }
          });
          if (noteRes.ok) {
            const note = await noteRes.json();
            const longId = note.id || objectId;
            const shortId = `${longId.split('/').pop()}_boost_${Date.now()}`; // 부스트는 별도 id / Boost has a separate id
            const content = note.content || note.summary || '';

            db.prepare(`
              INSERT OR IGNORE INTO inbox_posts (id, actor, content, username, original_id, created_at) 
              VALUES (?, ?, ?, ?, ?, ?)
            `).run(shortId, actorId, content, username, longId, body.published || new Date().toISOString());
            console.log(`✅ [${username}] 부스트 inbox_posts 저장 / Boost inbox_posts save: ${shortId}`);
          }
        } catch (fetchErr) {
          console.log(`⚠ 원글 fetch 실패, content 없이 저장 / Failed to fetch original post; saved without content.`, fetchErr);
          // fetch 실패해도 부스트 기록은 남김 / Boost records are saved even if fetch fails.
          db.prepare(`
            INSERT OR IGNORE INTO inbox_posts (id, actor, content, username, original_id, created_at) 
            VALUES (?, ?, ?, ?, ?, ?)
          `).run(`boost_${Date.now()}`, actorId, `[Boost] ${objectId}`, username, objectId, new Date().toISOString());
        }

        console.log(`✅ [${username}] announces 저장 완료: ${announceId}`);
      } catch (e) {
        console.error(`❌ Announce 저장 실패 / Failed to save Announce.`, e);
      }
      return new Response('', { status: 202 });
    }

    // ✅ myapp25 - Undo Announce / 부스트 취소 받기
    if (body.type === 'Undo') {

      // 위에서 이미 Follow, Like Undo 처리했으니까 여기서는 Announce Undo만
      // Since Follow and Like undo operations have already been handled above, only Announce undo is processed here.
      const obj = body.object;
      if (typeof obj === 'object' && obj.type === 'Announce') {
        const announceId = obj.id;
        const objectId = typeof obj.object === 'string' ? obj.object : obj.object?.id;
        console.log(`↩ [${username}] Undo Announce: ${actorId} -> ${objectId}`);
        
        db.prepare('DELETE FROM announces WHERE id = ?').run(announceId);

        // inbox_posts에서 부스트 글도 삭제 (선택)
        // Delete boosted posts from inbox_posts as well (optional)
        db.prepare('DELETE FROM inbox_posts WHERE original_id = ? AND actor = ?').run(objectId, actorId);
        console.log(`🗑 [${username}] 부스트 취소 처리 완료 / Boost processing cancellation complete.`);
        return new Response('', { status: 202 });
      }
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