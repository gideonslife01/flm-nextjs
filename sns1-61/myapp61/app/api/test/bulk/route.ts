// ✅ myapp60 
// - pagination test용 임시 라우트 (테스트 후 삭제)
// - Temporary route for pagination testing (delete after testing)
// app/api/test/bulk

export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import crypto from 'crypto';
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

// POST /api/test/bulk - 글 50개 생성
// POST /api/test/bulk - Create 50 posts
export async function POST(req: NextRequest) {
  const username = getUser(req);
  if (!username) return NextResponse.json({ error: 'login required' }, { status: 401 });

  const { count = 50, prefix = 'pagination test' } = await req.json().catch(() => ({}));
  const now = Date.now();
  const ids: string[] = [];

  const stmt = db.prepare(`INSERT INTO posts (id, username, content, created_at, visibility) VALUES (?,?,?,?,?)`);

  for (let i = 0; i < count; i++) {
    const id = crypto.randomUUID();
    const content = `${prefix} ${i+1}/${count} - ${new Date().toISOString()} - ${Math.random().toString(36).slice(2,8)}`;
    // created_at을 1초씩 과거로 해서 순서 보장
    const createdAt = new Date(now - i * 1000).toISOString();
    stmt.run(id, username, content, createdAt, 'public');
    ids.push(id);
  }

  return NextResponse.json({ ok: true, created: ids.length, ids, username });
}

// DELETE /api/test/bulk - 테스트 글 일괄 삭제
export async function DELETE(req: NextRequest) {
  const username = getUser(req);
  if (!username) return NextResponse.json({ error: 'login required' }, { status: 401 });

  const { prefix = 'pagination test', deleteAll = false } = await req.json().catch(() => ({}));

  let result;
  if (deleteAll) {
    // 위험! 해당 유저 글 전체 삭제 - 테스트 계정에서만 써
    result = db.prepare(`DELETE FROM posts WHERE username=?`).run(username);
  } else {
    result = db.prepare(`DELETE FROM posts WHERE username=? AND content LIKE?`).run(username, `%${prefix}%`);
  }

  // 고아 데이터 정리
  try {
    db.prepare(`DELETE FROM likes WHERE username=? AND object LIKE?`).run(username, `%${prefix}%`);
    db.prepare(`DELETE FROM announces WHERE username=?`).run(username);
  } catch {}

  return NextResponse.json({ ok: true, deleted: result.changes, username });
}

// GET /api/test/bulk?count=5 - 현재 테스트 글 개수 확인
export async function GET(req: NextRequest) {
  const username = getUser(req);
  if (!username) return NextResponse.json({ error: 'login required' }, { status: 401 });

  const posts = db.prepare(`SELECT COUNT(*) as total FROM posts WHERE username=?`).get(username) as any;
  const testPosts = db.prepare(`SELECT COUNT(*) as total FROM posts WHERE username=? AND content LIKE '%pagination test%'`).get(username) as any;
  const inbox = db.prepare(`SELECT COUNT(*) as total FROM inbox_posts WHERE username=?`).get(username) as any;

  return NextResponse.json({
    username,
    totalPosts: posts.total,
    testPosts: testPosts.total,
    inboxPosts: inbox.total,
  });
}