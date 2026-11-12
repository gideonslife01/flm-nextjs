// app/hooks/useCursorPagination.ts
// 모든 리스트에서 재사용 (react-query 사용하지 않음) 
// Reusable across all lists (without using React Query)

'use client';
import { useState, useCallback, useEffect,useRef } from 'react'; 

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
  const [pages, setPages] = useState<T[][]>(initialData.length? [initialData] : []);
  
  // 마지막글 id하나만 저장 / Save only the ID of the last post.
  const nextCursorRef = useRef<string | null>(
    initialData.length > 0 ? (initialData[initialData.length - 1] as any)?.id || null : null
  );
  
  const [hasNextPage, setHasNextPage] = useState(true);
  const [isFetchingNextPage, setIsFetchingNextPage] = useState(false);
  const [isLoading, setIsLoading] = useState(pages.length === 0);

  useEffect(() => {
    // 빈 상태에서 시작, initialData 무시 / Start empty, ignore initialData
    setPages([]);                 // 글 데이터 초기화 / Initialize post data
    nextCursorRef.current = null; // 글 id 초기화 / Reset post ID
    setHasNextPage(true);         // 페이지 더 있음 / More pages follow
    setIsLoading(true);           // 로딩 중 / Loading...

    // 첫 페이지 직접 fetch
    // useEffect는 async를 사용하지 못함, 일반함수에서는 async사용 가능
    (async () => {
      try {
        const res: any = await fetcher(undefined);
        const data = Array.isArray(res)? res : res.data || [];
        const cursor = Array.isArray(res)? data[data.length-1]?.id || null : res.nextCursor;
        const hasMore = Array.isArray(res)? data.length >= 20 : res.hasMore;

        // console.log(`hook hasmore : ${hasMore}`)

        if (data.length > 0) setPages([data]);
        nextCursorRef.current = cursor;
        setHasNextPage(hasMore);
        // console.log(`hook hansNextPage : ${hasNextPage}`)        
      } catch(e) {
        console.error(e);
      } finally {
        setIsLoading(false);
      }
    })();
  }, [JSON.stringify(key)]); // key의 문자열이 달라졌는지 학인 / Check if the key string has changed



   // 진짜 데이터 가져오기 / Fetch real data
  const fetchNextPage = useCallback(async () => {
    if (isFetchingNextPage ||!hasNextPage) return;
    setIsFetchingNextPage(true);
    try {

      const res: any = await fetcher(nextCursorRef.current || undefined);
      const data = Array.isArray(res)? res : res.data || [];

      // - 데이터 마지막 -1 번째 데이터의id가 커서(다음에 호출을 시작할 데이터 id)
      // - The ID of the second-to-last data item serves as the cursor (the ID from which the next data retrieval should begin)
      const cursor = Array.isArray(res)? data[data.length-1]?.id || null : res.nextCursor;
      const hasMore = Array.isArray(res)? data.length >= 20 : (res.hasMore?? true);

      if (data.length === 0) {
        console.log('data.length === 0');
        setHasNextPage(false);
        return;
      }
      
      // 중복 제거 로직 
      // Deduplication logic
      setPages(prev => {
        // Set : 중복 없는 집합 / Set with no duplicates
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

  // 2차원배열을 1차원 배열로 펴기 
  // Changing the key resets the timeline data (selecting the 'Local' tab from the 'Home' tab clears the timeline).
  const flatData = pages.flat().filter(Boolean) as T[]; // ✅ myapp61 - add filter(Boolean)

  return {
    flatData,
    pages: pages.map(data => ({ data })),
    fetchNextPage,      // 다음 페이지 가져오는 함수 / Function to fetch the next page
    hasNextPage,        // 다음 페이지가 있는지 / Whether there is a next page
    isFetchingNextPage, // 다음 페이지 로딩중인지 / Checking if the next page is loading...
    isLoading,          // 첫 로딩중인지 / Is it loading for the first time?
  };
}