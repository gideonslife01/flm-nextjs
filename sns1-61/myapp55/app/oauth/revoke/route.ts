// ✅ myapp55 - For Tusky
// /app/oauth/revoke/route.ts
import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({})) as any;
    const token = body.token;
    if (token) {
      try {
        db.prepare(`DELETE FROM oauth_tokens WHERE access_token=?`).run(token);
        db.prepare(`DELETE FROM sessions WHERE access_token=?`).run(token);
      } catch {}
    }
  } catch {}
  return NextResponse.json({});
}
export async function GET() { return NextResponse.json({}); }