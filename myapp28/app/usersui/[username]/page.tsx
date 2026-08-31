// app/usersui/[username]/page.tsx - myapp27 최종 자동 ✅
'use client';
import { useEffect, useState } from 'react';
import { useTheme } from '@/lib/theme';
//import { themeRegistry, themeNames, getThemeComponent } from './_components/themes';

//✅ myappp27
import { themeRegistry, getThemeComponent } from './_components/themes'; // ✅ registry만 여기서 가져오기 / Import only the registry from here.
import { themeNames } from './_components/themes/themeNames'; // ✅ names는 분리된 파일에서 가져오기 / names are imported from a separate file

export default function Page({ params }: { params: Promise<{ username: string }> }) {
  const { theme } = useTheme();
  const [username, setUsername] = useState('');
  const [timeline, setTimeline] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    params.then(p => {
      setUsername(p.username);
      fetch(`/api/timeline?username=${p.username}`)
       .then(r => r.json())
       .then(data => {
          console.log('📦 timeline', data[0]); // ✅ myapp28
          setTimeline(data);
          setLoading(false);
        });
    });
  }, [params]);

  const refreshTimeline = async () => {
    const updated = await fetch(`/api/timeline?username=${username}`).then(r => r.json());
    setTimeline(updated);
  };

  // ✅ myapp28
 const handleBoost = async (post: any) => {
  let target = post.original_id || post.id;
  console.log('🔍 원본 post 데이터/original data', post); 

  if (!target.startsWith('http')) {
    // inbox 글이면 actor가 진짜 주인!
    // actor = https://freelifemakers.com/users/user1 같은 형태일 수 있음
    // If it's an inbox message, the actor is the actual owner!
    // The actor might be in a format like https://freelifemakers.com/users/user1
    if (post.actor && post.actor.startsWith('http')) {
      // actor URL에서 username 추출 / Extract username from actor URL
      try {
        const actorUrl = new URL(post.actor);
        const parts = actorUrl.pathname.split('/');
        const usersIdx = parts.indexOf('users');

        if (usersIdx !== -1) {
        // inbox_posts
          const actorUsername = parts[usersIdx + 1];
          target = `${actorUrl.origin}/users/${actorUsername}/statuses/${target}`;
        } else {
        // posts
          target = `https://${process.env.NEXT_PUBLIC_DOMAIN || 'aloy-horizon.duckdns.org'}/users/${post.username}/statuses/${target}`;
        }
      } catch {
        target = `https://${process.env.NEXT_PUBLIC_DOMAIN || 'aloy-horizon.duckdns.org'}/users/${post.username}/statuses/${target}`;
      }
    } else {
      target = `https://${process.env.NEXT_PUBLIC_DOMAIN || 'aloy-horizon.duckdns.org'}/users/${post.username}/statuses/${target}`;
    }
  }
  
  console.log('🔁 boost click', { target, isMyBoost: post.isMyBoost });

  // Optimistic UI
  setTimeline(prev => prev.map(p =>
    p.id === post.id
      ? {...p, isMyBoost:!p.isMyBoost, boostCount: (p.boostCount || 0) + (p.isMyBoost? -1 : 1) }
      : p
  ));

  try {   
    const res = await fetch(`/api/announce`, {
      method: post.isMyBoost? 'DELETE' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, target })
    });

    const data = await res.json();
    console.log('✅ announce res', data);
    if (!res.ok) throw new Error(data.error);
    await refreshTimeline();
  } catch (e) {
    console.error('❌ boost 실패', e);
    await refreshTimeline();
  }
};

// ✅ myapp28
const handleLike = async (post: any) => {
  // ✅ myapp28 - 풀 URL 보장
  let target = post.original_id || post.id;
  
  if (!target.startsWith('http')) {
    target = `https://${process.env.NEXT_PUBLIC_DOMAIN || 'aloy-horizon.duckdns.org'}/users/${post.username}/statuses/${target}`;
  }

  console.log('⭐ like click', { target, isLiked: post.isLiked });

  // Optimistic UI - 바로 노란색
  setTimeline(prev => prev.map(p =>
    p.id === post.id
      ? { ...p, isLiked: !p.isLiked, likeCount: (p.likeCount || 0) + (p.isLiked ? -1 : 1) }
      : p
  ));

  try {
    const res = await fetch(`/api/like`, {
      method: post.isLiked ? 'DELETE' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, target })
    });

    const data = await res.json();
    console.log('✅ like res', data);
    if (!res.ok) throw new Error(data.error);

    await refreshTimeline();
  } catch (e) {
    console.error('❌ like 실패', e);
    await refreshTimeline();
  }
};

  if (loading) return <div style={{ padding: 20 }}>Loading...</div>;

  const props = { timeline, username, onBoost: handleBoost, onLike: handleLike };

  // 테마 자동분기로 변경 / Changed to automatic theme switching.
  const ActiveTheme = getThemeComponent(theme as any) || themeRegistry.pinafore?.component || themeRegistry[themeNames[0]]?.component;

  if (!ActiveTheme) return <div>No themes found</div>;

  return <ActiveTheme {...props} />;
}