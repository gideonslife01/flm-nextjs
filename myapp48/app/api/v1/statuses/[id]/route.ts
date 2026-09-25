// ✅ myapp47 - app/api/v1/statuses/[id]/route.ts - Pinafore deletion

import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { sendDelete } from '@/lib/ap';

const DOMAIN = process.env.DOMAIN || 'aloy-horizon.duckdns.org';

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params; 
  const auth = req.headers.get('Authorization') || '';
  const token = auth.replace('Bearer ', '');
  let oauthToken: any;
  try { oauthToken = db.prepare('SELECT * FROM oauth_tokens WHERE access_token=?').get(token) as any; } catch {}
  const username = oauthToken?.username || 'user1';

  console.log(`🗑 Pinafore 삭제 요청 / Request to delete Pinafore : ${username} -> ${id}`);

  const followers = db.prepare('SELECT * FROM followers WHERE username=?').all(username) as any[];
  const objectIds = [
    `https://${DOMAIN}/users/${username}/statuses/${id}`,
    `https://${DOMAIN}/users/${username}/posts/${id}`
  ];

  for (const objectId of objectIds) {
    for (const f of followers) {
      try { await sendDelete(f.inbox, objectId, username); console.log(`🗑 Delete -> ${f.inbox}`); } catch {}
    }
  }

  db.prepare('DELETE FROM posts WHERE id=?').run(id);
  db.prepare('DELETE FROM outbox WHERE object LIKE?').run(`%${id}%`);
  try { db.prepare('DELETE FROM inbox_posts WHERE original_id LIKE? OR id LIKE?').run(`%${id}%`, `%${id}%`); } catch {}

  // Pinafore가 200 + json 기다림 / Pinafore awaits 200+ JSON responses.
  return NextResponse.json({ id, deleted: true }, {
    headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*' }
  });
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}