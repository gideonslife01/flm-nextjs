// ✅ myapp55 - For Tusky
// /app/api/v2/notifications/policy/route.ts
import { NextResponse } from 'next/server';
export async function GET() {
  return NextResponse.json({ for_not_following: 'accept', for_not_followers: 'accept', for_new_accounts: 'accept', for_private_mentions: 'accept', for_limited_accounts: 'accept' });
}