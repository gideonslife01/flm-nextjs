// app/usersui/[username]/page.tsx
import db from '@/lib/db';

// ✅ myapp20
function getDisplayName(actorOrUsername: string) {
  if (!actorOrUsername) return 'unknown';
  // https://freelifemakers.com/users/user1 -> user1@freelifemakers.com
  if (actorOrUsername.startsWith('https://')) {
    try {
      const url = new URL(actorOrUsername);
      const username = url.pathname.split('/').pop() || 'user';
      return `${username}@${url.hostname}`;
    } catch {
      return actorOrUsername.split('/').pop() || actorOrUsername;
    }
  }
  return actorOrUsername;
}

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
    <div style={{ padding: 20, maxWidth: 900, margin: '0 auto' }}>
      <h1 style={{ fontSize: 24, marginBottom: 16 }}>{username} 타임라인 / Timeline</h1>
      <ul style={{ listStyle: 'none', padding: 0 }}>
        {timeline.map((p:any) => (
          <li key={`${p.source}-${p.id}`} style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '10px 0',
            borderBottom: '1px solid #eee',
            flexWrap: 'wrap'
          }}>
            <span style={{ background: p.source === 'mine'? '#dbeafe' : '#fef3c7', padding: '2px 6px', borderRadius: 4, fontSize: 11 }}>
              {p.source}
            </span>
            <b>{getDisplayName(p.actor)}:</b>
            <span dangerouslySetInnerHTML={{__html: p.content}} />
            <span style={{ color: '#999', fontSize: 11, marginLeft: 'auto' }}>
              {new Date(p.created_at).toLocaleString()}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
