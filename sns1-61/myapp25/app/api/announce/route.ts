// myapp24/app/api/announce/route.ts
// myapp24 ✅

import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { signedFetch, getActorData, sendAnnounce, sendUndoAnnounce } from '@/lib/ap';
const DOMAIN = process.env.DOMAIN || 'aloy-horizon.duckdns.org'; 

export async function POST(req: NextRequest) {
  try {
    const { username, target } = await req.json();
    if (!username || !target) {
      return NextResponse.json({ ok: false, error: 'username and target required' }, { status: 400 });
    }

    if (target.startsWith(`https://${DOMAIN}/users/${username}`)) {
      return NextResponse.json({ ok: false, error: 'cannot boost own post' }, { status: 400 });
    }

    let apObjectId: string = target;
    let inbox: string;

    try {
      const postRes = await signedFetch(target, username);
      if (postRes.ok) {
        const postData = await postRes.json();
        apObjectId = postData.id || target;
        const attributedTo = postData.attributedTo || postData.actor;
        const actorUrl = typeof attributedTo === 'string' ? attributedTo : attributedTo?.id;
        if (!actorUrl) throw new Error('no actor');
        const actorInfo = await getActorData(actorUrl, username);
        inbox = actorInfo.inbox;
      } else {
        const url = new URL(target);
        const parts = url.pathname.split('/');
        const usersIdx = parts.indexOf('users');
        if (usersIdx === -1) throw new Error('invalid target');
        const actorUrl = `${url.origin}${parts.slice(0, usersIdx + 2).join('/')}`;
        const actorInfo = await getActorData(actorUrl, username);
        inbox = actorInfo.inbox;
      }
    } catch (e) {
      return NextResponse.json({ ok: false, error: 'invalid target post id' }, { status: 400 });
    }

    const existing = db.prepare('SELECT id FROM announces WHERE object = ? AND username = ?').get(apObjectId, username) as any;
    if (existing) {
      return NextResponse.json({ ok: true, alreadyAnnounced: true, id: existing.id });
    }

    const result = await sendAnnounce(inbox, apObjectId, username);

    if (result.ok) {
      db.prepare('INSERT INTO announces (id, username, object) VALUES (?, ?, ?)').run(result.announceDoc.id, username, apObjectId);
    
      // ✅ myapp25 - 팔로워에게 부스트 배달 / Deliver Boosts to followers
      const followers = db.prepare('SELECT inbox, actor FROM followers WHERE username = ?').all(username) as any[];
      console.log(`📢 부스트 배달 시작: ${followers.length}명에게`);

      for (const f of followers) {
        try {
          // 팔로워 inbox에 Announce 그대로 전달 , ap.ts에 sendAnnounce 재사용
          // Deliver the Announce directly to followers' inboxes; reuse `sendAnnounce` in `ap.ts`.
          await sendAnnounce(f.inbox, apObjectId, username);
        } catch (e) {
          console.error(`배달 실패/Delivery failed -> ${f.actor}`, e);
        }
      }
      
    }

    return NextResponse.json({ ok: true, result });

  } catch (e: any) {
    console.error('[Announce POST]', e);
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { username, target } = await req.json();
    if (!username || !target) {
      return NextResponse.json({ ok: false, error: 'username and target required' }, { status: 400 });
    }

    let apObjectId: string = target;
    let inbox: string;

    try {
      const postRes = await signedFetch(target, username);
      if (postRes.ok) {
        const postData = await postRes.json();
        apObjectId = postData.id || target;
        const attributedTo = postData.attributedTo || postData.actor;
        const actorUrl = typeof attributedTo === 'string' ? attributedTo : attributedTo?.id;
        if (!actorUrl) throw new Error('no actor');
        const actorInfo = await getActorData(actorUrl, username);
        inbox = actorInfo.inbox;
      } else {
        const url = new URL(target);
        const parts = url.pathname.split('/');
        const usersIdx = parts.indexOf('users');
        if (usersIdx === -1) throw new Error('invalid target');
        const actorUrl = `${url.origin}${parts.slice(0, usersIdx + 2).join('/')}`;
        const actorInfo = await getActorData(actorUrl, username);
        inbox = actorInfo.inbox;
      }
    } catch (e) {
      return NextResponse.json({ ok: false, error: 'invalid target post id' }, { status: 400 });
    }

    const row = db.prepare('SELECT id FROM announces WHERE object = ? AND username = ?').get(apObjectId, username) as any;
    if (!row) {
      return NextResponse.json({ ok: true, alreadyUnAnnounced: true });
    }

    const result = await sendUndoAnnounce(inbox, row.id, apObjectId, username);
    db.prepare('DELETE FROM announces WHERE id = ?').run(row.id);

    return NextResponse.json({ ok: true, result });

  } catch (e: any) {
    console.error('[Announce DELETE]', e);
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}