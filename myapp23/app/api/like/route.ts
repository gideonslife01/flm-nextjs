// app/api/like/route.ts
// myapp23 ✅ - Like / Undo Like

import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { getActorData, sendLike, sendUndoLike, signedFetch } from '@/lib/ap';

export async function POST(req: NextRequest) {
  try {
    const { username, target } = await req.json();
    if (!username || !target) {
      return NextResponse.json({ ok: false, error: 'username and target required' }, { status: 400 });
    }

    let inbox: string;
    let apObjectId: string = target;

    try {
      const postRes = await signedFetch(target, username);
      if (postRes.ok) {
        const postData = await postRes.json();
        apObjectId = postData.id || target;
        const attributedTo = postData.attributedTo || postData.actor;
        const actorUrl = typeof attributedTo === 'string' ? attributedTo : attributedTo?.id;
        if (!actorUrl) throw new Error('no actor in post');
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
      console.error(e);
      return NextResponse.json({ ok: false, error: 'invalid target post id' }, { status: 400 });
    }

    // 중복 체크는 apObjectId로 해야 함 (Mastodon 대응)
    const existing = db.prepare('SELECT id FROM likes WHERE object = ? AND username = ?').get(apObjectId, username) as any;
    if (existing) {
      return NextResponse.json({ ok: true, alreadyLiked: true, id: existing.id });
    }

    const result = await sendLike(inbox, apObjectId, username);

    db.prepare('INSERT OR IGNORE INTO likes (id, actor, object, username) VALUES (?,?,?,?)')
      .run(result.likeDoc.id, result.likeDoc.actor, result.likeDoc.object, username);

    return NextResponse.json({ ok: true, result });

  } catch (e: any) {
    console.error('[Like POST]', e);
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

    const likeRow = db.prepare('SELECT id FROM likes WHERE object = ? AND username = ?').get(apObjectId, username) as any;
    if (!likeRow) {
      return NextResponse.json({ ok: true, alreadyUnliked: true });
    }

    const result = await sendUndoLike(inbox, likeRow.id, apObjectId, username);

    db.prepare('DELETE FROM likes WHERE id = ?').run(likeRow.id);

    return NextResponse.json({ ok: true, result });

  } catch (e: any) {
    console.error('[Like DELETE]', e);
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}