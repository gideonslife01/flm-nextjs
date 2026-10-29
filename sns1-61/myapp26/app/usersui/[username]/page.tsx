// app/usersui/[username]/page.tsx - myapp26 최종✅
'use client';
import { useEffect, useState } from 'react';
import { useTheme } from '@/lib/theme';
import { PinaforeTheme } from './_components/themes/pinafore/Pinaforetheme';
import { MastodonTheme } from './_components/themes/mastodon/Mastodontheme';
import { MinimalTheme } from './_components/themes/minimal/Minimaltheme';

export default function Page({ params }: { params: Promise<{ username: string }> }) {
  const { theme } = useTheme();
  const [username, setUsername] = useState('');
  const [timeline, setTimeline] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // ✅ timeline fetch
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

  const handleBoost = async (post: any) => {
    const targetId = post.original_id || post.id;
    const fullTarget = targetId.startsWith('http') 
      ? targetId 
      : `https://${process.env.NEXT_PUBLIC_DOMAIN || 'aloy-horizon.duckdns.org'}/users/${post.username}/statuses/${targetId}`;

    const method = post.isMyBoost ? 'DELETE' : 'POST';
    await fetch(`/api/announce`, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, target: fullTarget })
    });
    
    // 새로고침 / refresh
    const updated = await fetch(`/api/timeline?username=${username}`).then(r => r.json());
    setTimeline(updated);
  };

  const handleLike = async (post: any) => {
    const targetId = post.original_id || post.id;
    const fullTarget = targetId.startsWith('http') ? targetId : `https://${process.env.NEXT_PUBLIC_DOMAIN || 'aloy-horizon.duckdns.org'}/users/${post.username}/statuses/${targetId}`;
    await fetch(`/api/like`, {
      method: post.isLiked ? 'DELETE' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, target: fullTarget })
    });
    const updated = await fetch(`/api/timeline?username=${username}`).then(r => r.json());
    setTimeline(updated);
  };

  if (loading) return <div style={{ padding: 20 }}>Loading...</div>;

  // ✅ theme 분기 + props 전달 / Theme branching + props passing
  const props = { timeline, username, onBoost: handleBoost, onLike: handleLike };

  // apply theme
  if (theme === 'pinafore') return <PinaforeTheme {...props} />
  if (theme === 'mastodon') return <MastodonTheme {...props} />
  if (theme === 'minimal') return <MinimalTheme {...props} />
  
  return <PinaforeTheme {...props} />;
}