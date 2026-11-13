// ✅ myapp42/app/usersui/[username]/followers/ClientList.tsx
'use client';
import Link from 'next/link';

function Avatar({ username, size = 46 }: { username: string, size?: number }) {
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', background: '#6364ff', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: size * 0.4 }}>{username[0]?.toUpperCase()}</div>
  );
}

export default function FollowList({ username, type, users }: { username: string, type: 'followers' | 'following', users: any[] }) {
  return (
    <>
      <style>{`
        .follow-layout { max-width: 600px; margin: 0 auto; background: white; min-height: 100vh; border-left: 1px solid #e6ecf0; border-right: 1px solid #e6ecf0; }
        .follow-header { padding: 12px 16px; border-bottom: 1px solid #e6ecf0; display: flex; gap: 12px; align-items: center; position: sticky; top: 0; background: white; z-index: 10; }
        .follow-row { display: flex; gap: 12px; padding: 12px 16px; border-bottom: 1px solid #e6ecf0; }
        .follow-row:hover { background: #fafafe; }
      `}</style>

      <div className="follow-layout">
        <div className="follow-header">
          {/* <Link href={`/usersui/${username}`} style={{ textDecoration: 'none', fontSize: 20 }}>←</Link> */}
           <Link href={`/@${username}`} style={{ textDecoration: 'none', fontSize: 20 }}>←</Link>
          <div>
            <div style={{ fontWeight: 800 }}>{username}</div>
            <div style={{ fontSize: 13, color: '#657786' }}>{type === 'followers'? '팔로워' : '팔로잉'} {users.length}명</div>
          </div>
        </div>

        {users.length === 0 && <div style={{ padding: 20, color: '#999' }}>아직 {type === 'followers'? '팔로워가' : '팔로잉이'} 없습니다</div>}

        {users.map((u: any) => (
          <Link key={u.username} href={`/usersui/${u.username}`} style={{ textDecoration: 'none', color: 'inherit' }}>
            <div className="follow-row">
              {u.avatar? <img src={u.avatar} style={{ width: 46, height: 46, borderRadius: '50%' }} alt="" /> : <Avatar username={u.username} />}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700 }}>{u.display_name || u.username}</div>
                <div style={{ fontSize: 13, color: '#657786' }}>@{u.acct || u.username}</div>
                {u.note && <div style={{ fontSize: 13, marginTop: 4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }} dangerouslySetInnerHTML={{ __html: u.note }} />}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </>
  );
}