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
          setTimeline(data);
          setLoading(false);
        });
    });
  }, [params]);

  const refreshTimeline = async () => {
    const updated = await fetch(`/api/timeline?username=${username}`).then(r => r.json());
    setTimeline(updated);
  };

  const handleBoost = async (post: any) => {
    const targetId = post.original_id || post.id;
    const fullTarget = targetId.startsWith('http')
     ? targetId
      : `https://${process.env.NEXT_PUBLIC_DOMAIN || 'aloy-horizon.duckdns.org'}/users/${post.username}/statuses/${targetId}`;

    await fetch(`/api/announce`, {
      method: post.isMyBoost? 'DELETE' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, target: fullTarget })
    });
    await refreshTimeline();
  };

  const handleLike = async (post: any) => {
    const targetId = post.original_id || post.id;
    const fullTarget = targetId.startsWith('http')? targetId : `https://${process.env.NEXT_PUBLIC_DOMAIN || 'aloy-horizon.duckdns.org'}/users/${post.username}/statuses/${targetId}`;
    await fetch(`/api/like`, {
      method: post.isLiked? 'DELETE' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, target: fullTarget })
    });
    await refreshTimeline();
  };

  if (loading) return <div style={{ padding: 20 }}>Loading...</div>;

  const props = { timeline, username, onBoost: handleBoost, onLike: handleLike };

  // 테마 자동분기로 변경 / Changed to automatic theme switching.
  const ActiveTheme = getThemeComponent(theme as any) || themeRegistry.pinafore?.component || themeRegistry[themeNames[0]]?.component;

  if (!ActiveTheme) return <div>No themes found</div>;

  return <ActiveTheme {...props} />;
}