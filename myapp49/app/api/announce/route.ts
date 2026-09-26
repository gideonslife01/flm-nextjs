// app/api/announce/route.ts 
export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { getActorData, sendAnnounce, sendUndoAnnounce, signedFetch } from '@/lib/ap';

const DOMAIN = process.env.DOMAIN || 'aloy-horizon.duckdns.org';

export async function POST(req: NextRequest) {
  try {
    const { username, target } = await req.json();
    const myActor = `https://${DOMAIN}/users/${username}`;
    let apObjectId = target.replace('/posts/', '/statuses/');
    const isOwnPost = target.includes(`${DOMAIN}//users/${username}/`); // ✅ myapp48 도메인추가  / Add DOMAIN
    let inbox: string | null = null;

    if (!isOwnPost) {
      try {
        const pr = await signedFetch(target, username);
        if (pr.ok) {
          const d = await pr.json();
          apObjectId = (d.id || target).replace('/posts/', '/statuses/');
          const info = await getActorData((d.attributedTo || d.actor) as any, username);
          inbox = info.inbox;
        }
      } catch {}
    }

    const shortId = apObjectId.split('?')[0].split('#')[0].split('/').filter(Boolean).pop() || apObjectId;

    // ✅ 내 부스트 이미 있으면 중복 방지 / Prevent duplicate if I already boosted
    const existing = db.prepare(
      `SELECT id FROM announces WHERE username =? AND object LIKE '%' ||? || '%'`
    ).get(username, shortId) as any;

    if (existing) {
      const boostCount = (db.prepare(
        `SELECT COUNT(*) as c FROM announces WHERE object LIKE '%' ||? || '%'`
      ).get(shortId) as any).c;
      return NextResponse.json({ ok: true, alreadyBoosted: true, isMyBoost: true, boostCount });
    }
   // 부스트 배달 / Boost Delivery
    let announceDoc;
    if (isOwnPost) {
      announceDoc = { id: `${myActor}/announces/${crypto.randomUUID()}`, actor: myActor, object: apObjectId };
    } else {
      if (!inbox) return NextResponse.json({ ok: false, error: 'no inbox' }, { status: 400 });
      const r = await sendAnnounce(inbox, apObjectId, username);
      announceDoc = r.announceDoc;
    }

    db.prepare('INSERT OR IGNORE INTO announces (id, actor, object, username) VALUES (?,?,?,?)')
     .run(announceDoc.id, myActor, announceDoc.object.replace('/posts/', '/statuses/'), username);

    const boostCount = (db.prepare(
      `SELECT COUNT(*) as c FROM announces WHERE object LIKE '%' ||? || '%'`
    ).get(shortId) as any).c;

    return NextResponse.json({ ok: true, isMyBoost: true, boostCount });

  } catch (e: any) {
    console.error('[Boost POST]', e);
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { username, target } = await req.json();
    const myActor = `https://${DOMAIN}/users/${username}`;
    const shortId = target.replace('/posts/', '/statuses/').split('?')[0].split('#')[0].split('/').filter(Boolean).pop() || target;

    const row = db.prepare(
      `SELECT id, object, actor FROM announces WHERE username =? AND object LIKE '%' ||? || '%'`
    ).get(username, shortId) as any;

    if (!row) {
      const boostCount = (db.prepare(
        `SELECT COUNT(*) as c FROM announces WHERE object LIKE '%' ||? || '%'`
      ).get(shortId) as any).c;
      return NextResponse.json({ ok: true, alreadyUnboosted: true, isMyBoost: false, boostCount });
    }

    // 부스트 취소 배달 / Undo Boost Delivery
    const objectForCheck = row.object || target;
    const isOwnPost = objectForCheck.includes(`${DOMAIN}/users/${username}/`);

    if (!isOwnPost) {
      try {
        const u = new URL(objectForCheck);
        const parts = u.pathname.split('/').filter(Boolean);
        const idx = parts.indexOf('users');
        const inbox = idx!== -1? `${u.origin}/users/${parts[idx+1]}/inbox` : null;
        if (inbox) {
          await sendUndoAnnounce(inbox, row.id, objectForCheck, username);
        }
      } catch (e) {
        console.error('Undo Announce 배달 실패', e);
      }
    }

    db.prepare('DELETE FROM announces WHERE id =?').run(row.id);

    const boostCount = (db.prepare(
      `SELECT COUNT(*) as c FROM announces WHERE object LIKE '%' ||? || '%'`
    ).get(shortId) as any).c;

    return NextResponse.json({ ok: true, isMyBoost: false, boostCount });

  } catch (e: any) {
    console.error('[Boost DELETE]', e);
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}