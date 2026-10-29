// app/api/timeline/route.ts
// myapp18✅
import db from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const username = searchParams.get('username') || 'user1';

// myapp19 ✅
  const timeline = db.prepare(`
    SELECT id, content, username, username as actor, created_at, 'mine' as source 
    FROM posts WHERE username = ?
    UNION ALL
    SELECT id, content, username, actor, created_at, 'inbox' as source 
    FROM inbox_posts WHERE username = ?
    ORDER BY created_at DESC
    LIMIT 50
`).all(username, username);

  return NextResponse.json(timeline);
}
