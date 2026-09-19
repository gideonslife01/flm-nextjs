export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { getActorData, sendLike, signedFetch } from '@/lib/ap';
const DOMAIN = process.env.DOMAIN || 'aloy-horizon.duckdns.org';

export async function POST(req: NextRequest) {
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

  const shortId = apObjectId.split('/').pop()!.split('?')[0];

  // ✅ DB 체크: 내가 이미 눌렀으면 1 더하지 않음! / DB check: If I already liked, do not add 1!
  const existing = db.prepare(`SELECT id FROM likes WHERE actor =? AND object LIKE '%' ||? || '%'`).get(myActor, shortId) as any;
  if (existing) {
    const likeCount = (db.prepare(`SELECT COUNT(*) as c FROM likes WHERE object LIKE '%' ||? || '%'`).get(shortId) as any).c;
    return NextResponse.json({ ok: true, alreadyLiked: true, isMyLike: true, likeCount });
  }

  const likeDoc = isOwnPost
   ? { id: `${myActor}/likes/${crypto.randomUUID()}`, actor: myActor, object: apObjectId }
    : (await sendLike(inbox!, apObjectId, username)).likeDoc;

  db.prepare('INSERT OR IGNORE INTO likes (id, actor, object, username) VALUES (?,?,?,?)')
   .run(likeDoc.id, myActor, likeDoc.object.replace('/posts/', '/statuses/'), username);

  const likeCount = (db.prepare(`SELECT COUNT(*) as c FROM likes WHERE object LIKE '%' ||? || '%'`).get(shortId) as any).c;
  return NextResponse.json({ ok: true, isMyLike: true, likeCount });
}

export async function DELETE(req: NextRequest) {
  const { username, target } = await req.json();
  const myActor = `https://${DOMAIN}/users/${username}`;
  const shortId = target.replace('/posts/', '/statuses/').split('/').pop()!.split('?')[0];

  const likeRow = db.prepare(`SELECT id FROM likes WHERE actor =? AND object LIKE '%' ||? || '%'`).get(myActor, shortId) as any;
  if (!likeRow) {
    const likeCount = (db.prepare(`SELECT COUNT(*) as c FROM likes WHERE object LIKE '%' ||? || '%'`).get(shortId) as any).c;
    return NextResponse.json({ ok: true, alreadyUnliked: true, isMyLike: false, likeCount });
  }

  db.prepare('DELETE FROM likes WHERE id =?').run(likeRow.id);
  const likeCount = (db.prepare(`SELECT COUNT(*) as c FROM likes WHERE object LIKE '%' ||? || '%'`).get(shortId) as any).c;
  return NextResponse.json({ ok: true, isMyLike: false, likeCount });
}