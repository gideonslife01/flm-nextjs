// ✅ myapp43 - app/usersui/[username]/_components/theme/pinafore/FollowingList.tsx

'use client';
import { useEffect, useState } from 'react';

export default function FollowingList({ username, style }: { username: string, style?: any }) {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // ✅  /api/followinglist/route.ts 호출!
    // Calling /api/followinglist/route.ts!
    fetch(`/api/followinglist?username=${username}`)
     .then(r => r.json())
     .then(d => { setUsers(Array.isArray(d)? d : d.accounts || []); setLoading(false); })
     .catch(() => setLoading(false));
  }, [username]);

  if (loading) return <div style={{ padding: 20, textAlign: 'center' }}>Loading...</div>;

  return (
    <div style={style}>
      {users.map((u, i) => (
        <div key={i} style={{ display: 'flex', gap: 12, padding: '12px 16px', borderBottom: '1px solid #eee' }}>
          <div style={{ width: 46, height: 46, borderRadius: '50%', background: '#6364ff', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800 }}>
            {(u.display_name || u.username || '?')[0].toUpperCase()}
          </div>
          <div>
            <div style={{ fontWeight: 700 }}>{u.display_name || u.username}</div>
            <div style={{ fontSize: 13, color: '#657786' }}>{u.acct || u.actor}</div>
          </div>
        </div>
      ))}
      {users.length === 0 && <div style={{ padding: 40, textAlign: 'center', color: '#999' }}>팔로잉 없음 / No following</div>}
    </div>
  );
}