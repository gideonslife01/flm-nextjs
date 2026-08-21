// app/usersui/[username]/page.tsx
import db from '@/lib/db';

export default async function Page({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;

  // 동일한 테이블이기 때문에 사용가능 
  // Same table, so it's available
  const timeline = db.prepare(`
    SELECT id, content, created_at, 'mine' as source FROM posts WHERE username=?
    UNION ALL
    SELECT id, content, created_at, 'inbox' as source FROM inbox_posts WHERE username=?
    ORDER BY created_at DESC LIMIT 50
  `).all(username, username) as any[];

  /*
  // UNION ALL을 쓰지 않고, 두 쿼리를 따로 실행한 후 합치고 정렬하는 방법 
  // You can also execute two queries separately and then merge and sort them without using UNION ALL
  
  const mine = db.prepare(`SELECT ... FROM posts ...`).all(username);
  const inbox = db.prepare(`SELECT ... FROM inbox_posts ...`).all(username);
  const timeline = [...mine, ...inbox].sort(...)
  */

  return (
    <div style={{ padding: 20 }}>
      <h1>{username} 타임라인 / Timeline</h1>
      <ul>
        {timeline.map((p:any) => (
          <li key={p.id}>[{p.source}] {p.content} - {p.created_at}</li>
        ))}
      </ul>
    </div>
  );
}
