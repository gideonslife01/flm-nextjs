// app/usersui/[username]/_components/themes/themeex/FollowersList.tsx
// ✅ myapp59 - Tailwind + 커서 페이지네이션 / Tailwind + Curson Pagination

'use client';
import { useRef, useEffect } from 'react';
import { useCursorPagination } from '@/app/hooks/useCursorPagination'; 

export default function FollowersList({ username, style }: { username: string, style?: any }) {
  const {
    flatData: users,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading
  } = useCursorPagination({
    key: ['followers', username],
    fetcher: async (cursor) => {
      const params = new URLSearchParams();
      params.set('username', username);
      params.set('limit', '20');
      if (cursor) params.set('max_id', cursor);

      // ✅ /api/followerslist/route.ts가 커서 지원하도록 수정 필요
      const r = await fetch(`/api/followerslist?${params.toString()}`, { credentials: 'include' });
      const d = await r.json();
      const accounts = Array.isArray(d)? d : d.accounts || d.data || [];

      // 커서 응답 형식으로 변환 (API가 아직 offset이면 프론트에서 임시 처리)
      return {
        data: accounts,
        nextCursor: accounts.length === 20? accounts[accounts.length - 1]?.created_at || String(accounts.length) : null,
        hasMore: accounts.length === 20,
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
      {users.map((u: any, i: number) => (
        <div key={u.id || i} className="flex gap-3 px-4 py-3 border-b border-[#eee] hover:bg-[#fafafe]">
          <div className="w- h- rounded-full bg-[#6364ff] text-white flex items-center justify-center font-extrabold shrink-0">
            {(u.display_name || u.username || '?')[0].toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <div className="font-bold text- truncate">{u.display_name || u.username}</div>
            <div className="text- text-[#657786] truncate">{u.acct || u.actor}</div>
          </div>
          <button className="ml-auto px-3 py-1 border border-[#e6ecf0] rounded-full text-xs font-bold hover:bg-[#f3f4f6]">
            Follow
          </button>
        </div>
      ))}

      {users.length === 0 && <div className="p-10 text-center text-[#999]">팔로워 없음 / No followers</div>}

      <div ref={loaderRef} className="h-10 flex items-center justify-center text-sm text-[#999]">
        {isFetchingNextPage && <span>불러오는 중...</span>}
        {!hasNextPage && users.length > 0 && <span className="text-xs">끝 / No more</span>}
      </div>
    </div>
  );
}