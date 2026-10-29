// ✅ myapp44 - pinafore/NotificationList.tsx 
'use client';
import { useEffect, useState } from 'react';

export default function NotificationsList({ username, style }: any) {
  const [notis, setNotis] = useState<any[]>([]);

  useEffect(() => {
    // - myapp38의 기존 API 그대로 사용하고 username만 넘기기!
    // Use the existing API from myapp38 as-is and pass only the username!
    fetch(`/api/v1/notifications?username=${username}&limit=30`)
    .then(r => r.json())
    .then(data => {
        console.log(`🔔 ${data.length}개 로드`);
        setNotis(data);
      });
  }, [username]);

  return (
    <div style={style}>
      {notis.map((n) => (
        <div key={n.id} style={{ padding: '12px 16px', borderBottom: '1px solid #eee' }}>
          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#6364ff', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800 }}>
              {n.account.display_name[0]}
            </div>
            <div>
              <b>{n.account.display_name}</b> <span style={{ color: '#657786' }}>{n.account.acct}</span>
              <div style={{ fontSize: 14 }}>
                {n.type === 'follow' && '님이 팔로우 했습니다'}
                {n.type === 'favourite' && '님이 좋아요 했습니다 ❤️'}
                {n.type === 'reblog' && '님이 부스트 했습니다 🔁'}
              </div>
            </div>
          </div>
        </div>
      ))}
      {notis.length === 0 && <div style={{ padding: 40, textAlign: 'center', color: '#999' }}>알림 없음/No notifications</div>}
    </div>
  );
}