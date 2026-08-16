// myapp14/app/api/follow/route.ts
import { sendFollow, signedFetch } from '@/lib/ap';

// myapp14 - Follow 보내기 API ✅
// POST /api/follow
export async function POST(req: Request) {
  try {
    const { username = 'user1', target } = await req.json();
    if (!target) return Response.json({ error: 'target 필요' }, { status: 400 });

    console.log(`➡️ 팔로우 시도 / Follow attempt: ${username} -> ${target}`);

    // 1. 상대방 inbox 찾기 - 서명된 GET으로! / Find the inbox with a signed GET request
    const actorRes = await signedFetch(target, username);
    
    if (!actorRes.ok) {
      const t = await actorRes.text();
      return Response.json({ error: `상대방 조회 실패 / Failed to look up the other party. ${actorRes.status}`, body: t }, { status: 400 });
    }

    const actor = await actorRes.json();
    const inbox = actor.inbox;
    console.log(`📬 inbox 찾음 / Found inbox: ${inbox}`);

    // 2. Follow 전송 / Send Follow
    const result = await sendFollow(inbox, target, username);

    return Response.json({ 
      ok: result.ok, 
      inbox, 
      target,
      result: result.text,
      follow: result.followDoc
    });

  } catch (e: any) {
    console.error('follow 에러 / Follow error:', e);
    return Response.json({ error: e.message }, { status: 500 });
  }
}