// ✅ myapp44 - pinafore/NotificationList.tsx 

// app/usersui/[username]/_components/themes/themeex/NotificationsList.tsx
// ✅ myapp59 - Tailwind + 커서 페이지네이션 / Tailwind + CursonPagination

'use client';
import { useRef, useEffect } from 'react';
import { useCursorPagination } from '@/app/hooks/useCursorPagination';

export default function NotificationsList({ username, style }: any) {
  const {
    flatData: notis,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading
  } = useCursorPagination({
    key: ['notifications', username],
    fetcher: async (cursor) => {
      const params = new URLSearchParams();
      params.set('username', username);
      params.set('limit', '30');
      if (cursor) params.set('max_id', cursor);

      const r = await fetch(`/api/v1/notifications?${params.toString()}`, { credentials: 'include' });
      const data = await r.json();
      const list = Array.isArray(data)? data : data.data || [];

      return {
        data: list,
        nextCursor: list.length === 30? list[list.length - 1]?.id || list[list.length - 1]?.created_at : null,
        hasMore: list.length === 30,
      };
    },
  });

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

  if (isLoading) return <div className="p-5 text-center text-[#999]">Loading...</div>;

  return (
    <div style={style} className="bg-white">
      {notis.map((n: any) => (
        <div key={n.id} className="px-4 py-3 border-b border-[#eee] hover:bg-[#fafafe]">
          <div className="flex gap-3">
            <div className="w-9 h-9 rounded-full bg-[#6364ff] text-white flex items-center justify-center font-extrabold shrink-0">
              {(n.account?.display_name || n.account?.username || '?')[0]}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex gap-1.5 items-center">
                <b className="text-">{n.account?.display_name || n.account?.username}</b>
                <span className="text-[#657786] text- truncate">{n.account?.acct}</span>
              </div>
              <div className="text- mt-1">
                {n.type === 'follow' && <span>님이 팔로우 했습니다 <span className="text-[#6364ff]">👤</span></span>}
                {n.type === 'favourite' && <span>님이 좋아요 했습니다 ❤</span>}
                {n.type === 'reblog' && <span>님이 부스트 했습니다 🔁</span>}
                {!['follow','favourite','reblog'].includes(n.type) && <span>{n.type}</span>}
              </div>
              {n.status?.content && (
                <div className="mt-2 text- text-[#444] line-clamp-2 border-l-2 border-[#e6ecf0] pl-2" dangerouslySetInnerHTML={{ __html: n.status.content }} />
              )}
            </div>
            <div className="text- text-[#999] shrink-0">
              {n.created_at? new Date(n.created_at).toLocaleTimeString() : ''}
            </div>
          </div>
        </div>
      ))}

      {notis.length === 0 && <div className="p-10 text-center text-[#999]">알림 없음 / No notifications</div>}

      <div ref={loaderRef} className="h-10 flex items-center justify-center text-sm text-[#999]">
        {isFetchingNextPage && <span>불러오는 중 / Loading ...</span>}
        {!hasNextPage && notis.length > 0 && <span className="text-xs">끝 / No more</span>}
      </div>
    </div>
  );
}