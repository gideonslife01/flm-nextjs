// app/usersui/[username]/ClientPage.tsx 
// - myapp42 + myapp49  ✅
// - page.txt -> ClientPage.tsx

'use client';
import { useEffect, useState, useRef } from 'react';
import { useTheme } from '@/lib/theme';
import { themeRegistry, getThemeComponent } from './_components/themes';
import { themeNames } from './_components/themes/themeNames';


export default function ClientPage({ username, initialView}: {username:String, initialView?:String}) {
  const { theme } = useTheme();
  //const [username, setUsername] = useState('');
  const [timeline, setTimeline] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // 이게 없으면 클로저 버그! / Without this, closure bug!
  const timelineRef = useRef<any[]>([]);
  useEffect(() => { timelineRef.current = timeline; }, [timeline]);

  // ✅ myapp42 - delete params then
  useEffect(() => {
    if (!username) return;
    setLoading(true);
    fetch(`/api/timeline?username=${username}`, { cache: 'no-store' })
     .then(r => r.json())
     .then(data => {
        console.log('📦 timeline', data[0]);
        setTimeline(data);
        setLoading(false);
      })
     .catch(() => setLoading(false));
  }, [username]); 

  const refreshTimeline = async () => {
    if (!username) return;
    const updated = await fetch(`/api/timeline?username=${username}&t=${Date.now()}`, { cache: 'no-store' }).then(r => r.json());
    setTimeline(updated);
  };


  // ✅ myapp29 - 부스트 - 좋아요와 동일하게 DB 기준으로 수정! / Boost - Updated based on DB, same as Like
  const handleBoost = async (post: any) => {
    const latest = timelineRef.current.find((p: any) => p.id === post.id) || post;
    let target = latest.original_id || latest.id;

    if (!target.startsWith('http')) {
      if (latest.actor && latest.actor.startsWith('http')) {
        try {
          const actorUrl = new URL(latest.actor);
          const parts = actorUrl.pathname.split('/');
          const usersIdx = parts.indexOf('users');
          const actorUsername = usersIdx!== -1? parts[usersIdx + 1] : latest.username;
          target = `${actorUrl.origin}/users/${actorUsername}/statuses/${target}`;
        } catch {
          target = `https://${process.env.NEXT_PUBLIC_DOMAIN || 'aloy-horizon.duckdns.org'}/users/${latest.username}/statuses/${target}`;
        }
      } else {
        target = `https://${process.env.NEXT_PUBLIC_DOMAIN || 'aloy-horizon.duckdns.org'}/users/${latest.username}/statuses/${target}`;
      }
    }

    const currentlyBoosted = latest.isMyBoost;
    console.log('🔁 boost click', { target, isMyBoost: currentlyBoosted });

    // Optimistic
    setTimeline(prev => prev.map((p: any) =>
      p.id === latest.id
      ? {...p, isMyBoost:!currentlyBoosted, boostCount: (p.boostCount || 0) + (currentlyBoosted? -1 : 1) }
        : p
    ));

    try {
      const res = await fetch(`/api/announce`, {
        method: currentlyBoosted? 'DELETE' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, target }),
        cache: 'no-store'
      });
      const data = await res.json();
      console.log('✅ announce res', data);

      // ✅ 서버 진실값으로 덮어쓰기!
      // Overwrite with server truth values
      setTimeline(prev => prev.map((p: any) =>
        p.id === latest.id
        ? {...p, isMyBoost: data.isMyBoost, boostCount: data.boostCount }
          : p
      ));

      if (data.alreadyBoosted || data.alreadyUnboosted) {
        await refreshTimeline();
      }

    } catch (e) {
      console.error('❌ boost 실패', e);
      await refreshTimeline();
    }
  };

  // ✅ myapp29 - 좋아요 - DB 기준으로 수정! / Like - Updated based on DB
  const handleLike = async (post: any) => {

    // ✅ 항상 최신 timeline에서 찾기! / Always find from the latest timeline!
    const latest = timelineRef.current.find((p: any) => p.id === post.id) || post;
    let target = latest.original_id || latest.id;

    if (!target.startsWith('http')) {
      if (latest.actor && latest.actor.startsWith('http')) {
        try {
          const actorUrl = new URL(latest.actor);
          const parts = actorUrl.pathname.split('/');
          const usersIdx = parts.indexOf('users');
          const actorUsername = usersIdx!== -1? parts[usersIdx + 1] : latest.username;
          target = `${actorUrl.origin}/users/${actorUsername}/statuses/${target}`;
        } catch {
          target = `https://${process.env.NEXT_PUBLIC_DOMAIN || 'aloy-horizon.duckdns.org'}/users/${latest.username}/statuses/${target}`;
        }
      } else {
        target = `https://${process.env.NEXT_PUBLIC_DOMAIN || 'aloy-horizon.duckdns.org'}/users/${latest.username}/statuses/${target}`;
      }
    }

    const currentlyLiked = latest.isMyLike;
    console.log('⭐ like click', { target, isMyLike: currentlyLiked, shortId: target.split('/').pop() });

    // Optimistic + 서버값으로 덮어쓰기
    // Overwrite with Optimistic + Server values
    setTimeline(prev => prev.map((p: any) =>
      p.id === latest.id
       ? {...p, isMyLike:!currentlyLiked, likeCount: (p.likeCount || 0) + (currentlyLiked? -1 : 1) }
        : p
    ));

    try {
      const res = await fetch(`/api/like`, {
        method: currentlyLiked? 'DELETE' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, target }),
        cache: 'no-store'
      });
      const data = await res.json();
      console.log('⭐ like 응답', data);

      // 서버가 준 값 활용하기
      // Using the value provided by the server
      setTimeline(prev => prev.map((p: any) =>
        p.id === latest.id
         ? {...p, isMyLike: data.isMyLike, likeCount: data.likeCount }
          : p
      ));

      // 혹시 모르니 한번 더 동기화
      // Synchronize one more time just in case
      if (data.alreadyLiked || data.alreadyUnliked) {
        await refreshTimeline();
      }

    } catch (e) {
      console.error('❌ like 실패', e);
      await refreshTimeline();
    }
  };

  // ✅ myapp50 - 공유 기능 - (ActivityPub이랑 상관없음)
  // Sharing feature - (Unrelated to ActivityPub)
  const handleShare = async (post: any) => {
    const latest = timelineRef.current.find((p: any) => p.id === post.id) || post;
    const DOMAIN = process.env.NEXT_PUBLIC_DOMAIN || 'aloy-horizon.duckdns.org';

    let url = latest.original_id || latest.id;
    if (!url.startsWith('http')) {
      url = `https://${DOMAIN}/users/${latest.username}/statuses/${url}`;
    }

    const shareUrl = url.includes('/statuses/')? url : `https://${DOMAIN}/users/${latest.username}/statuses/${latest.id}`;

    const text = latest.content? latest.content.replace(/<[^>]*>/g, '').slice(0, 100) : '';

    // 1. 모바일 - 네이티브 공유 시트 (카톡, 텔레그램, 에어드랍 자동)
    // Mobile – Native share sheet (KakaoTalk, Telegram, AirDrop supported automatically)
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${latest.username}의 글`,
          text: text,
          url: shareUrl
        });
        return { ok: true, method: 'native' };
      } catch (e) {
        // 취소한 경우 무시
        console.log('share cancelled', e);
      }
    }

    // 2. PC 폴백 - 클립보드 복사
    // PC Fallback - Copy to Clipboard
    try {
      await navigator.clipboard.writeText(shareUrl);
      alert(`🔗 링크 복사됨/link copied\n${shareUrl}`);
      return { ok: true, method: 'clipboard' };
    } catch {
      prompt('링크 복사/copy link:', shareUrl);
      return { ok: true, method: 'prompt' };
    }
  };

  if (loading) return <div style={{ padding: 20 }}>Loading...</div>;

  //const props = { timeline, username, initialView, onBoost: handleBoost, onLike: handleLike };

  // ✅ myapp50 - handleShare를 onShare에 추가해서 테마로 넘김
  // Added handleShare to onShare and passed it to the theme.
  const props = { timeline, username, initialView, onBoost: handleBoost, onLike: handleLike, onShare: handleShare };

  
  // getThemeComponent : import { themeRegistry, getThemeComponent } from './_components/themes'; --> index.ts
  const ActiveTheme = getThemeComponent(theme as any) || themeRegistry.pinafore?.component || themeRegistry[themeNames[0]]?.component;
  if (!ActiveTheme) return <div>No themes found</div>;

  return <ActiveTheme {...props} />;
}