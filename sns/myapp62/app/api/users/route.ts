// app/api/users/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET() {
  const db = getDb();
  await db.init();
  const users = await db.listUsers();
  return NextResponse.json(users);
}

export async function POST(req: NextRequest) {
  const db = getDb();
  await db.init();
  const { id, name, email } = await req.json();
  
  // 값만 넘김, SQL은 드라이버 안에 있음
  const user = await db.createUser({ id, name, email });
  return NextResponse.json(user);
}