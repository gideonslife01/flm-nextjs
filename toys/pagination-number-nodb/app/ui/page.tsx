// app/ui/page.tsx
// - prev / next pagination

'use client';

import { useCursorPagination } from '@/app/hooks/useCursorPagination';

export default function PageList() {

  const {
    currentData,
    currentPage,
    totalPages, // ✅
    goToPage, // ✅
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

  // visible pages✅
  const pageWindow = 2;
  const startPage = Math.max(1, currentPage - pageWindow);
  const endPage = Math.min(totalPages, currentPage + pageWindow);
  const visiblePages = Array.from(
    { length: endPage - startPage + 1 },
    (_, index) => startPage + index
  );

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
      <div className="mt-8 flex items-center justify-center gap-2">

        <button
          onClick={handlePrev}
          disabled={!hasPrevPage || isLoading || isFetchingNextPage}
          className="rounded border px-3 py-2 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40"
        >
          〈이전〉
        </button>

        {/**✅ Page Number */}
        {startPage > 1 && (
          <>
            <button
              onClick={() => goToPage(1)}
              className="min-w-10 rounded border bg-white px-3 py-2 hover:bg-gray-100"
            >
              1
            </button>
            {startPage > 2 && <span className="px-1">…</span>}
          </>
        )}

        {visiblePages.map((pageNumber) => (
          <button
            key={pageNumber}
            onClick={() => {
              goToPage(pageNumber);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            disabled={isLoading || isFetchingNextPage}
            aria-current={currentPage === pageNumber ? 'page' : undefined}
            className={`min-w-10 rounded border px-3 py-2 disabled:opacity-40 ${
              currentPage === pageNumber
                ? 'border-blue-600 bg-blue-600 text-white'
                : 'bg-white hover:bg-gray-100'
            }`}
          >
            {pageNumber}
          </button>
        ))}

        {(endPage < totalPages ||
          (currentPage === totalPages && hasNextPage)) && (
          <span className="px-1">…</span>
        )}

        <button
          onClick={handleNext}
          disabled={!hasNextPage || isLoading || isFetchingNextPage}
          className="rounded border px-3 py-2 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {isFetchingNextPage ? '불러오는 중…' : '〈다음〉'}
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
