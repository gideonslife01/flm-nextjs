// app/api/timeline/route.ts
// myapp18✅
import db from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const username = searchParams.get('username') || 'user1';
  const DOMAIN = process.env.NEXT_PUBLIC_DOMAIN || 'aloy-horizon.duckdns.org';

    // ✅ myapp26 - 내 부스트 목록 / My Boost list
  const myBoosts = db.prepare(`SELECT object FROM announces WHERE username = ?`).all(username) as any[];
  const boostedSet = new Set(myBoosts.map(b => b.object));

// myapp28 ✅
  const timeline = db.prepare(`
    SELECT id, content, username, username as actor, created_at, 'mine' as source, id as original_id
    FROM posts WHERE username = ?
    UNION ALL
    SELECT id, content, username, actor, created_at, 'inbox' as source, original_id
    FROM inbox_posts WHERE username = ?
    ORDER BY created_at DESC
    LIMIT 50
  `).all(username, username) as any[];

  // ✅ myapp28
  const enriched = timeline.map((p: any) => {
    // 풀 URL 만들기 / Create full URL
    let fullId = p.original_id || p.id;
    if (!fullId.startsWith('http')) {
      fullId = `https://${DOMAIN}/users/${p.username}/statuses/${fullId}`;
    }
    
    // inbox 글은 original_id가 이미 풀 URL일 수 있음
    // The original_id of an inbox post might already be a full URL.
    let fullOriginalId = p.original_id || p.id;
    if (p.original_id && !p.original_id.startsWith('http')) {
      fullOriginalId = `https://${DOMAIN}/users/${p.username}/statuses/${p.original_id}`;
    }

    const isMyBoost = boostedSet.has(p.original_id) || 
                      boostedSet.has(p.id) || 
                      boostedSet.has(fullId) ||
                      boostedSet.has(fullOriginalId) ||
                      (p.original_id && boostedSet.has(p.original_id));

    const boostCount = (db.prepare(`SELECT COUNT(*) as c FROM announces WHERE object = ? OR object = ? OR object = ?`)
      .get(fullId, p.original_id || '', p.id || '') as any)?.c || 0;

    return {
      ...p,
      fullId, // 디버깅용 / For debugging purposes
      isMyBoost,
      boostCount
    };
  });

  return NextResponse.json(enriched); // ✅ myapp28 - 버그 수정 / Bug fixes
}
