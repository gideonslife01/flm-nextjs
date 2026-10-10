// ✅ myapp60 - for pinafore - unfavourite

export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { getActorData, sendUndoLike, signedFetch } from '@/lib/ap';
const DOMAIN = process.env.DOMAIN || 'aloy-horizon.duckdns.org';

function getUser(req: Request) {
  const auth = req.headers.get('Authorization')?.replace('Bearer ','').trim();
  if (auth) {
    const o = db.prepare('SELECT username FROM oauth_tokens WHERE access_token=?').get(auth) as any;
    if (o?.username) return o.username;
  }
  const cookie = req.headers.get('cookie') || '';
  const m = cookie.match(/refresh_token=([^;]+)/);
  if (m) {
    const s = db.prepare('SELECT username FROM sessions WHERE refresh_token=?').get(m[1]) as any;
    if (s?.username) return s.username;
  }
  return null;
}

export async function POST(req: NextRequest, { params }: { params: Promise<{id: string}> }) {
  const authUser = getUser(req);
  if (!authUser) return NextResponse.json({ error: 'Unauthorize' }, { status: 401 });
  const username = authUser;
  const { id } = await params;

  let target = id;
  let post: any = db.prepare(`SELECT * FROM posts WHERE id=?`).get(id) as any;
  if (post) {
    target = `https://${DOMAIN}/users/${post.username}/statuses/${post.id}`;
  } else {
    post = db.prepare(`SELECT * FROM inbox_posts WHERE id=? OR original_id=? OR original_id LIKE '%' ||?|| '%'`).get(id, id, id) as any;
    if (post?.original_id) target = post.original_id;
    else target = id.startsWith('http')? id : `https://${DOMAIN}/users/${username}/statuses/${id}`;
  }

  const myActor = `https://${DOMAIN}/users/${username}`;
  let apObjectId = target.replace('/posts/', '/statuses/');
  let inbox: string | null = null;
  const isOwn = apObjectId.includes(`${DOMAIN}/users/${username}/`);

  if (!isOwn) {
    try {
      const pr = await signedFetch(apObjectId, username);
      if (pr.ok) {
        const d = await pr.json();
        apObjectId = (d.id || apObjectId).replace('/posts/', '/statuses/');
        const info = await getActorData((d.attributedTo || d.actor) as any, username);
        inbox = info.inbox;
      }
    } catch {}
  }

  const shortId = apObjectId.split('/').pop()!.split('?')[0].split('#')[0];
  const likeRow = db.prepare(`SELECT id, object FROM likes WHERE actor=? AND object LIKE '%' ||?|| '%'`).get(myActor, shortId) as any;

  if (likeRow &&!isOwn && inbox) {
    try {
      await sendUndoLike(inbox, likeRow.id, likeRow.object, username);
      console.log(`💔 [${username}] Undo Like 전송 -> ${inbox}`);
    } catch (e: any) {
      console.log(`⚠ Undo Like 실패, 로컬만 삭제: ${e.message}`);
    }
  }

  if (likeRow) {
    db.prepare(`DELETE FROM likes WHERE id=?`).run(likeRow.id);
  } else {
    // id로 직접 매칭 안되면 shortId LIKE로 한번 더 삭제
    // If direct matching by ID fails, perform an additional deletion using `shortId LIKE`.
    db.prepare(`DELETE FROM likes WHERE actor=? AND object LIKE '%' ||?|| '%'`).run(myActor, shortId);
  }

  const c = (db.prepare(`SELECT COUNT(*) as c FROM likes WHERE object LIKE '%' ||?|| '%'`).get(shortId) as any).c;
 console.log(`💔 v1-unfavourite`);
  return NextResponse.json({
    id: id,
    favourited: false,
    favourites_count: c,
    reblogged: false,
  });
}