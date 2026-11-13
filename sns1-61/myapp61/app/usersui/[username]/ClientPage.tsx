// app/usersui/[username]/ClientPage.tsx 
// - myapp42 + myapp49 + 61 ✅
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

  const [currentUser, setCurrentUser] = useState<string|null>(null);


  // 타임라인 정보가 바뀌면 타임라인 값을 timelineRef에 저장
  // When the timeline information changes, store the timeline value in timelineRef.
  const timelineRef = useRef<any[]>([]);
  useEffect(() => { timelineRef.current = timeline; }, [timeline]);

  // ✅ myapp60 + myapp61
  /* 
   ⭐️ 초기 데이터를 TimelineList.tsx에서 로드하면 nextjs서버에서 API데이터를 여러번 호출해서 
   초기데이터가 빈데이터가 되는 현상이 발생함
   When loading initial data in `TimelineList.tsx`, the Next.js server makes multiple API calls, resulting in the initial data being empty.

   그래서 첫 데이터는 이 ClientPage.tsx에서 데이터를 주입하는걸로 처리
   So, for the initial data, I'll handle the data injection within this `ClientPage.tsx`.
  
  */

  // - 페이지네이션은 TimelineList가 담당, 여기선 빈 배열로 시작
  // - Pagination is handled by TimelineList; start with an empty array here.
  // useEffect(() => {
  //   if (!username) return;
  //   //setTimeline([]);
  //   setLoading(false);
  // }, [username]);

  // ✅ myapp61 
  // - 첫 로딩: 로그인=home, 비로그인=public local
  // - Initial load: Logged in = Home; Not logged in = Public Local
  useEffect(() => {
  const init = async () => {
    // 1. 로그인 유저 확인 / check login user
    // meRes에는 리턴 된 새로운 access token이 할당됨.
    // If a refresh token is present, issue a new access token and return it.
    let me = null;
    try {
      const meRes = await fetch(`/api/auth/me`, { credentials: 'include' });
      if (!meRes.ok) {
        console.log('[auth] 비로그인/Not logged in');
        me = null;
      } else {
        const meJson = await meRes.json();
        me = meJson.username;
      }
    } catch {}

    // 2. 타임라인 분기 / Timeline branching
    if (me) {
      // 로그인 O -> 내 home 타임라인
      // Logged in -> My home timeline
      console.log('[timeline] 로그인 유저 home 로드 / Login user home load');
      try {
        const homeRes = await fetch(`/api/v1/timelines/home?limit=20`, { credentials: 'include' });
        //const homeRes = await fetch(`/api/v1/timelines/public?limit=20`,{ credentials: 'include' });
        const json = await homeRes.json();
        let arr = Array.isArray(json)? json : json.data || [];

        // --  home 라우트가 제대로 작동안하면  public 보여주기 / Show the public page if the home route doesn't work properly.
        // if (arr.length === 0) {
        //   // home이 0개면 public으로 폴백 
        //   // Fallback to public if home is 0
        //   const pubRes = await fetch(`/api/v1/timelines/public?local=true&limit=20`, { credentials: 'include' });
        //   const pubJson = await pubRes.json();
        //   arr = Array.isArray(pubJson)? pubJson : pubJson.data || [];
        // }

        setTimeline(arr);
      } catch (e) {
        console.error(e);
      }
    } else {
      // 로그인 X -> URL의 @username 글 만
      // No login -> Only the @username post in the URL
      console.log('[timeline] 비로그인/not log in, param username:', username, '글만/only posts');
      const pubRes = await fetch(`/api/v1/timelines/public?local=true&limit=20`);
      const json = await pubRes.json();
      const arr = Array.isArray(json)? json : json.data || [];

      // @user1 페이지면 user1 글만 필터
      // If on the user1 page, filter to show only user1's posts.
      const filtered = username? arr.filter((p:any) => p.account?.username === username || p.account?.acct?.startsWith(username)) : arr;
      console.log('[timeline] 비로그인 filtered:', filtered.length);
      setTimeline(filtered);
    }
    setLoading(false);
  };
  init();
}, [username]);


  // ✅ myapp61
  // 좋아요,부스트 실행 후 타임라인 호출을 한번 더 실행
  // Call the timeline again after executing Like/Boost.
  const refreshTimeline = async () => {
    if (!username) return;
    try {
      // refresh_token있으면 새로운 access token발급,새로운 access token 리턴
      // If a refresh token is present, issue a new access token and return it.
      const meRes = await fetch(`/api/auth/me`, { credentials: 'include', cache: 'no-store' });
      const isLoggedIn = meRes.ok;

      // 페이지네이션 적용 / Applying pagination
      let dataUrl = '';
      if (isLoggedIn) {
        dataUrl = `/api/v1/timelines/home?limit=20&format=cursor&t=${Date.now()}`;
        console.log('[refresh] 로그인/login -> home');
      } else {
        dataUrl = `/api/v1/timelines/public?local=true&limit=20&format=cursor&t=${Date.now()}`;
        console.log('[refresh] 비로그인/not login -> public');
      }

      const res = await fetch(dataUrl, { cache: 'no-store', credentials: 'include' });
      if (res.ok) {
        const json = await res.json();
        let arr = Array.isArray(json)? json : json.data || [];
        if (!isLoggedIn && username) {
          arr = arr.filter((p: any) =>
            p.account?.username === username ||
            p.username === username ||
            p.account?.acct?.startsWith(username as string)
          );
        }
        setTimeline(arr);
        return;
      }
    } catch (e) {
      console.error('[refresh] fail', e);
    }

    try {
      const res = await fetch(`/api/v1/timelines/public?local=true&limit=20&format=cursor&t=${Date.now()}`, { cache: 'no-store', credentials: 'include' });
      const json = await res.json();
      setTimeline(Array.isArray(json)? json : json.data || []);
    } catch {}
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

      // ✅ 서버 진실값으로 덮어쓰기
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
      console.error('❌ boost 실패/boost failed', e);
      await refreshTimeline();
    }
  };

  // ✅ myapp29 - 좋아요 - DB 기준으로 수정! / Like - Updated based on DB
  const handleLike = async (post: any) => {

    // ✅ 항상 최신 timeline에서 찾기 / Always find from the latest timeline
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
      console.log('⭐ like 응답 / Like response', data);

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
  const ActiveTheme = getThemeComponent(theme as any) || themeRegistry.themeex?.component || themeRegistry[themeNames[0]]?.component;
  if (!ActiveTheme) return <div>No themes found</div>;


  return <ActiveTheme {...props} />;
}