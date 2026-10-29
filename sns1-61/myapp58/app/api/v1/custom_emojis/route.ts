// ✅ myapp55 - For Tusky
// /app/api/v1/custom_emojis/route.ts

import { NextResponse } from 'next/server';
export async function GET() {
  return NextResponse.json([], { headers: { 'Access-Control-Allow-Origin': '*' } });
}