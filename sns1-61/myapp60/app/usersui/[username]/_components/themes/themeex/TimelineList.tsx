// app/usersui/[username]/_components/themes/Themeex/TimelineList.tsx
// ✅ myapp54 - 타임라인 분리 / Timeline Separation
// ✅ myapp56 - Hom,Local,Federated 탭 추가 / Add Hom, Local, Federated Tabs
// ✅ myapp59 - Pagenation

'use client';

import { useState, useEffect, useRef } from "react";
import { useCursorPagination } from '@/app/hooks/useCursorPagination'; // ✅ myapp59 - CursorPagination

const DOMAIN = process.env.DOMAIN || 'aloy-horizon.duckdns.org';

const toAbsolute = (u: string) => {
  if (!u) return '';
  return u.startsWith('http') ? u : `https://${DOMAIN}${u}`;
};

function Avatar({ actor, username, size = 46 }: { actor: string, username: string, size?: number }) {
  const seed = actor?.startsWith('https://')
    ? (() => { try { return new URL(actor).pathname.split('/').pop() || username } catch { return username } })()
    : actor || username;
  const initial = (seed?.[0] || 'U').toUpperCase();
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: '#6364ff', color: 'white',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontWeight: 'bold', fontSize: size * 0.4, flexShrink: 0
    }}>{initial}</div>
  );
}

function getDisplayName(actorOrUsername: string) {
  if (!actorOrUsername) return 'unknown';
  if (actorOrUsername.startsWith('https://')) {
    try {
      const url = new URL(actorOrUsername);
      const username = url.pathname.split('/').pop() || 'user';
      return `${username}@${url.hostname}`;
    } catch { return actorOrUsername.split('/').pop() || actorOrUsername; }
  }
  return actorOrUsername;
}

// ✅ myapp56 - Hom,Local,Federated 탭 추가 / Add Hom, Local, Federated Tabs
type TabType = 'home' | 'local' | 'federated';
type Props = {
  timeline: any[];
  currentUser: string | null;
  tab: TabType;
  onTabChange: (t: TabType) => void;
  onDelete: (id: string) => void;
  onBoost: (p: any) => void;
  onLike: (p: any) => void;
  onShare: (p: any) => void;
};

export default function TimelineList({ 
  timeline: initialTimeline, currentUser, tab, onTabChange, onDelete, onBoost, onLike, onShare }: Props) {
  const [showDropdown, setShowDropdown] = useState(false); // ✅ myapp56 - Hom,Local,Federated 탭 추가 / Add Hom, Local, Federated Tabs

  // ✅ myapp59 - useCurserPagination
  const {
    flatData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useCursorPagination({
    key: ['timeline', tab],
    initialData: initialTimeline.slice(0, 20), // ✅ myapp60
    fetcher: async (cursor) => {
      const params = new URLSearchParams();
      params.set('limit', '20');
      if (cursor) params.set('max_id', cursor);
      const res = await fetch(`/api/v1/timelines/${tab}?${params.toString()}`, { credentials: 'include' });
      if (!res.ok) throw new Error('fetch fail');
      const json = await res.json();
      const arr = Array.isArray(json)? json : (json.data || json.statuses || []);
      const withMine = arr.map((p:any) => ({
      ...p,
        isMine: p.username === currentUser || p.account?.username === currentUser || p.acct === currentUser
      }));
      return {
        data: withMine,
        nextCursor: withMine.length? withMine[withMine.length-1].id : null,
        hasMore: withMine.length >= 20
      };
    },
  });

  // 첫 페이지는 initialTimeline 쓰다가, fetch 후에는 flatData 사용
  // Use initialTimeline for the first page, then use flatData after fetch
  const isInitialLoad = flatData.length === 0;
  //const data = flatData.length > 0? flatData : initialTimeline;
  //const data = isInitialLoad? initialTimeline : flatData;

  // ✅ myapp60 - flatData만 사용, initialTimeline 중복 사용 안 함
  const flat = (flatData || []).flat().filter(Boolean) as any[];
  const data = flat.length > 0? flat : initialTimeline.filter((p:any) => p && p.id);

  // ✅ 무한스크롤 옵저버 / infinite scroll observer
  const loaderRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = loaderRef.current;
    if (!el ||!hasNextPage) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting &&!isFetchingNextPage) fetchNextPage();
      },
      { threshold: 0.3 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  if (data.length === 0) {
    return <div className="p-5 text-[#999]">타임라인이 비어있습니다 / No posts</div>;
  }


  return (
    <>
      {/* 
      ✅ myapp56 - Home/Local/Federated 드롭다운 메뉴, Css-> Tailwind 변환 
      Home/Local/Federated dropdown menu, CSS to Tailwind conversion
      */}
      <div className="flex justify-between items-center px-4 py-2.5 border-b border-[#e6ecf0] bg-white sticky top-0 z-[5]">
        <div className="relative">
          <button
            className="flex items-center gap-2 px-3.5 py-2 border border-[#e6ecf0] rounded-full bg-white cursor-pointer text-sm font-semibold hover:bg-[#f3f4f6]"
            onClick={() => setShowDropdown(!showDropdown)}
          >
            <span>{tab === 'home'? '🏠' : tab === 'local'? '🏘' : '🌍'}</span>
            <span className="capitalize">{tab}</span>
            <span className="text- text-[#999] ml-1">{showDropdown? '▲' : '▼'}</span>
          </button>
          {showDropdown && (
            <div className="absolute top-full left-0 mt-2 w- bg-white border border-[#e6ecf0] rounded-xl shadow-[0_8px_24px_rgba(0,0,0,0.12)] overflow-hidden z-10">
              <button
                className={`w-full flex gap-3 items-center px-3.5 py-3 border-none bg-white text-left cursor-pointer hover:bg-[#f7f9fa] ${tab === 'home'? 'bg-[#fafafe]' : ''}`}
                onClick={() => { onTabChange('home'); setShowDropdown(false); }}
              >
                <span className="text-lg">🏠</span>
                <div className="flex flex-col">
                  <b className="text-sm">Home</b>
                  <small className="text- text-[#657786]">팔로우한 사람들/People you follow</small>
                </div>
              </button>
              <button
                className={`w-full flex gap-3 items-center px-3.5 py-3 border-none bg-white text-left cursor-pointer hover:bg-[#f7f9fa] ${tab === 'local'? 'bg-[#fafafe]' : ''}`}
                onClick={() => { onTabChange('local'); setShowDropdown(false); }}
              >
                <span className="text-lg">🏘</span>
                <div className="flex flex-col">
                  <b className="text-sm">Local</b>
                  <small className="text- text-[#657786]">내 서버 글/My server posts</small>
                </div>
              </button>
              <button
                className={`w-full flex gap-3 items-center px-3.5 py-3 border-none bg-white text-left cursor-pointer hover:bg-[#f7f9fa] ${tab === 'federated'? 'bg-[#fafafe]' : ''}`}
                onClick={() => { onTabChange('federated'); setShowDropdown(false); }}
              >
                <span className="text-lg">🌍</span>
                <div className="flex flex-col">
                  <b className="text-sm">Federated</b>
                  <small className="text- text-[#657786]">페디버스/fediverse</small>
                </div>
              </button>
            </div>
          )}
        </div>
        <div className="text-xs text-[#999]">{data.length} toots</div>
      </div>
      
      {data.filter((p:any) => p && p.id).map((p: any, idx: number) => {
        const uniqueKey = `${p.id}-${idx}`;
        const isMine = !!(currentUser && (
          p.isMine || p.username === currentUser || p.acct === currentUser || p.account?.username === currentUser
        ));
        
        return (
          <article key={uniqueKey} className="flex gap-3 px-4 py-3 border-b border-[#e6ecf0] hover:bg-[#fafafe]/50">
            <Avatar actor={p.actor} username={p.username} />
            <div className="flex-1 min-w-0">
              <div className="flex gap-2 items-center flex-wrap">
                <b className="text-">{getDisplayName(p.actor)}</b>
                <span className="text-[#999] text-xs">{new Date(p.created_at).toLocaleString()}</span>
                {p.isBoostedPost && <span className="text-[#16a34a] text-xs bg-[#dcfce7] px-1.5 py-0.5 rounded">🔁 {getDisplayName(p.actor)}</span>}
                {currentUser && isMine && (
                  <button onClick={() => onDelete(p.id)} className="text-[#e0245e] ml-auto text-xs hover:underline">
                    🗑 Delete
                  </button>
                )}
              </div>
              <div className="my-2 leading-[1.4] break-words text- [&_p]:m-0" dangerouslySetInnerHTML={{ __html: p.content }} />
              {p.media_attachments && p.media_attachments.length > 0 && (
                <div className={`grid gap-2 mt-2.5 rounded-xl overflow-hidden ${p.media_attachments.length === 1? 'grid-cols-1' : 'grid-cols-2'}`}>
                  {p.media_attachments.map((m: any) => (
                    <img key={m.id} src={toAbsolute(m.preview_url || m.url)} alt="media" loading="lazy" className="w-full max-h- object-cover rounded-lg border border-[#e6ecf0]" />
                  ))}
                </div>
              )}
              <div className="flex gap-4 mt-2">
                <button onClick={() => onBoost(p)} className={`bg-none border-none cursor-pointer text-[#999] px-2 py-1 rounded-xl text-sm hover:bg-[#f3f4f6] hover:text-[#333] ${p.isMyBoost? '!text-[#1b9c59] font-bold bg-[#dcfce7]' : ''}`}>🔁 {p.boostCount || ''}</button>
                <button onClick={() => onLike(p)} className={`bg-none border-none cursor-pointer text-[#999] px-2 py-1 rounded-xl text-sm hover:bg-[#f3f4f6] hover:text-[#333] ${p.isMyLike? '!text-[#e0245e] bg-[#ffe4e6]' : ''}`}>⭐ {p.likeCount || ''}</button>
                <button onClick={() => onShare(p)} className="bg-none border-none cursor-pointer text-[#999] px-2 py-1 rounded-xl text-sm hover:bg-[#f3f4f6] hover:text-[#333]">✈</button>
                <button className="bg-none border-none cursor-pointer text-[#999] px-2 py-1 rounded-xl text-sm hover:bg-[#f3f4f6] hover:text-[#333]">💬</button>
              </div>
            </div>
          </article>
        );
      })}

      {/* ✅ myapp59 - 무한스크롤 트리거 / Infinite scroll trigger */}
      <div ref={loaderRef} className="h-10 flex items-center justify-center text-sm text-[#999]">
        {isFetchingNextPage && <span>불러오는 중...</span>}
        {!hasNextPage && data.length > 0 && <span className="text-xs">끝 / No more posts</span>}
      </div>
    </>
  );

}
