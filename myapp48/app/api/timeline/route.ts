// app/api/timeline/route.ts
// myapp29  - shortId 오류 수정 ✅
// + myapp45 - isMine/isBoostedPost 추가 ✅

import db from '@/lib/db';
import { NextResponse } from 'next/server';

// export const dynamic = 'force-dynamic';
// export const revalidate = 0;

// ✅ myapp48 
import { getViewerFromRequest, canSee } from '@/lib/visibility';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const username = searchParams.get('username') || 'user1';
  const DOMAIN = process.env.NEXT_PUBLIC_DOMAIN || 'aloy-horizon.duckdns.org';

  // ✅ myapp48
  const viewer = getViewerFromRequest(req);
  const isOwnerView = viewer && viewer === username;

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


  // ✅ myapp48 - visibility 컬럼 추가 조회 ( visibility 검색)
  const rawTimeline = db.prepare(`
    SELECT id, content, username, username as actor, created_at, visibility, 'mine' as source, id as original_id
    FROM posts WHERE username =?
    UNION ALL
    SELECT id, content, username, actor, created_at, visibility, 'inbox' as source, original_id
    FROM inbox_posts WHERE username =?
    ORDER BY created_at DESC
    LIMIT 80
  `).all(username, username) as any[];

  // ✅ myapp48 - visibility 필터링 로직 추가
  // public: 누구나 / unlisted: 로그인 필요 / private: 본인 + 팔로워만
  const timeline = rawTimeline.filter((p: any) => {
    // 내 타임라인을 내가 보는 경우 -> 전부 보여줌 (private 포함)
    if (isOwnerView) return true;
    // 남의 타임라인을 보거나 게스트인 경우 -> canSee로 필터
    return canSee(viewer, p);
  });

  // -- previous code
  // const timeline = db.prepare(`
  //   SELECT id, content, username, username as actor, created_at, 'mine' as source, id as original_id
  //   FROM posts WHERE username =?
  //   UNION ALL
  //   SELECT id, content, username, actor, created_at, 'inbox' as source, original_id
  //   FROM inbox_posts WHERE username =?
  //   ORDER BY created_at DESC
  //   LIMIT 50
  // `).all(username, username) as any[];

  const enriched = timeline.map((p: any) => {
    
    // ✅ myapp45 - 다른 사랆이 부스트한 글 체크 추가 / Added a check for posts boosted by others.
    // - inbox_posts 테이블 검색인 경우 / In the case of a search on the `inbox_posts` table
    const isBoostedPost = p.source === 'inbox' && !!p.original_id && p.original_id !== p.id;

    // - posts 테이블 검색인 경우 / In the case of a search on the `posts` table
    const isMine = p.source === 'mine';

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
      likeCount,
      isBoostedPost, // inbox_posts 중 부스트인지 확인 / Check if the inbox_posts item is a boost.
      isMine, // 내가 쓴 글만 삭제 가능 / You can only delete posts you have written.
    };
  });

  return NextResponse.json(enriched, {
    headers: { 'Cache-Control': 'no-store' }
  });
}

