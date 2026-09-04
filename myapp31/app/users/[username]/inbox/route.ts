//✅ myapp31 - app/users/[username]/inbox/route.ts
import db from '@/lib/db';
import { sendAccept, verifyHttpSignature, fetchActorPublicKey } from '@/lib/ap';
import crypto from 'crypto';

const DOMAIN = process.env.DOMAIN || 'aloy-horizon.duckdns.org'; 

export async function POST(req: Request, { params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  let body: any;
  let rawBody = '';

  try {
    // rawBody를 먼저 읽기 / Read rawBody first
     rawBody = await req.text(); 
    try {
      body = JSON.parse(rawBody);
    } catch {
      console.log('⚠️ JSON 파싱 실패! 빈 바디? / Failed to parse JSON! Empty body?', rawBody.slice(0,200));
      return new Response('', { status: 202 });
    }

   // const body = await req.json();
    console.log(`📩 [${username}] INBOX:`, body.type, body.actor, body.id);

    // ✅ myapp31 -  HTTP Signature 검증!  / HTTP Signature Verification! (Crucial!)
    try {
      const actorIdForVerify = typeof body.actor === 'string' ? body.actor : body.actor?.id;

      // Delete요청은 계정 삭제 알림 / A delete request is a notification for account deletion.
      // Delete 요청시는 키 검증 스킵 / Skip key validation for DELETE requests.
      if (body.type === 'Delete') {
        console.log(`🗑 Delete는 검증 스킵! / Skip validation for Delete! ${actorIdForVerify}`);
      } 
      else if (!actorIdForVerify) {
        console.error('❌ actor 없음! 검증 스킵!/ No actor! Skip verification!', body);
      } else {
        console.log(`🔍 test username: ${username}`);

        // - Actor에서 publicKey 가져오기! / Fetch publicKey from Actor!
        const publicKeyPem = await fetchActorPublicKey(actorIdForVerify, username);
        
        // - Digest 검증! (body 위조 방지!) / Verify Digest! (prevent body tampering!)
        const expectedDigest = `SHA-256=${crypto.createHash('sha256').update(rawBody).digest('base64')}`;
        const receivedDigest = req.headers.get('digest');
        if (receivedDigest && receivedDigest !== expectedDigest) {
          console.error(`❌ Digest 불일치! 위조 의심! 받은: ${receivedDigest}, 예상: ${expectedDigest}`);
          // return new Response('Invalid Digest', { status: 401 });
        }

        // - Date 검증! (재전송 공격 방지! 5분!) / Verify Date! (prevent replay attacks! 5 minutes!)
        const dateHeader = req.headers.get('date');
        if (dateHeader) {
          const requestDate = new Date(dateHeader);
          const now = new Date();
          const diffMs = Math.abs(now.getTime() - requestDate.getTime());
          if (diffMs > 5 * 60 * 1000) {
            console.error(`❌ Date 너무 오래됨! 재전송 공격 의심! diff / Date is too old! Replay attack suspected! : ${diffMs}ms`);
            // return new Response('Date too old', { status: 401 });
          }
        }

        // - Signature 검증! (사칭 방지!) / Verify Signature! (prevent impersonation!)
        // verifyHttpSignature는 clone된 req를 사용하므로 rawBody 기반! 
        // verifyHttpSignature uses cloned req, so based on rawBody!

        // 여기서는 req를 다시 만들어야 함! (body를 이미 읽었으므로!) 
        // Here, we need to recreate req! (because body has already been read!)
        const verifyReq = new Request(req.url, {
          method: req.method,
          headers: req.headers,
          body: rawBody
        });
        const isValid = await verifyHttpSignature(verifyReq, publicKeyPem);
        
        if (!isValid) {
          console.error(`❌ [${username}] 서명 검증 실패! 사칭 의심! / Signature verification failed! Suspected impersonation! actor: ${actorIdForVerify}`);
          // 🔴 운영에서는 401! 개발 중에는 로그만!
          // return new Response('Invalid signature', { status: 401 });
          console.log('⚠️ 개발 모드: 검증 실패해도 진행! / Development mode: proceed even if verification fails!');
        } else {
          console.log(`✅ [${username}] 서명 검증 성공! / Signature verification successful! actor: ${actorIdForVerify}`);
        }
      }
    } catch (verifyError) {
      console.error('❌ 검증 중 에러 (진행은 함!) / Error during verification:', verifyError);
      // 검증 실패해도 일단 진행! (개발 모드!)
      // 운영에서는: return new Response('Verification failed', { status: 401 });
    }

    const actorId = typeof body.actor === 'string' ? body.actor : body.actor?.id;
    const actorInbox = typeof body.actor === 'object' ? body.actor?.inbox : null;

    // Undo - 제일 먼저! / Undo - first!
    if (body.type === 'Undo') {
      const obj = body.object;
      const objType = typeof obj === 'object'? obj.type : null;
      let objectId = typeof obj?.object === 'string'? obj.object : obj?.object?.id;
      if (objectId) objectId = objectId.replace('/posts/', '/statuses/');
      const shortId = objectId?.split('/').pop()?.split('?')[0];

      if (objType === 'Follow' || typeof obj === 'string' || obj?.id?.includes('#follow') || obj?.id?.includes('/follows/')) {
         const unfollowActorId = typeof body.actor === 'string'? body.actor : body.actor?.id;
         db.prepare('DELETE FROM followers WHERE actor =? AND username =?').run(unfollowActorId, username);
         console.log(`🗑 [${username}] 언팔로우/Unfollow: ${unfollowActorId}`);
      }
      else if (objType === 'Like' || obj?.id?.includes('/likes/')) {
        // id + actor+shortId 둘 다로 삭제! / Delete by both id + actor + shortId
        const likeId = typeof obj === 'string'? obj : obj.id;
        db.prepare('DELETE FROM likes WHERE id =?').run(likeId);
        if (shortId) {
          db.prepare('DELETE FROM likes WHERE actor =? AND object LIKE ?').run(actorId, `%${shortId}%`);
        }
        console.log(`💔 [${username}] Unlike: ${likeId} by ${actorId}`);
      }
      else if (objType === 'Announce') {
         const announceId = typeof obj === 'object' ? obj.id : null;
         if (announceId) {
           db.prepare('DELETE FROM announces WHERE id = ?').run(announceId);
           if (shortId) {
             db.prepare('DELETE FROM announces WHERE actor =? AND object LIKE ?').run(actorId, `%${shortId}%`);
           }
           console.log(`🗑 [${username}] Announce 취소: ${announceId}`);
         }
      }
      return new Response('', { status: 202 });
    }

    //  Create
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
          console.log(`✅ inbox_posts 저장 / inbox_posts saved: ${shortId}`);
        } catch (e) {
          console.error(`❌ 글 저장 실패 / Failed to save post`, e);
        }
      }
      return new Response('', { status: 202 });
    }

    // Like 수신 - 크래시 방지! / Receive Like - prevent crash!
    if (body.type === 'Like') {
      try {
        const likeId = body.id;
        if (!likeId) return new Response('', { status: 202 });

        let objectId = typeof body.object === 'string'? body.object : body.object?.id;
        if (!objectId) {
          console.log('⚠️ Like object 없음', body);
          return new Response('', { status: 202 });
        }
        objectId = objectId.replace('/posts/', '/statuses/');

        console.log(`❤ [${username}] Like 도착: ${actorId} -> ${objectId}`);

        // ✅ actor 포함해서 저장! / Save including actor!
        db.prepare('INSERT OR IGNORE INTO likes (id, actor, object, username) VALUES (?,?,?,?)')
         .run(likeId, actorId, objectId, username);

        console.log(`✅ likes 저장 완료 / likes saved: ${likeId}`);
      } catch (e) {
        console.error(`❌ Like 저장 실패 / Failed to save like`, e);
      }
      return new Response('', { status: 202 });
    }

    // Announce 수신 - actor 포함! / Receive Announce - include actor!
    if (body.type === 'Announce') {
      try {
        const announceId = body.id;
        let objectId = typeof body.object === 'string' ? body.object : body.object?.id;
        if (!objectId) return new Response('', { status: 202 });
        objectId = objectId.replace('/posts/', '/statuses/');
        
        console.log(`🔁 [${username}] Announce 도착: ${actorId} -> ${objectId}`);

        // actor 컬럼 포함!
        db.prepare('INSERT OR IGNORE INTO announces (id, actor, object, username) VALUES (?,?,?,?)')
          .run(announceId, actorId, objectId, username);

        try {
          const noteRes = await fetch(objectId, { headers: { Accept: 'application/activity+json' } });
          if (noteRes.ok) {
            const note = await noteRes.json();
            const longId = note.id || objectId;
            const shortId = `${longId.split('/').pop()}_boost_${Date.now()}`;
            const content = note.content || '';
            db.prepare(`INSERT OR IGNORE INTO inbox_posts (id, actor, content, username, original_id, created_at) VALUES (?,?,?,?,?,?)`)
              .run(shortId, actorId, content, username, longId, body.published || new Date().toISOString());
          }
        } catch {}
        console.log(`✅ announces 저장 완료 / announces saved: ${announceId}`);
      } catch (e) {
        console.error(`❌ Announce 저장 실패 / Failed to save announce`, e);
      }
      return new Response('', { status: 202 });
    }

    // Follow
    if (body.type === 'Follow') {
      const inboxUrl = actorInbox || `${actorId}/inbox`;
      const exists = db.prepare('SELECT 1 FROM followers WHERE actor = ? AND username = ?').get(actorId, username) as any;
      if (exists) {
        console.log(`ℹ 이미 팔로워  / Already following: ${actorId}`);
        return new Response('', { status: 202 });
      }
      try {
        db.prepare('INSERT OR IGNORE INTO followers (id, actor, inbox, username) VALUES (?,?,?,?)')
          .run(body.id, actorId, inboxUrl, username);
        console.log(`✅ 팔로우 저장 / Follow saved: ${actorId}`);
      } catch {}
      sendAccept(inboxUrl, body, username).catch(e => console.error('Accept 실패 / Failed to accept follow:', e));
    }



    return new Response('', { status: 202 });
  } catch (e) {
    console.error('inbox 에러 / Inbox error:', e);
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