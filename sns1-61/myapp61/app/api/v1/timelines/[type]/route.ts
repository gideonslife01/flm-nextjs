// app/api/v1/timelines/[type]/route.ts
// ✅ myapp59 + myapp60
// - 커서 페이지네이션 / CursonPagination

import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { getViewerFromRequest, canSee } from '@/lib/visibility';

const DOMAIN = process.env.DOMAIN || 'aloy-horizon.duckdns.org';
function parseDate(v: any): number {
  if (!v) return 0; // 값이 없으면 0 리턴 / Return 0 if there is no value.
  if (/^\d{13}$/.test(String(v))) return parseInt(v); // 숫자로 변환 / Convert to number
  const d = new Date(v).getTime();
  return isNaN(d) ? 0 : d; // 0 아니면 날짜 / 0 or date
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ type: string }> }) {
  const { type } = await params; // ✅ 이렇게 await
  const { searchParams } = new URL(req.url);
  const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 40); // 최소20개 최대 40개까지만 허용 / A minimum of 20 and a maximum of 40 are permitted.
  const max_id = searchParams.get('max_id');
  const isLocal = searchParams.get('local') === 'true';

  const viewer = getViewerFromRequest(req as any); //cookie user ,viwer == username
  const targetUsername = searchParams.get('paramsusername'); // @username

  if (type === 'home' && !viewer) {
    return NextResponse.json([], { headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' } });
  }

   // console.log(`---${targetUsername}`)

   // ✅ 공통 데이터 수집 / Common Data Collection
  let filteredRows: any[] = [];

//   if (type === 'home') {
//     // ✅ myapp61+ - LIMIT 200 추가 / Add LIMIT 200
//     const myPosts = db.prepare(`SELECT * FROM posts WHERE username =? LIMIT 200`).all(viewer) as any[];
//     const inboxPosts = db.prepare(`SELECT * FROM inbox_posts WHERE username =? LIMIT 200`).all(viewer) as any[];

//     const rawRows = [...myPosts, ...inboxPosts];
//     filteredRows = rawRows.filter((p: any) => {
//       const vis = p.visibility || 'public';
//       if (vis === 'public') return true;
//       if (vis === 'unlisted') return true;
//       if (vis === 'private') return canSee(viewer, p);
//       return true;
//     });
//     if (filteredRows.length === 0) {
//       filteredRows = db.prepare(`SELECT * FROM posts WHERE username=? and visibility IN ('public','unlisted') ORDER BY created_at DESC LIMIT 100`).all() as any[];
//     // filteredRows = db.prepare(`SELECT * FROM posts WHERE visibility IN ('public','unlisted') ORDER BY created_at DESC LIMIT 100`).all() as any[];
//     }
//   } else if (type === 'public') {

//     // public - local ? 내 서버만 : 전체
//     // public - local ? My server only : Everyone

//     // ✅ myapp61+
//     //filteredRows = db.prepare(`SELECT * FROM posts WHERE visibility IN ('public','unlisted') ORDER BY created_at DESC LIMIT 200`).all() as any[];
//     filteredRows = db.prepare(`SELECT * FROM posts WHERE username=? and visibility IN ('public','unlisted') ORDER BY created_at DESC LIMIT 200`).all(viewer) as any[];
//     if (!isLocal) {
//         const inbox = db.prepare(`SELECT * FROM inbox_posts WHERE visibility IN ('public','unlisted') ORDER BY created_at DESC LIMIT 200`).all(viewer) as any[];
// //      const inbox = db.prepare(`SELECT * FROM inbox_posts WHERE visibility IN ('public','unlisted') ORDER BY created_at DESC LIMIT 200`).all() as any[];
//       filteredRows = [...filteredRows, ...inbox];
//     }
//   } else {
//     return NextResponse.json([], { headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' } });
//   }

//console.log(`----Type: ${type}, target:${targetUsername}, viewer:${viewer}, local:${isLocal}`);
// ✅ myapp61+
// console.log(`----Type: ${type}, target:${targetUsername}, viewer:${viewer}, local:${isLocal}`);

// ✅ myapp61+
if (type === 'home' && !viewer && !targetUsername) {
  return NextResponse.json([], { headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' } });
}

if (type === 'home') {
  if (!targetUsername) {
    filteredRows = []; // @userid 없으면 빈 배열 / Empty array if @userid is missing
  } else {
    let rows = db.prepare(
      `SELECT * FROM posts WHERE username=? ORDER BY created_at DESC LIMIT 200`
    ).all(targetUsername) as any[];

    if (!viewer) {
      // 로그인 하지 않은 경우 @userid형태로 접근시 public, unlisted만 보이게 설정
      // If not logged in, restrict access via '@userid' to show only 'public' and 'unlisted' content
      rows = rows.filter(r => ['public','unlisted'].includes(String(r.visibility||'public').trim().toLowerCase()));
    } else if (viewer === targetUsername) {
      // 본인인경우 전부 보이게 설정, 기존값 유지
      // If it's the user themselves, set to show everything; maintain existing value
    } else {
      // 다른 사람인경우 public, unlisted , private는 canSee로 필터
      // For other users, filter 'public', 'unlisted', and 'private' using 'canSee'
      rows = rows.filter(r => {
        const v = String(r.visibility||'public').trim().toLowerCase();
        if (v === 'public' || v === 'unlisted') return true;
        if (v === 'private') return canSee(viewer, r);
        return false;
      });
    }
    filteredRows = rows;
  }
} else if (type === 'public') {
  if (!targetUsername) {
    filteredRows = []; // @userid 없으면 빈 배열 / Empty array if @userid is missing
  } else {
    let rows = db.prepare(
      `SELECT * FROM posts WHERE username=? ORDER BY created_at DESC LIMIT 200`
    ).all(targetUsername) as any[];

    if (!viewer) {
      rows = rows.filter(r => ['public','unlisted'].includes(String(r.visibility||'public').trim().toLowerCase()));
    } else if (viewer === targetUsername) {
      // 본인페이지예 로그인 한 경우
      // When logged into one's own page
    } else {
      rows = rows.filter(r => {
        const v = String(r.visibility||'public').trim().toLowerCase();
        if (v === 'public' || v === 'unlisted') return true;
        if (v === 'private') return canSee(viewer, r);
        return false;
      });
    }
    filteredRows = rows;
  }
}

  // ✅ 커서 필터 - max_id 이전 글만 / Cursor filter – posts prior to max_id only
  filteredRows.sort((a, b) => parseDate(b.created_at) - parseDate(a.created_at));

  // ✅ myapp60
  // if (max_id) {
  //   const maxTime = parseDate(max_id);
  //   filteredRows = filteredRows.filter((r) => parseDate(r.created_at) < maxTime);
  // }

  // URL 파라메터로 전달받은 max_id와 일치하는 날짜를 검색하고 이전글을 검색
  // Search for the date matching the max_id passed as a URL parameter and find the previous post.
  if (max_id) {
    // 현재는 타임스탬프가 아닌 UUID들어가는 구조라 maxTime은 항상 0.
    // Currently, since the structure uses a UUID instead of a timestamp, maxTime is always 0.
    let maxTime = parseDate(max_id);

    // max_id가 UUID인 경우 created_at검색 / Search created_at when max_id is a UUID
    if (maxTime === 0) {
      const refRow = filteredRows.find((r: any) => String(r.id) === String(max_id));
      if (refRow) {
        // maxTime에 날짜 값 저장 이제 0이 아님 / Storing the date value in maxTime; it is no longer zero.
        maxTime = parseDate(refRow.created_at);
      } else {
        // filteredRows에 없으면 DB에서 직접 조회 / If not found in filteredRows, query the database directly.
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

    // 이전글 검색로직 / Previous Post Search Logic
    // 전달받은 max_id와 일치하는 글보다 이전글을 배열에서 검색 / Search the array for posts preceding the post matching the provided max_id.
    if (maxTime > 0) {
      filteredRows = filteredRows.filter((r) => parseDate(r.created_at) < maxTime);
    }
  }

  // 파라메터로 전달받은 limit=20로 데이터 20개만 선택
  // Select only 20 items using the limit=20 parameter
  const hasMore = filteredRows.length > limit;
  const sliced = filteredRows.slice(0, limit);

  // ✅ myapp60
  // const nextCursor = hasMore ? sliced[sliced.length - 1]?.created_at : null;
  const nextCursor = hasMore ? sliced[sliced.length - 1]?.id : null;
  // max_id사용 / usr max_id
  const nextCursorTime = hasMore ? sliced[sliced.length - 1]?.created_at : null;

  const me = viewer ? (db.prepare('SELECT mastodon_id FROM users WHERE username=?').get(viewer) as any) : null;
  const myMastodonId = me?.mastodon_id || viewer; //
  const allAnnounces = viewer ? (db.prepare(`SELECT * FROM announces WHERE username =?`).all(viewer) as any[]) : [];
  const allLikes = viewer ? (db.prepare(`SELECT * FROM likes WHERE username =?`).all(viewer) as any[]) : [];

  const announcesByObject = new Map<string, number>();
  for (const a of allAnnounces) {
    /*
    announces 갯수 세기
    - [fullurl,'/' 기준으로 전체 분리후 마지막 요소만 선택] => [https://fllurl/adc.abc]
    - allAnnounces가 10개면 for가 20번 돌게 되어 있음 k가 문자열이라 a.object1회,a.object.split가 2회 이렇게 for가 실행됨.
    */
   // ✅ myapp61+ - 중복제거 / Deduplication
   for (const k of new Set([a.object, a.object.split('/').pop() || ''].filter(Boolean))) { if (k) announcesByObject.set(k, (announcesByObject.get(k) || 0) + 1); }
  // for (const k of [a.object, a.object.split('/').pop() || '']) { if (k) announcesByObject.set(k, (announcesByObject.get(k) || 0) + 1); }
  }

  const likesByObject = new Map<string, number>();
  const likedSet = new Set<string>();
  for (const l of allLikes) {
    // ✅ myapp61+ - 중복제거 / Deduplication
    for (const k of new Set([l.object, l.object.split('/').pop() || ''].filter(Boolean))) {
    //for (const k of [l.object, l.object.split('/').pop() || '']) {
      if (k) {
        likesByObject.set(k, (likesByObject.get(k) || 0) + 1);
        likedSet.add(k); }
      }
      if (l.object) likedSet.add(l.object);
      //likedSet.add(l.object);
  }

  const statuses = sliced.map((row: any) => {
    const isMy = row.username === viewer;
    // accountId(user1) = myMastodonId(3b7a9dbb);
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

/*
* 위의 코드에 글작성기간에 큰 기간 공백이 있으면 글이 누락되어검색될 수 있어서 아래와 같은 코드로 바뀔 예정
The code above is set to be replaced with the version below, as significant gaps in the posting dates could cause posts to be omitted from search results.

// ✅ 공통 데이터 수집
let filteredRows: any[] = [];

let maxCreatedAt: string | null = null;
if (max_id) {
  // max_id의 created_at 한 번만 조회 - 인덱스 PRIMARY KEY 사용
  const ref = db.prepare(`SELECT created_at FROM posts WHERE id=?`).get(max_id) as any
           || db.prepare(`SELECT created_at FROM inbox_posts WHERE id=?`).get(max_id) as any;
  if (ref) maxCreatedAt = ref.created_at;
}

if (type === 'home') {
  let pQ = `SELECT * FROM posts WHERE username=?`;
  let iQ = `SELECT * FROM inbox_posts WHERE username=?`;
  const pP: any[] = [viewer];
  const iP: any[] = [viewer];

  if (maxCreatedAt) {
    pQ += ` AND created_at <?`;
    iQ += ` AND created_at <?`;
    pP.push(maxCreatedAt);
    iP.push(maxCreatedAt);
  }
  // 인덱스 idx_posts_username_created 타는 쿼리
  pQ += ` ORDER BY created_at DESC LIMIT 200`;
  iQ += ` ORDER BY created_at DESC LIMIT 200`;

  const myPosts = db.prepare(pQ).all(...pP) as any[];
  const inboxPosts = db.prepare(iQ).all(...iP) as any[];

  const rawRows = [...myPosts,...inboxPosts];
  filteredRows = rawRows.filter((p: any) => {
    const vis = p.visibility || 'public';
    if (vis === 'public' || vis === 'unlisted') return true;
    if (vis === 'private') return canSee(viewer, p);
    return true;
  }).sort((a,b) => parseDate(b.created_at) - parseDate(a.created_at))
   .slice(0, limit);

} else if (type === 'public') {
  // public은 인덱스가 visibility라 username 인덱스 못 탐 -> 그래도 LIMIT 필수
  let q = `SELECT * FROM posts WHERE visibility IN ('public','unlisted')`;
  const qP: any[] = [];
  if (maxCreatedAt) {
    q += ` AND created_at <?`;
    qP.push(maxCreatedAt);
  }
  q += ` ORDER BY created_at DESC LIMIT 200`;
  filteredRows = db.prepare(q).all(...qP) as any[];

  if (!isLocal) {
    let iQ = `SELECT * FROM inbox_posts WHERE visibility IN ('public','unlisted')`;
    const iP: any[] = [];
    if (maxCreatedAt) {
      iQ += ` AND created_at <?`;
      iP.push(maxCreatedAt);
    }
    iQ += ` ORDER BY created_at DESC LIMIT 200`;
    const inbox = db.prepare(iQ).all(...iP) as any[];
    filteredRows = [...filteredRows,...inbox]
     .sort((a,b) => parseDate(b.created_at) - parseDate(a.created_at))
     .slice(0, limit);
  }
}
*/
