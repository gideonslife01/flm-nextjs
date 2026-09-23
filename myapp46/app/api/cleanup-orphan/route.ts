// ✅ myapp46 -  app/api/cleanup-orphan/route.ts 
// - posts와 outbox 불일치 청소 아직은 임시 라우트
//
import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { sendDelete } from '@/lib/ap';

const DOMAIN = process.env.DOMAIN || 'aloy-horizon.duckdns.org';

export async function POST(req: Request) {
  const { username } = await req.json();
  const user = username || 'user1';

  // 1. posts에 없는 outbox 찾기 = 유령글!
  const orphans = db.prepare(`
    SELECT o.id, o.object FROM outbox o
    LEFT JOIN posts p ON o.id = p.id
    WHERE p.id IS NULL AND o.actor LIKE ?
  `).all(`%/${user}`) as any[];

  console.log(`👻 [${user}] 유령글 ${orphans.length}개 발견!`);

  const followers = db.prepare('SELECT * FROM followers WHERE username=?').all(user) as any[];
  let deleted = [];

  for (const orphan of orphans) {
    try {
      const obj = JSON.parse(orphan.object);
      const objectId = obj.id || `https://${DOMAIN}/users/${user}/posts/${orphan.id}`;

      // 모든 팔로워에게 Delete 배달!
      for (const f of followers) {
        try {
          await sendDelete(f.inbox, objectId, user);
          // statuses 경로도 같이!
          await sendDelete(f.inbox, objectId.replace('/posts/', '/statuses/'), user).catch(()=>{});
        } catch {}
      }

      // outbox에서도 제거!
      db.prepare('DELETE FROM outbox WHERE id=?').run(orphan.id);
      deleted.push({ id: orphan.id, objectId });
      console.log(`🗑️ 유령글 삭제 배달: ${orphan.id}`);
    } catch (e) {
      console.error(`❌ ${orphan.id} 삭제 실패`, e);
    }
  }

  return NextResponse.json({ orphans: orphans.length, deleted });
}

// GET으로 확인만!
export async function GET(req: Request) {
  const url = new URL(req.url);
  const user = url.searchParams.get('username') || 'user1';
  const orphans = db.prepare(`
    SELECT o.id, o.created_at, substr(o.object,1,100) as obj FROM outbox o
    LEFT JOIN posts p ON o.id = p.id
    WHERE p.id IS NULL AND o.actor LIKE ?
    ORDER BY o.created_at DESC LIMIT 50
  `).all(`%/${user}`) as any[];
  
  const postsCount = (db.prepare('SELECT COUNT(*) as c FROM posts WHERE username=?').get(user) as any).c;
  const outboxCount = (db.prepare('SELECT COUNT(*) as c FROM outbox WHERE actor LIKE ?').get(`%/${user}`) as any).c;

  return NextResponse.json({ user, postsCount, outboxCount, orphansCount: orphans.length, orphans });
}