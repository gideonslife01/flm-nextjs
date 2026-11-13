//  myapp17/app/api/follow/route.ts 
import { sendFollow, signedFetch } from '@/lib/ap';
import db from '@/lib/db'; 

// 팔로우 API / Follow API
export async function POST(req: Request) {
  try {
    const { username, target } = await req.json();
    
    // 1. username 검증 - DB에 있는 유저만! / Validate username - only users in the DB!
    if (!username) return Response.json({ error: 'username 필요 / username required' }, { status: 400 });
    if (!target) return Response.json({ error: 'target 필요 / target required' }, { status: 400 });

    const localUser = db.prepare('SELECT username FROM users WHERE username = ?').get(username) as any;
    if (!localUser) {
      return Response.json({ error: `유저 없음 / User not found: ${username}` }, { status: 404 });
    }

    // myapp21 ✅
    // 이미 팔로잉 중이면 네트워크 요청을 보내지 않음
    // Do not send a network request if already following
    const already = db.prepare('SELECT id FROM following WHERE actor = ? AND username = ?').get(target, username) as any;
    if (already) {
      console.log(`ℹ️ [${username}] 이미 팔로잉 중 / Already following - 요청 스킵 / Skip request: ${target}`);
      return Response.json({ 
        ok: true, 
        alreadyFollowing: true, 
        target, 
        username,
        message: '이미 팔로잉 중 / Already following'
      });
    }

    console.log(`➡ 팔로우 시도 / Follow attempt: ${username} -> ${target}`);

    // 2. 상대방 inbox 찾기 (서명된 GET) / Find the other party's inbox (signed GET)
    const actorRes = await signedFetch(target, username);
    
    if (!actorRes.ok) {
      const t = await actorRes.text();
      return Response.json({ error: `상대방 조회 실패 ${actorRes.status}`, body: t }, { status: 400 });
    }

    const actor = await actorRes.json();
    const inbox = actor.inbox;
    console.log(`📬 inbox 찾음: ${inbox}`);

    // 3. Follow 전송 / Send Follow
    const result = await sendFollow(inbox, target, username);

    // myapp17✅ 
    //  4.성공하면 following 테이블에 저장! / If successful, save to the following table!

    // if (result.ok) {
    //   try {
    //     db.prepare('INSERT OR IGNORE INTO following (id, actor, username) VALUES (?, ?, ?)')
    //       .run(result.followDoc.id, target, username);
    //     console.log(`✅ following DB 저장 / If successful, save to the following table!: ${username} -> ${target}`);
    //   } catch (e) {
    //     console.error('DB 저장 실패 / DB save failed:', e);
    //   }
    // }
    
    // myapp21 ✅ 
    // 데이터베이스에 중복 입력 방지 / Preventing duplicate entries in the database
    if (result.ok) {
      try {
        db.prepare('INSERT INTO following (id, actor, username) VALUES (?, ?, ?)')
          .run(result.followDoc.id, target, username);
        console.log(`✅ DB 저장 / DB Save: ${username} -> ${target}`);
      } catch (e: any) {
        if (e.code === 'SQLITE_CONSTRAINT_UNIQUE') {
          console.log(`ℹ️ 이미 저장됨  / Already saved: ${target}`);
        } else {
          console.error('DB 저장 실패 / DB save failed:', e);
        }
      }
    }

    return Response.json({ 
      ok: result.ok, 
      inbox, 
      target,
      username, // ← 누가 팔로우했는지 확인 / who followed
      result: result.text,
      follow: result.followDoc
    });

  } catch (e: any) {
    console.error('follow 에러 / Follow error:', e);
    return Response.json({ error: e.message }, { status: 500 });
  }
}

// ✅ myapp17
// 언팔로우 추가 / Unfollow added
export async function DELETE(req: Request) {
  try {
    const { username, target } = await req.json();
    if (!username || !target) return Response.json({ error: 'username, target 필요 / Username and target required' }, { status: 400 });

    //const DOMAIN = process.env.DOMAIN || 'aloy-horizon.duckdns.org';


    // ✅ myapp21 - 언팔로우 중복 체크 / 
    const exists = db.prepare('SELECT id FROM following WHERE actor = ? AND username = ?').get(target, username) as any;
    if (!exists) {
      console.log(`ℹ️ [${username}] 팔로잉 중 아님 / Not Following - 언팔 스킵 /  Skip Unfollowing: ${target}`);
      return Response.json({ ok: true, alreadyNotFollowing: true, message: '이미 언팔 상태 / Already unfollowed.' });
    }
    
    // Undo Follow 만들기 (sendFollow 참고해서) / Create Undo Follow (refer to sendFollow)
    const { sendUndoFollow } = await import('@/lib/ap');
    const result = await sendUndoFollow(target, username);

    // DB에서 삭제 / Delete from DB
    db.prepare('DELETE FROM following WHERE actor = ? AND username = ?').run(target, username);
    console.log(`🗑️ following 삭제 / Delete from DB: ${username} -X-> ${target}`);

    return Response.json({ ok: true, result });
  } catch (e: any) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}