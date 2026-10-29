// app/hooks/useCursorPagination.ts
// ✅ myapp59 + myapp61
// - 모든 리스트에서 재사용 (react-query 사용하지 않음) 
// Reusable across all lists (without using React Query)

'use client';
import { useState, useCallback, useEffect,useRef } from 'react'; // ✅ myapp61 - add userRef

type CursorResponse<T> = {
  data: T[];
  nextCursor: string | null;
  hasMore: boolean;
};

type UseCursorOptions<T> = {
  key: (string | number | undefined)[];
  fetcher: (cursor?: string) => Promise<CursorResponse<T>> | T[]; // ✅ myapp61 - 배열도 허용 / Arrays are also allowed.
  initialData?: T[];
};

export function useCursorPagination<T>({ key, fetcher, initialData = [] }: UseCursorOptions<T>) {
  const [pages, setPages] = useState<T[][]>(initialData.length? [initialData] : []);
  //const [nextCursor, setNextCursor] = useState<string | null>(null);
  //const [nextCursor, setNextCursor] = useState<string | null>(() => {
  
// ✅ myapp61
const nextCursorRef = useRef<string | null>(
  initialData.length > 0 ? (initialData[initialData.length - 1] as any)?.id || null : null
);
  
  const [hasNextPage, setHasNextPage] = useState(true);
  const [isFetchingNextPage, setIsFetchingNextPage] = useState(false);
  const [isLoading, setIsLoading] = useState(pages.length === 0);

  // key가 바뀌면 리셋 / Reset if the key changes.
  // key = home,federated,local
  // useEffect(() => {
  //   setPages(initialData.length? [initialData] : []);
  //   setNextCursor(null);
  //   setHasNextPage(true);
  //   setIsLoading(initialData.length === 0);
  // }, [JSON.stringify(key)]);
    useEffect(() => {
    // ✅ myapp61 - 빈 상태에서 시작, initialData 무시
    setPages([]);
    nextCursorRef.current = null;
    setHasNextPage(true);
    setIsLoading(true);

    // ✅ myapp61 - 첫 페이지 직접 fetch
    (async () => {
      try {
        const res: any = await fetcher(undefined);
        const data = Array.isArray(res)? res : res.data || [];
        const cursor = Array.isArray(res)? data[data.length-1]?.id || null : res.nextCursor;
        const hasMore = Array.isArray(res)? data.length >= 20 : res.hasMore;

        if (data.length > 0) setPages([data]);
        nextCursorRef.current = cursor;
        setHasNextPage(hasMore);
      } catch(e) {
        console.error(e);
      } finally {
        setIsLoading(false);
      }
    })();
  }, [JSON.stringify(key)]);

  // ✅ myapp61 - 중복 id 제거
 const fetchNextPage = useCallback(async () => {
    if (isFetchingNextPage ||!hasNextPage) return;
    setIsFetchingNextPage(true);
    try {
      // ✅ myapp61 - ref 사용
      const res: any = await fetcher(nextCursorRef.current || undefined);
      const data = Array.isArray(res)? res : res.data || [];
      const cursor = Array.isArray(res)? data[data.length-1]?.id || null : res.nextCursor;
      const hasMore = Array.isArray(res)? data.length >= 20 : (res.hasMore?? true);

      if (data.length === 0) {
        setHasNextPage(false);
        return;
      }

      // ✅ myapp61 - 중복 id 제거 (알림 중복 표시 해결)
      setPages(prev => {
        const seen = new Set(prev.flat().map((p:any) => p.id));
        const filtered = data.filter((p:any) => p.id &&!seen.has(p.id));
        if (filtered.length === 0) {
          setHasNextPage(false);
          return prev;
        }
        return [...prev, filtered];
      });

      nextCursorRef.current = cursor;
      setHasNextPage(hasMore);

    } catch (e) {
      console.error(e);
    } finally {
      setIsFetchingNextPage(false);
      setIsLoading(false);
    }
  }, [fetcher, hasNextPage, isFetchingNextPage]);

  // 첫 로드 / first load
  // useEffect(() => {
  //   if (pages.length === 0) {
  //     fetchNextPage();
  //   }
  // }, []);

  //const flatData = pages.flat();
  // ✅ myapp61
  const flatData = pages.flat().filter(Boolean) as T[]; // ✅ myapp61 - filter(Boolean) 추가


  return {
    flatData,
    pages: pages.map(data => ({ data })),
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
  };
}