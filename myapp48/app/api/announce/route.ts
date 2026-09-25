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
    const isOwnPost = target.includes(`/users/${username}/`);
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
    const shortId = target.replace('/posts/', '/statuses/').split('?')[0].split('#')[0].split('/').filter(Boolean).pop() || target;

    const row = db.prepare(
      `SELECT id FROM announces WHERE username =? AND object LIKE '%' ||? || '%'`
    ).get(username, shortId) as any;

    if (!row) {
      const boostCount = (db.prepare(
        `SELECT COUNT(*) as c FROM announces WHERE object LIKE '%' ||? || '%'`
      ).get(shortId) as any).c;
      return NextResponse.json({ ok: true, alreadyUnboosted: true, isMyBoost: false, boostCount });
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