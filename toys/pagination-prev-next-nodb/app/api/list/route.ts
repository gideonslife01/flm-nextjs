// app/api/list/route.ts

import fs from 'fs';
import path from 'path';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const limit = parseInt(searchParams.get('limit') || '20');
  const maxId = searchParams.get('max_id'); // 커서로 사용할 ID / ID to be used as a cursor

  // 파일 읽기 / read file
  const filePath = path.join(process.cwd(), 'data', 'data.json');
  const fileContent = fs.readFileSync(filePath, 'utf8');
  const allData = JSON.parse(fileContent);

  let params: any[] = [];
  
  // 커서(max_id) 기반 필터링 / Cursor-based (max_id) filtering
  let startIndex = 0;

  if (maxId) {
   startIndex = allData.findIndex((item: any) => item.id > Number(maxId)) + 1;
  }

  // 페이징 처리 / Pagination
  const slicedData = allData.slice(startIndex, startIndex + limit);

  // 다음 커서 결정 / Align next cursor
  let nextCursor = null;
  if (slicedData.length === limit && (startIndex + limit < allData.length)) {
    const lastItem = slicedData[slicedData.length - 1];
    nextCursor = (lastItem.id + 1).toString();
  }


  return NextResponse.json({
    data: slicedData,
    nextCursor: nextCursor,
    hasMore: nextCursor,
  }, {
    headers: { 'Cache-Control': 'no-store' },
  });
}