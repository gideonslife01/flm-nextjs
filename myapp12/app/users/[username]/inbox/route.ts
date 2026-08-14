import db from '@/lib/db';
import { sendAccept } from '@/lib/ap';

export async function POST(req: Request, { params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  try {
    const body = await req.json();
    console.log(`📩 [${username}] INBOX:`, body.type, body.actor);

    // 상대방 public키로 검증, 테스트 부분이라 제외 시킴
    // Verification using the other party's public key—excluded as it is part of the testing phase.
    // const actorUrl = body.actor;
    // const actorData = await fetch(actorUrl, {
    //   headers: { Accept: 'application/activity+json' }
    // }).then(r => r.json());
    
    // const publicKeyPem = actorData.publicKey.publicKeyPem;
    // const isValid = verify(req, publicKeyPem); 

    // if (!isValid) return Response.json({}, { status: 401 });

    const actorId = typeof body.actor === 'string' ? body.actor : body.actor?.id;
    const actorInbox = typeof body.actor === 'object' ? body.actor?.inbox : null;

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