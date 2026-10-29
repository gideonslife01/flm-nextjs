// app/api/v1/timelines/home/route.ts - ✅ myapp33-6
import { NextResponse } from 'next/server';

export async function GET() {
  // ✅ 빈 타임라인! (나중에 Outbox 글 가져오게 할 수 있음!) / Empty timeline! (Later, you can fetch posts from the Outbox!)
  return NextResponse.json([]);
}

// CORS 에러 방지용 OPTIONS 처리 / Handle OPTIONS to prevent CORS errors
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}