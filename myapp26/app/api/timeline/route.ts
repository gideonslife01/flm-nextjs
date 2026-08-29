// app/api/timeline/route.ts
// myapp18✅
import db from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const username = searchParams.get('username') || 'user1';

    // ✅ myapp26 - 내 부스트 목록 / My Boost list
  const myBoosts = db.prepare(`SELECT object FROM announces WHERE username = ?`).all(username) as any[];
  const boostedSet = new Set(myBoosts.map(b => b.object));

// myapp19 ✅
  const timeline = db.prepare(`
    SELECT id, content, username, username as actor, created_at, 'mine' as source 
    FROM posts WHERE username = ?
    UNION ALL
    SELECT id, content, username, actor, created_at, 'inbox' as source 
    FROM inbox_posts WHERE username = ?
    ORDER BY created_at DESC
    LIMIT 50
`).all(username, username) as any[];

  // ✅ myapp26 - 각 글에 부스트 여부 붙이기 / Add a "boosted" indicator to each post.
  const enriched = timeline.map((p: any) => ({
    ...p,
    isMyBoost: boostedSet.has(p.original_id) || boostedSet.has(p.id),
    boostCount: (db.prepare(`SELECT COUNT(*) as c FROM announces WHERE object = ?`).get(p.original_id || p.id) as any)?.c || 0
  }));

  return NextResponse.json(timeline);
}
