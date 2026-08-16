import db from '@/lib/db';
import { sendAccept } from '@/lib/ap';

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
      const targetActor = typeof body.object?.actor === 'string' ? body.object.actor : body.object?.actor?.id || body.object?.id || body.actor;
      
       // Follow Undo인 경우 / If it's a Follow Undo
      if (body.object?.type === 'Follow' || typeof body.object === 'string' || body.object?.id?.includes('#follow')) {
         const unfollowActorId = body.actor; // 누가 언팔했는지 / who unfollowed
         db.prepare('DELETE FROM followers WHERE actor = ?').run(unfollowActorId);
         console.log(`🗑️ [${username}] 언팔로우 / unfollow : ${unfollowActorId}`);
      }
      return new Response('', { status: 202 });
    }

    //  ✅ myapp14 - 2. Create - 새 글 받기! / Receive new post!

    if (body.type === 'Create') {
      const note = body.object;
      if (note && note.type === 'Note') {
        console.log(`📝 [${username}] 새 글 도착 / New post received from ${actorId}`);
        console.log(`내용/content: ${note.content?.slice(0, 100)}`);

        try {
          const postId = note.id || `remote-${Date.now()}-${Math.random()}`;
          const content = note.content || '';

          // author 컬럼 없으면 에러나니까 content에 작성자 포함해서 저장
          // If there's no author column, include the author in the content to avoid errors
          const fullContent = `[from: ${actorId}] ${content}`;

          db.prepare('INSERT OR IGNORE INTO posts (id, content) VALUES (?,?)')
           .run(postId, fullContent);

          // 만약 author 컬럼 추가했으면 이렇게:
          // db.prepare('INSERT OR IGNORE INTO posts (id, content, author) VALUES (?,?,?)')
          //.run(postId, content, actorId);

          console.log(`✅ [${username}] 글 저장 완료 / Post saved successfully : ${postId}`);
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
      db.prepare('INSERT OR IGNORE INTO followers (id, actor, inbox) VALUES (?,?,?)')
        .run(body.id, actorId, inboxUrl);
      console.log(`✅ [${username}] 팔로우 저장 / follow save : ${actorId}`);

      // Accept 비동기로 전송 (응답 빨리 주려고) / Send Accept asynchronously (to respond quickly)
      sendAccept(inboxUrl, body, username).catch(e => console.error('Accept 실패:', e));
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
    id: `https://yourhost.domain.org/users/${username}/inbox`,
    type: 'OrderedCollection', orderedItems: []
  }), { headers: { 'Content-Type': 'application/activity+json' } });
}