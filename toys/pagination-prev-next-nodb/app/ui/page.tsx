// app/ui/page.tsx
// - prev / next pagination

'use client';

import { useCursorPagination } from '@/app/hooks/useCursorPagination';

export default function PageList() {

  const {
    currentData,
    currentPage,
    goToPrevPage,
    goToNextPage,
    hasPrevPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
  } = useCursorPagination({
    key: ['datalist'],
    fetcher: async (cursor: string | undefined) => {
      const params = new URLSearchParams();
      params.set('limit', '20');
      if (cursor) {
        params.set('max_id', cursor);
      }

      const url = `/api/list?${params.toString()}`;
      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) throw new Error('Failed to fetch posts');

      const json = await res.json();
      return {
        data: json.data,
        nextCursor: json.nextCursor,
        hasMore: json.hasMore,
      };
    },
  });

  const handlePrev = () => {
    goToPrevPage();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleNext = async () => {
    await goToNextPage();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="p-4 max-w-3xl mx-auto">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">PageList</h1>
        <span className="text-sm text-gray-500">Page {currentPage}</span>
      </div>

      {/* 게시글 목록 / List of posts */}
      <div className="space-y-4">
        {isLoading ? (
          <p>로딩 중 / Loading...</p>
        ) : (
          currentData.map((post: any) => (
            <div key={post.id} className="p-4 border rounded shadow-sm">
              <h2 className="font-bold">{post.title}</h2>
              <p>{post.content}</p>
              <small className="text-gray-500">{post.created_at}</small>
            </div>
          ))
        )}
      </div>

      {/* 하단 Prev / Next 버튼 영역  */}
      {/* Bottom Prev / Next button area */}
      <div className="mt-8 flex items-center justify-center gap-4">
        <button
          onClick={handlePrev}
          disabled={!hasPrevPage || isLoading || isFetchingNextPage}
          className="px-4 py-2 border rounded bg-white hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          ← 이전 (Prev)
        </button>

        <span className="text-sm font-medium">
          {currentPage} 페이지/Page
        </span>

        <button
          onClick={handleNext}
          disabled={!hasNextPage || isLoading || isFetchingNextPage}
          className="px-4 py-2 border rounded bg-white hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {isFetchingNextPage ? '불러오는 중 / loading ...' : '다음 (Next) →'}
        </button>
      </div>

      {/* 디버깅용 / For debugging purposes */}
      <div className="mt-6 text-xs text-gray-500 space-y-1">
        <div>hasPrevPage: {String(hasPrevPage)}</div>
        <div>hasNextPage: {String(hasNextPage)}</div>
        <div>current page count: {currentData.length}</div>
      </div>
    </div>
  );
}
