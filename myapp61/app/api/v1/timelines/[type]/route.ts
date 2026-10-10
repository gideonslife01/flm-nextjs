// app/api/v1/timelines/[type]/route.ts
// ✅ myapp59 + myapp60
// - 커서 페이지네이션 / CursonPagination

import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { getViewerFromRequest, canSee } from '@/lib/visibility';

const DOMAIN = process.env.DOMAIN || 'aloy-horizon.duckdns.org';
function parseDate(v: any): number {
  if (!v) return 0;
  if (/^\d{13}$/.test(String(v))) return parseInt(v);
  const d = new Date(v).getTime();
  return isNaN(d) ? 0 : d;
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ type: string }> }) {
  const { type } = await params; // ✅ 이렇게 await
  const { searchParams } = new URL(req.url);
  const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 40);
  const max_id = searchParams.get('max_id');
  const isLocal = searchParams.get('local') === 'true';

  const viewer = getViewerFromRequest(req as any);

  if (type === 'home' && !viewer) {
    return NextResponse.json([], { headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' } });
  }

  // ✅ 공통 데이터 수집 / Common Data Collection
  let filteredRows: any[] = [];

  if (type === 'home') {
    const myPosts = db.prepare(`SELECT * FROM posts WHERE username =?`).all(viewer) as any[];
    const inboxPosts = db.prepare(`SELECT * FROM inbox_posts WHERE username =?`).all(viewer) as any[];
    const rawRows = [...myPosts, ...inboxPosts];
    filteredRows = rawRows.filter((p: any) => {
      const vis = p.visibility || 'public';
      if (vis === 'public') return true;
      if (vis === 'unlisted') return true;
      if (vis === 'private') return canSee(viewer, p);
      return true;
    });
    if (filteredRows.length === 0) {
      filteredRows = db.prepare(`SELECT * FROM posts WHERE visibility IN ('public','unlisted') ORDER BY created_at DESC LIMIT 100`).all() as any[];
    }
  } else if (type === 'public') {

    // public - local ? 내 서버만 : 전체 
    // public - local ? My server only : Everyone
    filteredRows = db.prepare(`SELECT * FROM posts WHERE visibility IN ('public','unlisted') ORDER BY created_at DESC LIMIT 200`).all() as any[];
    if (!isLocal) {
      const inbox = db.prepare(`SELECT * FROM inbox_posts WHERE visibility IN ('public','unlisted') ORDER BY created_at DESC LIMIT 200`).all() as any[];
      filteredRows = [...filteredRows, ...inbox];
    }
  } else {
    return NextResponse.json([], { headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' } });
  }

  // ✅ 커서 필터 - max_id 이전 글만 / Cursor filter – posts prior to max_id only
  filteredRows.sort((a, b) => parseDate(b.created_at) - parseDate(a.created_at));
  
  // ✅ myapp60 
  // if (max_id) {
  //   const maxTime = parseDate(max_id);
  //   filteredRows = filteredRows.filter((r) => parseDate(r.created_at) < maxTime);
  // }
  
  if (max_id) {
    // max_id가 UUID id일 수도 있고, created_at 타임스탬프일 수도 있음
    let maxTime = parseDate(max_id);
    
    // UUID로 넘어왔으면 해당 글의 created_at을 찾아서 그 시간 이전으로 필터
    if (maxTime === 0) {
      const refRow = filteredRows.find((r: any) => String(r.id) === String(max_id));
      if (refRow) {
        maxTime = parseDate(refRow.created_at);
      } else {
        // filteredRows에 없으면 DB에서 직접 조회
        try {
          const refDb = db.prepare(`SELECT created_at FROM posts WHERE id=?`).get(max_id) as any;
          if (refDb) maxTime = parseDate(refDb.created_at);
          else {
            const refInbox = db.prepare(`SELECT created_at FROM inbox_posts WHERE id=?`).get(max_id) as any;
            if (refInbox) maxTime = parseDate(refInbox.created_at);
          }
        } catch {}
      }
    }
    
    if (maxTime > 0) {
      filteredRows = filteredRows.filter((r) => parseDate(r.created_at) < maxTime);
    }
  }
  //

  const hasMore = filteredRows.length > limit;
  const sliced = filteredRows.slice(0, limit);
  // ✅ myapp60
  // const nextCursor = hasMore ? sliced[sliced.length - 1]?.created_at : null;
  const nextCursor = hasMore ? sliced[sliced.length - 1]?.id : null;
  const nextCursorTime = hasMore ? sliced[sliced.length - 1]?.created_at : null;

  const me = viewer ? (db.prepare('SELECT mastodon_id FROM users WHERE username=?').get(viewer) as any) : null;
  const myMastodonId = me?.mastodon_id || viewer;
  const allAnnounces = viewer ? (db.prepare(`SELECT * FROM announces WHERE username =?`).all(viewer) as any[]) : [];
  const allLikes = viewer ? (db.prepare(`SELECT * FROM likes WHERE username =?`).all(viewer) as any[]) : [];

  const announcesByObject = new Map<string, number>();
  for (const a of allAnnounces) {
    for (const k of [a.object, a.object.split('/').pop() || '']) { if (k) announcesByObject.set(k, (announcesByObject.get(k) || 0) + 1); }
  }
  const likesByObject = new Map<string, number>();
  const likedSet = new Set<string>();
  for (const l of allLikes) {
    for (const k of [l.object, l.object.split('/').pop() || '']) { if (k) { likesByObject.set(k, (likesByObject.get(k) || 0) + 1); likedSet.add(k); } }
    likedSet.add(l.object);
  }

  const statuses = sliced.map((row: any) => {
    const isMy = row.username === viewer;
    let accountId = myMastodonId;

    // ✅ myapp61
    //let accountUsername = viewer;
    let accountUsername = row.username; 
    let acctDomain = DOMAIN;
    let displayAcct = `${row.username}@${DOMAIN}`


    // - inbox_posts면 actor에서 도메인 추출 / If it is `inbox_posts`, extract the domain from the actor.
    const actorUrl = row.actor || row.original_id || '';
    if (actorUrl.startsWith('https://')) {
      try {
        const u = new URL(actorUrl);
        // 로컬도메인과 다르면 리모트 / If it is different from the local domain, it is a remote
        if (u.hostname !== DOMAIN) {
          acctDomain = u.hostname;
          displayAcct = `${row.username}@${u.hostname}`; // user1@freelifemakers.com
        }
      } catch {}
    }

    // - original_id가 로컬 도메인과 다르면 리모트 / If original_id is different from the local domain, the remote
    if (row.original_id?.startsWith('https://')) {
      try {
        const u = new URL(row.original_id);
        if (u.hostname !== DOMAIN) {
          acctDomain = u.hostname;
          displayAcct = `${row.username}@${u.hostname}`;
        }
      } catch {}
    }

    const originalId = row.original_id || row.id;
    const longId = `https://${DOMAIN}/users/${row.username}/statuses/${row.id}`;
    const shortId = String(row.id).split('/').pop() || String(row.id);
    const reblogs_count = announcesByObject.get(longId) || announcesByObject.get(originalId) || announcesByObject.get(shortId) || 0;
    const favourites_count = likesByObject.get(longId) || likesByObject.get(originalId) || likesByObject.get(shortId) || 0;
    const favourited = likedSet.has(longId) || likedSet.has(originalId) || likedSet.has(shortId);
    let content = row.content || '';
    try { if (content.startsWith('{')) { const o = JSON.parse(content); content = o.object?.content || o.content || content; } } catch {}
    
    return {
      id: String(row.id),
      uri: longId, url: longId,
      account: {
        // id: isMy ? accountId : `remote_${row.username}`, ✅ myapp61
        id: isMy ? accountId : `remote_${row.username}@${acctDomain}`,
        //username: row.username, 
        username: accountUsername, 
        // acct: `${row.username}@${DOMAIN}`, ✅ myapp61
        acct: displayAcct, 
        //display_name: row.username,
        display_name: accountUsername,
        avatar: `https://${DOMAIN}/icon.png`, avatar_static: `https://${DOMAIN}/icon.png`,
        header: `https://${DOMAIN}/header.png`, header_static: `https://${DOMAIN}/header.png`,
      },
      content: content.startsWith('<') ? content : `<p>${content}</p>`,
      created_at: new Date(parseDate(row.created_at)).toISOString(),
      visibility: row.visibility || 'public',
      in_reply_to_id: row.in_reply_to_id ? String(row.in_reply_to_id) : null,
      reblogs_count, favourites_count, replies_count: 0,
      favourited: !!favourited, reblogged: reblogs_count > 0,
      muted: false, bookmarked: false, pinned: false,
      sensitive: false, spoiler_text: '',
      media_attachments: [],
      mentions: [], tags: [], emojis: [], card: null, poll: null, reblog: null,
    };
  });

  // ✅ Mastodon 표준 Link 헤더 + 커서 JSON 둘 다 제공
  // Provides both Mastodon standard Link headers and cursor-based JSON.
  const headers = new Headers();
  headers.set('Access-Control-Allow-Origin', '*');
  headers.set('Content-Type', 'application/json');
  if (nextCursor) {
    headers.set('Link', `<https://${DOMAIN}/api/v1/timelines/${type}?max_id=${nextCursor}&limit=${limit}>; rel="next"`);
    headers.set('X-Next-Cursor', String(nextCursor)); 
  }

  // 외부 앱은 배열만 기대, 내부 themeex는 커서 필요하면 ?format=cursor 추가
  // External apps expect only an array; the internal themeex requires `?format=cursor` if a cursor is needed.
  if (searchParams.get('format') === 'cursor') {
    return NextResponse.json({ data: statuses, nextCursor, hasMore }, { headers });
  }
  return NextResponse.json(statuses, { headers });
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type, Authorization' } });
}