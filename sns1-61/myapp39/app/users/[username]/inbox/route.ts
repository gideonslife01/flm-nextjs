// ✅ myapp38 - app/users/[username]/inbox/route.ts
// following,followers 테이블 구조 동일하게 맞춤
// Aligned the structures of the 'following' and 'followers' tables.

import db from '@/lib/db';
import { sendAccept, verifyHttpSignature, fetchActorPublicKey, fetchActorPublicKeyWithRetry } from '@/lib/ap';
import crypto from 'crypto';
const DOMAIN = process.env.DOMAIN || 'aloy-horizon.duckdns.org';

export async function POST(req: Request, { params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  let body: any;
  let rawBody = '';

  try {
    rawBody = await req.text();
    try {
      body = JSON.parse(rawBody);
    } catch {
      console.log('⚠ JSON 파싱 실패 / JSON parsing failed', rawBody.slice(0,200));
      return new Response('', { status: 202 });
    }

    console.log(`📩 [${username}] INBOX:`, body.type, body.actor, body.id);

    // ✅ 서명 검증 / Signature Verification
    try {
      const actorIdForVerify = typeof body.actor === 'string'? body.actor : body.actor?.id;
      if (body.type === 'Delete') {
        console.log(`🗑 Delete는 검증 스킵! ${actorIdForVerify}`);
      }
      else if (!actorIdForVerify) {
        console.error('❌ actor 없음 / No actor', body);
      } else {
        const expectedDigest = `SHA-256=${crypto.createHash('sha256').update(rawBody).digest('base64')}`;
        const receivedDigest = req.headers.get('digest');
        if (receivedDigest && receivedDigest!== expectedDigest) {
          console.error(`❌ Digest 불일치 / Digest Mismatch`);
        }
        const dateHeader = req.headers.get('date');
        if (dateHeader) {
          const requestDate = new Date(dateHeader);
          const now = new Date();
          const diffMs = Math.abs(now.getTime() - requestDate.getTime());
          if (diffMs > 5 * 60 * 1000) {
            console.error(`❌ Date 오래됨 / Date: Old ${diffMs}ms`);
          }
        }
        const verifyReq = new Request(req.url, {
          method: req.method,
          headers: req.headers,
          body: rawBody
        });
        const { isValid } = await fetchActorPublicKeyWithRetry(
            actorIdForVerify,
            username,
            verifyReq
        );
        if (!isValid) {
          console.error(`❌ 서명 검증 실패 / Signature verification failed, actor: ${actorIdForVerify}`);
        } else {
          console.log(`✅ 서명 검증 성공 / Signature verification successful, actor: ${actorIdForVerify}`);
        }
      }
    } catch (verifyError) {
      console.error('❌ 검증 중 에러 / Error during verification:', verifyError);
    }

    const actorId = typeof body.actor === 'string'? body.actor : body.actor?.id;
    const actorInbox = typeof body.actor === 'object'? body.actor?.inbox : null;

    // Undo
    if (body.type === 'Undo') {
      const obj = body.object;
      const objType = typeof obj === 'object'? obj.type : null;
      let objectId = typeof obj?.object === 'string'? obj.object : obj?.object?.id;
      if (objectId) objectId = objectId.replace('/posts/', '/statuses/');
      const shortId = objectId?.split('/').pop()?.split('?')[0];

      if (objType === 'Follow' || typeof obj === 'string' || obj?.id?.includes('#follow') || obj?.id?.includes('/follows/')) {
         const unfollowActorId = typeof body.actor === 'string'? body.actor : body.actor?.id;
         db.prepare('DELETE FROM followers WHERE actor =? AND username =?').run(unfollowActorId, username);
         console.log(`🗑 [${username}] 언팔로우/Unffollow: ${unfollowActorId}`);
      }
      else if (objType === 'Like' || obj?.id?.includes('/likes/')) {
        const likeId = typeof obj === 'string'? obj : obj.id;
        db.prepare('DELETE FROM likes WHERE id =?').run(likeId);
        if (shortId) {
          db.prepare('DELETE FROM likes WHERE actor =? AND object LIKE?').run(actorId, `%${shortId}%`);
        }
        console.log(`💔 [${username}] Unlike: ${likeId} by ${actorId}`);
      }
      else if (objType === 'Announce') {
         const announceId = typeof obj === 'object'? obj.id : null;
         if (announceId) {
           db.prepare('DELETE FROM announces WHERE id =?').run(announceId);
           if (shortId) {
             db.prepare('DELETE FROM announces WHERE actor =? AND object LIKE?').run(actorId, `%${shortId}%`);
           }
           console.log(`🗑 [${username}] Announce 취소: ${announceId}`);
         }
      }
      return new Response('', { status: 202 });
    }

    // Create
    if (body.type === 'Create') {
      const note = body.object;
      if (note && note.type === 'Note') {
        console.log(`📝 [${username}] 새 글 도착 from ${actorId}`);
        try {
          const longId = note.id || `https://remote/${Date.now()}-${Math.random()}`;
          const shortId = longId.split('/').pop()!;
          const content = note.content || '';
          db.prepare(`INSERT OR IGNORE INTO inbox_posts (id, actor, content, username, original_id, created_at) VALUES (?,?,?,?,?,?)`)
           .run(shortId, actorId, content, username, longId, note.published || new Date().toISOString());
          console.log(`✅ inbox_posts 저장/ save inbox_posts: ${shortId}`);
        } catch (e) {
          console.error(`❌ 글 저장 실패 / Failed to save post.`, e);
        }
      }
      return new Response('', { status: 202 });
    }

    // Like
    if (body.type === 'Like') {
      try {
        const likeId = body.id;
        if (!likeId) return new Response('', { status: 202 });
        let objectId = typeof body.object === 'string'? body.object : body.object?.id;
        if (!objectId) return new Response('', { status: 202 });
        objectId = objectId.replace('/posts/', '/statuses/');
        console.log(`❤ [${username}] Like 도착 / Like arrived: ${actorId} -> ${objectId}`);
        db.prepare('INSERT OR IGNORE INTO likes (id, actor, object, username, created_at) VALUES (?,?,?,?,?)')
        .run(likeId, actorId, objectId, username, new Date().toISOString());
        console.log(`✅ likes 저장 / Like Saved: ${likeId}`);
      } catch (e) {
        console.error(`❌ Like 저장 실패 / Like save failed`, e);
      }
      return new Response('', { status: 202 });
    }

    // Announce
    if (body.type === 'Announce') {
      try {
        const announceId = body.id;
        let objectId = typeof body.object === 'string'? body.object : body.object?.id;
        if (!objectId) return new Response('', { status: 202 });
        objectId = objectId.replace('/posts/', '/statuses/');
        console.log(`🔁 [${username}] Announce 도착: ${actorId} -> ${objectId}`);
        // db.prepare('INSERT OR IGNORE INTO announces (id, actor, object, username, created_at) VALUES (?,?,?,?)')
        //  .run(announceId, actorId, objectId, username, new Date().toISOString());
        db.prepare('INSERT OR IGNORE INTO announces (id, actor, object, username, created_at) VALUES (?,?,?,?,?)')
  .run(announceId, actorId, objectId, username, new Date().toISOString());
        console.log(`✅ announces 저장 / announce save: ${announceId}`);
      } catch (e) {
        console.error(`❌ Announce 저장 실패 / Announce save failed`, e);
      }
      return new Response('', { status: 202 });
    }

    // Follow 
    // ✅ myapp38 - followers스키마 적용 / Apply 'followers' schema
    if (body.type === 'Follow') {
      const inboxUrl = actorInbox || `${actorId}/inbox`;
      const exists = db.prepare('SELECT 1 FROM followers WHERE actor =? AND username =?').get(actorId, username) as any;
      if (exists) {
        console.log(`ℹ 이미 팔로워: ${actorId}`);
        return new Response('', { status: 202 });
      }
      try {
        // ✅ myapp38 - id, actor, inbox, username, created_at 5개 필드
        db.prepare('INSERT OR IGNORE INTO followers (id, actor, inbox, username, created_at) VALUES (?,?,?,?,?)')
         .run(body.id, actorId, inboxUrl, username, new Date().toISOString());
        console.log(`✅ 팔로우 저장: ${actorId} inbox=${inboxUrl}`);
      } catch(e) {
        console.error('❌ 팔로우 저장 실패/follow save failed', e);
      }
      sendAccept(inboxUrl, body, username).catch(e => console.error('Accept 실패:', e));
    }

    return new Response('', { status: 202 });
  } catch (e) {
    console.error('inbox 에러/inbox error:', e);
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