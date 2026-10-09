// ✅ myapp41/app/api/follow/route.ts
// 로컬,리모트 분리적용,followers,folowing테이블 모두관리

import { sendFollow, signedFetch } from '@/lib/ap';
import db from '@/lib/db';
import { getUsernameFromRequest } from '@/lib/auth';

const DOMAIN = process.env.DOMAIN || 'aloy-horizon.duckdns.org';

function isLocalTarget(target: string): string | null {
  // target이 user2, https://aloy-horizon.duckdns.org/users/user2, @user2@domain 등
  if (!target) return null;
  if (target.includes(DOMAIN)) {
    // https://aloy-horizon.duckdns.org/users/user2 -> user2
    const m = target.match(/\/users\/([^\/\?]+)/);
    return m? m[1] : null;
  }
  if (!target.includes('://') &&!target.includes('@')) {
    // user2
    return target;
  }
  return null; // 리모트!
}

// function getFollowersCount(username: string) {
//   try {
//     const row = db.prepare('SELECT COUNT(*) as cnt FROM followers WHERE username=?').get(username) as any;
//     return row?.cnt || 0;
//   } catch { return 0; }
// }

// 팔로우 API / follow API
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const bodyUsername = body.username;
    const target = body.target;

    if (!target) return Response.json({ error: 'target 필요' }, { status: 400 });

    // ✅ 보안: 토큰에서 me 꺼내기! body username은 폴백
    // Security: Extract 'me' from token! body username is fallback
    const meFromToken = getUsernameFromRequest(req);
    const username = meFromToken || bodyUsername;

    if (!username) return Response.json({ error: '로그인 필요 / unauthorized' }, { status: 401 });

    const localUser = db.prepare('SELECT username FROM users WHERE username=?').get(username) as any;
    if (!localUser) return Response.json({ error: `유저 없음: ${username}` }, { status: 404 });

    const localTarget = isLocalTarget(target);
    console.log(`➡ 팔로우 시도: ${username} -> ${target} (localTarget=${localTarget})`);

    // 이미 팔로잉 중이면 스킵 / Skip if already following.
    const already = db.prepare('SELECT id FROM following WHERE username=? AND (actor=? OR actor LIKE?)').get(username, target, `%/users/${localTarget || target}%`) as any;
    if (already) {
      console.log(`ℹ 이미 팔로잉 중 / Already following: ${username} -> ${target}`);
      return Response.json({ ok: true, alreadyFollowing: true, target, username });
    }

    // ===== 1. 로컬 팔로우 / Local Follow =====
    if (localTarget) {
      if (localTarget === username) return Response.json({ error: '자기 자신 팔로우 불가' }, { status: 400 });

      const targetExists = db.prepare('SELECT username FROM users WHERE username=?').get(localTarget) as any;
      if (!targetExists) return Response.json({ error: `로컬 유저 없음: ${localTarget}` }, { status: 404 });

      const targetActor = `https://${DOMAIN}/users/${localTarget}`;
      const myActor = `https://${DOMAIN}/users/${username}`;
      const id = `${username}-${localTarget}-${Date.now()}`;

      // following: 내가 팔로우하는 목록
      // Following: The list of people I follow
      try {
        db.prepare(`INSERT OR IGNORE INTO following (id, actor, inbox, username) VALUES (?,?,?,?)`)
         .run(id, targetActor, `${targetActor}/inbox`, username);
      } catch {
        // 구 스키마 호환 (inbox 컬럼 없는 버전)
        // Legacy schema compatibility (version without the 'inbox' column)
        db.prepare(`INSERT OR IGNORE INTO following (id, actor, username) VALUES (?,?,?)`)
         .run(id, targetActor, username);
      }

      // followers: 상대방의 팔로워 목록
      // followers: The other party's list of followers
      try {
        db.prepare(`INSERT OR IGNORE INTO followers (id, actor, inbox, username) VALUES (?,?,?,?)`)
         .run(`${localTarget}-${username}-${Date.now()}`, myActor, `${myActor}/inbox`, localTarget);
      } catch {
        db.prepare(`INSERT OR IGNORE INTO followers (id, actor, username) VALUES (?,?,?)`)
         .run(`${localTarget}-${username}-${Date.now()}`, myActor, localTarget);
      }

      console.log(`✅ 로컬 팔로우 DB 저장 / Save local follow data to the database : ${username} -> ${localTarget}`);
      return Response.json({ ok: true, target, username, local: true });
    }

    // ===== 2. 리모트 팔로우 / Remote Follow =====
    const actorRes = await signedFetch(target, username);
    if (!actorRes.ok) {
      const t = await actorRes.text();
      return Response.json({ error: `상대방 조회 실패 ${actorRes.status}`, body: t }, { status: 400 });
    }
    const actor = await actorRes.json();
    const inbox = actor.inbox;
    console.log(`📬 리모트 / remote inbox: ${inbox}`);

    const result = await sendFollow(inbox, target, username);

    if (result.ok) {
      try {
        db.prepare('INSERT OR IGNORE INTO following (id, actor, username) VALUES (?,?,?)')
         .run(result.followDoc.id, target, username);
      } catch {
        db.prepare('INSERT OR IGNORE INTO following (id, actor, inbox, username) VALUES (?,?,?,?)')
         .run(result.followDoc.id, target, inbox, username);
      }
      console.log(`✅ 리모트 팔로우 DB 저장/Save Remote Follow to DB: ${username} -> ${target}`);
    }

    return Response.json({ ok: result.ok, inbox, target, username, result: result.text });

  } catch (e: any) {
    console.error('follow 에러/Error:', e);
    return Response.json({ error: e.message }, { status: 500 });
  }
}

// 언팔로우 / Unfollow
export async function DELETE(req: Request) {
  try {
    const body = await req.json();
    const bodyUsername = body.username;
    const target = body.target;
    if (!target) return Response.json({ error: 'target 필요/need' }, { status: 400 });

    const meFromToken = getUsernameFromRequest(req);
    const username = meFromToken || bodyUsername;
    if (!username) return Response.json({ error: 'unauthorized' }, { status: 401 });

    const localTarget = isLocalTarget(target);
    console.log(`➡ 언팔로우 시도: ${username} -X-> ${target} (localTarget=${localTarget})`);

    if (localTarget) {
      // 로컬은 DB에서만 삭제 / Delete from the database only (local).
      db.prepare(`DELETE FROM following WHERE username=? AND (actor LIKE? OR actor=?)`).run(username, `%/users/${localTarget}%`, localTarget);
      db.prepare(`DELETE FROM followers WHERE username=? AND (actor LIKE? OR actor=?)`).run(localTarget, `%/users/${username}%`, username);
      console.log(`🗑 로컬 언팔로우: ${username} -X-> ${localTarget}`);
      return Response.json({ ok: true, local: true });
    }

    // 리모트 언팔로우 / remote unfollow
    const exists = db.prepare('SELECT id FROM following WHERE username=? AND (actor=? OR actor LIKE?)').get(username, target, `%${target}%`) as any;
    if (!exists) {
      console.log(`ℹ 팔로잉 중 아님 - 스킵/Not following - Skip: ${username} -X-> ${target}`);
      return Response.json({ ok: true, alreadyNotFollowing: true });
    }

    const { sendUndoFollow } = await import('@/lib/ap');
    const result = await sendUndoFollow(target, username);

    db.prepare('DELETE FROM following WHERE username=? AND (actor=? OR actor LIKE?)').run(username, target, `%${target}%`);

    console.log(`🗑 리모트 언팔로우/remote unfollow: ${username} -X-> ${target}`);
    return Response.json({ ok: true, result });

  } catch (e: any) {
    console.error('unfollow 에러/error:', e);
    return Response.json({ error: e.message }, { status: 500 });
  }
}