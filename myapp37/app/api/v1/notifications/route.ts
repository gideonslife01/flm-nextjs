// ✅ myapp37 - myapp/api/notifications/route.ts

import { NextResponse } from 'next/server';

export async function GET() {
  // 아직! 구현 안 함! 빈 배열! / Not yet! Not implemented! Empty array!
  return NextResponse.json([], {
    headers: { 'Access-Control-Allow-Origin': '*' }
  });
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    }
  });
}