// app/api/timeline/route.ts
// myapp29 FINAL - shortId 오류 수정 ✅
import db from '@/lib/db';
import { NextResponse } from 'next/server';

// export const dynamic = 'force-dynamic';
// export const revalidate = 0;

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const username = searchParams.get('username') || 'user1';
  const DOMAIN = process.env.NEXT_PUBLIC_DOMAIN || 'aloy-horizon.duckdns.org';

  const myBoosts = db.prepare(`SELECT object FROM announces WHERE username =?`).all(username) as any[];
  const boostedSet = new Set(myBoosts.map(b => b.object));

  // 내 Like - actor 정확히 / Accurate actor for my Like
  const myActor = `https://${DOMAIN}/users/${username}`;
  const myLikes = db.prepare(`SELECT object FROM likes WHERE actor =?`).all(myActor) as any[];

  // shortId 추출 안전하게 / Extract shortId safely
  const getShortId = (url: string) => {
    if (!url) return '';
    try {
      const clean = url.split('?')[0].split('#')[0];
      const parts = clean.split('/').filter(Boolean);
      return parts[parts.length - 1] || clean;
    } catch { return url; }
  };

  const likedSet = new Set(myLikes.map((l: any) => getShortId(l.object as string)));

  const timeline = db.prepare(`
    SELECT id, content, username, username as actor, created_at, 'mine' as source, id as original_id
    FROM posts WHERE username =?
    UNION ALL
    SELECT id, content, username, actor, created_at, 'inbox' as source, original_id
    FROM inbox_posts WHERE username =?
    ORDER BY created_at DESC
    LIMIT 50
  `).all(username, username) as any[];

  const enriched = timeline.map((p: any) => {
    let fullId = p.original_id || p.id;
    if (!fullId.startsWith('http')) {
      fullId = `https://${DOMAIN}/users/${p.username}/statuses/${fullId}`;
    }
    fullId = fullId.replace('/posts/', '/statuses/');

    let fullOriginalId = p.original_id || p.id;
    if (fullOriginalId &&!fullOriginalId.startsWith('http')) {
      fullOriginalId = `https://${DOMAIN}/users/${p.username}/statuses/${fullOriginalId}`;
    }
    fullOriginalId = fullOriginalId.replace('/posts/', '/statuses/');

    // ✅ shortId 안전하게! / shortId safely!
    const shortId = getShortId(fullId);
    if (!shortId) {
      return {...p, fullId, isMyBoost: false, boostCount: 0, isMyLike: false, likeCount: 0 };
    }

    // 부스트 - 기존 유지 / Boost - keep existing
    const isMyBoost = boostedSet.has(p.original_id) ||
                      boostedSet.has(p.id) ||
                      boostedSet.has(fullId) ||
                      boostedSet.has(fullOriginalId);

    const boostCount = (db.prepare(
      `SELECT COUNT(*) as c FROM announces WHERE object =? OR object =? OR object =? OR object LIKE '%' ||? || '%'`
    ).get(fullId, p.original_id || '', p.id || '', shortId) as any)?.c || 0;

    // ✅ 좋아요 - shortId 기반 / Like - based on shortId
    const isMyLike = likedSet.has(shortId);

    const likeCount = (db.prepare(
      `SELECT COUNT(*) as c FROM likes WHERE object LIKE '%' ||? || '%'`
    ).get(shortId) as any)?.c || 0;

    return {
    ...p,
      fullId,
      isMyBoost,
      boostCount,
      isMyLike,
      likeCount
    };
  });

  return NextResponse.json(enriched, {
    headers: { 'Cache-Control': 'no-store' }
  });
}