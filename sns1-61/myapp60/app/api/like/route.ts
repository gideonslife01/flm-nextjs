// app/api/like/route.ts
// ✅ myapp49
export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { getActorData, sendLike,sendUndoLike ,signedFetch } from '@/lib/ap';
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


export async function POST(req: NextRequest) {
  //const { username, target } = await req.json();
  // ✅ myapp53 - 좋아요 보안강화 / like Security Enhancement
  //const { username, target } = await req.json();
  const authUser = getUser(req);
  if (!authUser) {
    return NextResponse.json({ error: '로그인 필요 / authentication required' }, { status: 401 });
  }
  const { target } = await req.json();
  const username = authUser;

  const myActor = `https://${DOMAIN}/users/${username}`;
  let apObjectId = target.replace('/posts/', '/statuses/');
  const isOwnPost = target.includes(`${DOMAIN}/users/${username}/`); // ✅ myapp49 도메인추가 / add DOMAIN
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

  // ✅ myapp53 - 좋아요 보안강화 / like Security Enhancement
  //const { username, target } = await req.json();
  const authUser = getUser(req);
  if (!authUser) {
    return NextResponse.json({ error: '로그인 필요 / authentication required' }, { status: 401 });
  }
  const { target } = await req.json();
  const username = authUser;

  const myActor = `https://${DOMAIN}/users/${username}`;
  const shortId = target.replace('/posts/', '/statuses/').split('/').pop()!.split('?')[0];

  const likeRow = db.prepare(`SELECT id, object FROM likes WHERE actor =? AND object LIKE '%' ||? || '%'`).get(myActor, shortId) as any;

  if (!likeRow) {
    const likeCount = (db.prepare(`SELECT COUNT(*) as c FROM likes WHERE object LIKE '%' ||? || '%'`).get(shortId) as any).c;
    return NextResponse.json({ ok: true, alreadyUnliked: true, isMyLike: false, likeCount });
  }

  const objectForCheck = likeRow.object || target;

  const isOwnPost = objectForCheck.includes(`${DOMAIN}/users/${username}/`);

 // ✅ myapp49 - 좋아요 배달 / Send a Like
  if (!isOwnPost) {
    try {
      const u = new URL(objectForCheck);
      const parts = u.pathname.split('/').filter(Boolean);
      const idx = parts.indexOf('users');
      const inbox = idx!== -1? `${u.origin}/users/${parts[idx+1]}/inbox` : null;
      if (inbox) {
        await sendUndoLike(inbox, likeRow.id, objectForCheck, username);
      }
    } catch (e) {
      console.error('Undo Like 배달 실패', e);
    }
  }

  db.prepare('DELETE FROM likes WHERE id =?').run(likeRow.id);
  const likeCount = (db.prepare(`SELECT COUNT(*) as c FROM likes WHERE object LIKE '%' ||? || '%'`).get(shortId) as any).c;
  return NextResponse.json({ ok: true, isMyLike: false, likeCount });
}