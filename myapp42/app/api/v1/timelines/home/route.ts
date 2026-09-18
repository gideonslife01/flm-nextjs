// app/api/v1/timelines/home/route.ts

import { NextResponse } from 'next/server';
import db from '@/lib/db';

const DOMAIN = process.env.DOMAIN || 'aloy-horizon.duckdns.org';
function parseDate(v: any): number {
  if (!v) return 0;
  if (/^\d{13}$/.test(String(v))) return parseInt(v);
  const d = new Date(v).getTime();
  return isNaN(d)? 0 : d;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const limit = parseInt(searchParams.get('limit') || '20');
  const username = 'user1';

  const myPosts = db.prepare(`SELECT * FROM posts WHERE username =?`).all(username) as any[];
  const inboxPosts = db.prepare(`SELECT * FROM inbox_posts WHERE username =?`).all(username) as any[];
  const allAnnounces = db.prepare(`SELECT * FROM announces WHERE username =?`).all(username) as any[];
  const allLikes = db.prepare(`SELECT * FROM likes WHERE username =?`).all(username) as any[];

  const announcesByObject = new Map<string, number>();
  const announcesList = new Map<string, any[]>(); // 디버그용!
  for (const a of allAnnounces) {
    const keys = [a.object, a.object.split('/').pop() || '', a.object.replace('/posts/','/statuses/')];
    for (const k of keys) {
      if (!k) continue;
      announcesByObject.set(k, (announcesByObject.get(k) || 0) + 1);
      if (!announcesList.has(k)) announcesList.set(k, []);
      announcesList.get(k)!.push(a);
    }
  }

  const likesByObject = new Map<string, number>();
  const likedSet = new Set<string>();
  for (const l of allLikes) {
    const keys = [l.object, l.object.split('/').pop() || ''];
    for (const k of keys) {
      if (!k) continue;
      likesByObject.set(k, (likesByObject.get(k) || 0) + 1);
      likedSet.add(k);
    }
    likedSet.add(l.object);
  }

  const allRows = [...myPosts,...inboxPosts];
  allRows.sort((a,b) => parseDate(b.created_at) - parseDate(a.created_at));

  const statuses = allRows.slice(0, limit).map((row: any) => {
    const isMy = myPosts.some(p => p.id === row.id);
    const originalId = row.original_id || row.id;
    const longId = isMy ? `https://${DOMAIN}/users/${username}/statuses/${row.id}` : originalId;
    const shortId = String(row.id).split('/').pop() || String(row.id);
    const short8 = shortId.substring(0,8);

    // ✅ myapp36-전체 검색 / Full search
    const reblogs_count = announcesByObject.get(longId) || announcesByObject.get(originalId) || announcesByObject.get(shortId) || announcesByObject.get(short8) || 0;
    const favourites_count = likesByObject.get(longId) || likesByObject.get(originalId) || likesByObject.get(shortId) || likesByObject.get(short8) || 0;
    
    const favourited = likedSet.has(longId) || likedSet.has(originalId) || likedSet.has(shortId) || likedSet.has(short8);
    const reblogged = reblogs_count > 0;

    let content = row.content || '';
    try { if (content.startsWith('{')) { const o = JSON.parse(content); content = o.object?.content || o.content || content; } } catch {}

    const baseAccount = isMy
     ? { id: '1', username, acct: `${username}@${DOMAIN}`, display_name: username, avatar: `https://${DOMAIN}/icon.png` }
      : (() => {
          let uname = 'user1', dom = 'freelifemakers.com', display = 'user1';
          if (row.actor?.includes('mastodon.social')) { uname = 'freelifemakers'; dom = 'mastodon.social'; display = 'freelifemakers'; }
          return { id: `remote_${dom.replace(/\./g,'_')}_${uname}`, username: uname, acct: `${uname}@${dom}`, display_name: display, avatar: `https://${DOMAIN}/icon.png` };
        })();

    return {
      id: String(row.id),
      uri: longId,
      url: longId,
      account: baseAccount,
      content: content.startsWith('<')? content : `<p>${content}</p>`,
      created_at: new Date(parseDate(row.created_at)).toISOString(),
      visibility: 'public',
      reblogs_count,      // 전체 부스트 카운트 / Full boost count
      favourites_count,   // 전체 좋아요 카운트 / Full like count 
      replies_count: 0,
      favourited: !!favourited, // 전체 좋아요 / Full like
      reblogged: !!reblogged,   // 전체 부스트 / Full Boost
      muted: false, bookmarked: false, pinned: false,
    };
  });

  return NextResponse.json(statuses, { headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' } });
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type, Authorization' } });
}