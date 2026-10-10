// ✅ myapp55 - For Tusky
// app/api/v1/announcements/route.ts

import { NextResponse } from 'next/server';
export async function GET() {
  return NextResponse.json([], { headers: { 'Access-Control-Allow-Origin': '*' } });
}