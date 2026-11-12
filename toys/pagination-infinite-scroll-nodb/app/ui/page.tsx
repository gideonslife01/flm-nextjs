// app/ui/page.tsx

'use client';
import { useState, useEffect, useRef } from "react";
import { useCursorPagination } from '@/app/hooks/useCursorPagination';

export default function PageList() {

 // Call pagination hook
  const {
    flatData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
  } = useCursorPagination({

    // 키는 다른 성격의 데이터를 호출할떄 사용함 / Keys are used when accessing data of a different nature.
    key: ['datalist'], 

    // 콜백함수 / callback function
    fetcher: async (cursor: string | undefined) => {
      const params = new URLSearchParams();
      params.set('limit', '20');
      if (cursor) {
        params.set('max_id', cursor);
      }

      // API
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


//console.log(`page hasNextPage : ${hasNextPage}`)


// 무한스크롤 옵저버 / infivite scroll observer
 const loaderRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    // 데이터 로딩중이면 실행하지 않음 / Do not execute if data is loading
    if (isLoading) return;
    const el = loaderRef.current;
    if (!el ||!hasNextPage) return;
    const observer = new IntersectionObserver(

    ([entry]) => {
        console.log('observer', entry.isIntersecting, hasNextPage, isFetchingNextPage);
        if (entry.isIntersecting && !isFetchingNextPage) {
            console.log('fetchNextPage 실행/excute');
            fetchNextPage();
        }
    },

      { threshold: 0.3 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [isLoading, hasNextPage, isFetchingNextPage, fetchNextPage]);

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">PageList</h1>
      
      <div className="space-y-4">
        {isLoading ? (
          <p>로딩 중/loading...</p>
        ) : (
          flatData.map((post: any) => (
            <div key={post.id} className="p-4 border rounded shadow-sm">
              <h2 className="font-bold">{post.title}</h2>
              <p>{post.content}</p>
              <small className="text-gray-500">{post.created_at}</small>
            </div>
          ))
        )}

            {/* 디버깅용 / For debugging purposes */}
            <div>
            hasNextPage:
            {String(hasNextPage)}
            </div>

            <div>
            count:
            {flatData.length}
            </div>
      </div>



      {/* 무한스크 옵저버 대신 버튼 사용 가능 / Buttons can be used instead of the infinite scroll observer. */}
      {/* {hasNextPage && (
        <div className="mt-8">
          {isFetchingNextPage ? (
            <p>더 불러오는 중...</p>
          ) : (
            <button 
              onClick={fetchNextPage}
              className="px-4 py-2 bg-blue-500 text-white rounded"
            >
              더 보기
            </button>
          )}
        </div>
      )} */}


      {/* 무한스크롤 옵저버 트리거 / Infinite Scroll Observer Trigger */}
      <div ref={loaderRef} className="h-10">
        {isFetchingNextPage && <span>불러오는 중 / Loading...</span>}
        {!hasNextPage && <span className="text-xs">끝 / No more posts</span>}
      </div>

    </div>
  );
}