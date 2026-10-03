// ✅ myapp55 - For Tusky
// app/api/v1/markers/route.ts
import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    notifications: { last_read_id: "0", version: 1, updated_at: new Date().toISOString() },
    home: { last_read_id: "0", version: 1, updated_at: new Date().toISOString() }
  }, { headers: { 'Access-Control-Allow-Origin': '*' } });
}

export async function POST(req: Request) {
  const body = await req.json().catch(()=>({}));
  return NextResponse.json(body, { headers: { 'Access-Control-Allow-Origin': '*' } });
}