// app/api/users/[id]/route.ts
import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  const db = getDb();
  await db.init();
  await db.deleteUser(params.id);
  return NextResponse.json({ ok: true });
}