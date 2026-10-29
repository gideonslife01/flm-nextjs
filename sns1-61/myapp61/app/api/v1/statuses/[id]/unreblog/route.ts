// ✅ myapp60 - for pinafore - unreblog

export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { getActorData, sendUndoAnnounce, signedFetch } from '@/lib/ap';
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
  if (post) target = `https://${DOMAIN}/users/${post.username}/statuses/${post.id}`;
  else {
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
  const row = db.prepare(`SELECT id, object FROM announces WHERE username=? AND object LIKE '%' ||?|| '%'`).get(username, shortId) as any;

  if (row &&!isOwn && inbox) {
    try {
      await sendUndoAnnounce(inbox, row.id, row.object, username);
      console.log(`↩ [${username}] Undo Announce -> ${inbox}`);
    } catch (e: any) {
      console.log(`⚠ Undo Announce 실패: ${e.message}`);
    }
  }

  if (row) db.prepare(`DELETE FROM announces WHERE id=?`).run(row.id);
  else db.prepare(`DELETE FROM announces WHERE username=? AND object LIKE '%' ||?|| '%'`).run(username, shortId);

  const c = (db.prepare(`SELECT COUNT(*) as c FROM announces WHERE object LIKE '%' ||?|| '%'`).get(shortId) as any).c;

  console.log(`🔃 v1-unboost(unreblog)`);
  
  return NextResponse.json({
    id: id,
    reblogged: false,
    reblogs_count: c,
  });
}