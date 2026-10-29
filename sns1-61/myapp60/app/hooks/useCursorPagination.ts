// app/hooks/useCursorPagination.ts
// ✅ myapp59 
// - 모든 리스트에서 재사용 (react-query 사용하지 않음) 
// Reusable across all lists (without using React Query)

'use client';
import { useState, useCallback, useEffect } from 'react';

type CursorResponse<T> = {
  data: T[];
  nextCursor: string | null;
  hasMore: boolean;
};

type UseCursorOptions<T> = {
  key: (string | number | undefined)[];
  fetcher: (cursor?: string) => Promise<CursorResponse<T>>;
  initialData?: T[];
};

export function useCursorPagination<T>({ key, fetcher, initialData = [] }: UseCursorOptions<T>) {
  const [pages, setPages] = useState<T[][]>(initialData.length? [initialData] : []);
  //const [nextCursor, setNextCursor] = useState<string | null>(null);
    const [nextCursor, setNextCursor] = useState<string | null>(() => {
    // initialData가 있으면 마지막 id를 nextCursor로 설정
    if (initialData.length > 0) {
      const last = initialData[initialData.length - 1] as any;
      return last?.id || null;
    }
    return null;
  });
  
  const [hasNextPage, setHasNextPage] = useState(true);
  const [isFetchingNextPage, setIsFetchingNextPage] = useState(false);
  const [isLoading, setIsLoading] = useState(pages.length === 0);

  // key가 바뀌면 리셋 / Reset if the key changes.
  // key = home,federated,local
  useEffect(() => {
    setPages(initialData.length? [initialData] : []);
    setNextCursor(null);
    setHasNextPage(true);
    setIsLoading(initialData.length === 0);
  }, [JSON.stringify(key)]);

  const fetchNextPage = useCallback(async () => {
    if (isFetchingNextPage ||!hasNextPage) return;
    setIsFetchingNextPage(true);
    try {
      const res = await fetcher(nextCursor || undefined);

      // ✅ myapp60 - 배열과 객체 모두 가능 / Both arrays and objects are possible
      const data = Array.isArray(res)? res : res.data || [];
      //const cursor = Array.isArray(res)? (data[data.length-1]?.id || null) : res.nextCursor;
      //const hasMore = Array.isArray(res)? data.length >= 20 : (res.hasMore?? true);

      setPages(prev => [...prev, res.data]);
      setNextCursor(res.nextCursor);
      setHasNextPage(res.hasMore);
    } catch (e) {
      console.error(e);
    } finally {
      setIsFetchingNextPage(false);
      setIsLoading(false);
    }
  }, [fetcher, nextCursor, hasNextPage, isFetchingNextPage]);

      useEffect(() => {
      setPages(initialData.length? [initialData] : []);
      setNextCursor(initialData.length? (initialData[initialData.length-1] as any)?.id || null : null);
      setHasNextPage(true);
      setIsLoading(initialData.length === 0);
    }, [JSON.stringify(key), JSON.stringify(initialData)]); // initialData도 deps에

  // 첫 로드 / first load
  useEffect(() => {
    if (pages.length === 0) {
      fetchNextPage();
    }
  }, []);

  const flatData = pages.flat();

  return {
    flatData,
    pages: pages.map(data => ({ data })),
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
  };
}