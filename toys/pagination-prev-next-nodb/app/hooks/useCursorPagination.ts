// app/hooks/useCursorPagination.ts

'use client';
import { useState, useCallback, useEffect, useRef } from 'react'; 

type CursorResponse<T> = {
  data: T[];
  nextCursor: string | null;
  hasMore: boolean;
};

type UseCursorOptions<T> = {
  key: (string | number | undefined)[];
  fetcher: (cursor?: string) => Promise<CursorResponse<T>> | T[]; 
  initialData?: T[];
};

export function useCursorPagination<T>({ key, fetcher, initialData = [] }: UseCursorOptions<T>) {

  // 불러온 페이지들을 페이지 단위로 캐싱하는 2차원 배열
  // A 2D array that caches loaded pages on a per-page basis
  const [pages, setPages] = useState<T[][]>(initialData.length ? [initialData] : []);

  // 현재 보고 있는 페이지 인덱스 (0부터 시작)
  // Index of the page currently being viewed (starts from 0)
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  
  // 마지막글 id하나만 저장 / Save only the ID of the last post.
  const nextCursorRef = useRef<string | null>(
    initialData.length > 0 ? (initialData[initialData.length - 1] as any)?.id || null : null
  );
  
  // 서버에 더 불러올 데이터가 남아있는지 여부 / Whether there is any remaining data to be fetched from the server
  const [hasMoreFromServer, setHasMoreFromServer] = useState(true);
  const [isFetchingNextPage, setIsFetchingNextPage] = useState(false);
  const [isLoading, setIsLoading] = useState(pages.length === 0);

  useEffect(() => {
    // 빈 상태에서 시작, initialData 무시 / Start empty, ignore initialData
    setPages([]);                 // 글 데이터 초기화 / Initialize post data
    setCurrentPageIndex(0);       // 페이지 인덱스 초기화 / Reset page index
    nextCursorRef.current = null; // 글 id 초기화 / Reset post ID
    setHasMoreFromServer(true);   // 페이지 더 있음 / More pages follow
    setIsLoading(true);           // 로딩 중 / Loading...

    // 첫 페이지 직접 fetch / Fetch the first page directly
    (async () => {
      try {
        const res: any = await fetcher(undefined);
        const data = Array.isArray(res) ? res : res.data || [];
        const cursor = Array.isArray(res) ? data[data.length - 1]?.id || null : res.nextCursor;
        const hasMore = Array.isArray(res) ? data.length >= 20 : res.hasMore;

        if (data.length > 0) setPages([data]);
        nextCursorRef.current = cursor;
        setHasMoreFromServer(hasMore);
      } catch (e) {
        console.error(e);
      } finally {
        setIsLoading(false);
      }
    })();
  }, [JSON.stringify(key)]); // key의 문자열이 달라졌는지 확인 / Check if the key string has changed

  // [Prev 버튼용] 이전 페이지로 이동 / [For 'Prev' button] Go to the previous page
  const goToPrevPage = useCallback(() => {
    if (currentPageIndex > 0) {
      setCurrentPageIndex((prev) => prev - 1);
    }
  }, [currentPageIndex]);

  // [Next 버튼용] 다음 페이지로 이동 (이미 불러온 페이지면 즉시 이동, 없으면 새로 fetch)
  // [For 'Next' button] Navigate to the next page (move immediately if already loaded; otherwise, fetch it)
  const goToNextPage = useCallback(async () => {
    if (isFetchingNextPage) return;

    // 1. 이미 캐시된 다음 페이지가 있는 경우 API 호출 없이 인덱스만 증가
    // If the next page is already cached, simply increment the index without making an API call.
    if (currentPageIndex + 1 < pages.length) {
      setCurrentPageIndex((prev) => prev + 1);
      return;
    }

    // 2. 새로운 다음 페이지 데이터를 서버에서 불러온 뒤 인덱스 증가
    // Increase the index after fetching new next page data from the server.
    if (!hasMoreFromServer) return;
    setIsFetchingNextPage(true);

    try {
      const res: any = await fetcher(nextCursorRef.current || undefined);
      const data = Array.isArray(res) ? res : res.data || [];
      const cursor = Array.isArray(res) ? data[data.length - 1]?.id || null : res.nextCursor;
      const hasMore = Array.isArray(res) ? data.length >= 20 : (res.hasMore ?? true);

      if (data.length === 0) {
        setHasMoreFromServer(false);
        return;
      }

      // 중복 제거 후 새 페이지 추가 및 페이지 이동 / Adding a new page and moving pages after removing duplicates
      const seen = new Set(pages.flat().map((p: any) => p.id));
      const filtered = data.filter((p: any) => p.id && !seen.has(p.id));

      if (filtered.length === 0) {
        setHasMoreFromServer(false);
        return;
      }

      setPages((prev) => [...prev, filtered]);
      setCurrentPageIndex((prev) => prev + 1);
      nextCursorRef.current = cursor;
      setHasMoreFromServer(hasMore);
    } catch (e) {
      console.error(e);
    } finally {
      setIsFetchingNextPage(false);
    }
  }, [currentPageIndex, pages, hasMoreFromServer, isFetchingNextPage, fetcher]);

  // 현재 페이지 데이터 및 버튼 활성화 여부 / Current page data and button activation status
  const currentData = (pages[currentPageIndex] || []) as T[];
  const hasPrevPage = currentPageIndex > 0;
  const hasNextPage = currentPageIndex + 1 < pages.length || hasMoreFromServer;

  return {
    currentData,                       // 현재 페이지의 아이템 목록 / List of items on the current page
    currentPage: currentPageIndex + 1, // 현재 페이지 번호 (1부터 시작) / Current page number (starting from 1)
    goToPrevPage,                      // 이전 페이지 이동 함수 / Function to navigate to the previous page
    goToNextPage,                      // 다음 페이지 이동 함수 / Function to navigate to the next page
    hasPrevPage,                       // 이전 페이지 존재 여부 / Existence of a previous page
    hasNextPage,                       // 다음 페이지 존재 여부 / Existence of a next page
    isFetchingNextPage,                // 다음 페이지 로딩중인지 / Whether the next page is loading
    isLoading,                         // 첫 로딩중인지 / Whether it is currently loading for the first time
  };
}
