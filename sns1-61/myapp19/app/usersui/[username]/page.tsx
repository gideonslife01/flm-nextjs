// app/usersui/[username]/page.tsx
import db from '@/lib/db';

export default async function Page({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;

  // myapp19 ✅
  // 필드를 posts테이블에 actor가 없으므로 as actor를 붙여서 actor필드를 만들어줍니다. 
  // as actor is added to the posts table because there is no actor field in the posts table, so we create an actor field.

  const timeline = db.prepare(`
    SELECT id, content, username, username as actor, created_at, 'mine' as source 
    FROM posts WHERE username = ?
    UNION ALL
    SELECT id, content, username, actor, created_at, 'inbox' as source 
    FROM inbox_posts WHERE username = ?
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
          <li key={`${p.source}-${p.id}`}>
            [{p.source}] <b>{p.actor}</b>: {p.content} - {p.created_at}
          </li>
        ))}
      </ul>
    </div>
  );
}
