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

  // ✅ myapp49 - 1. 인증 - Bearer + 쿠키 둘 다 지원 / Authentication - Supports both Bearer and cookies.

  const auth = req.headers.get('Authorization') || '';
  const token = auth.replace('Bearer ', '');
  let username: string | null = null;


  if (token) {
    try {
      const oauthToken = db.prepare('SELECT username FROM oauth_tokens WHERE access_token=?').get(token) as any;
      if (oauthToken?.username) username = oauthToken.username;
    } catch {}
  }

  if (!username) {
    try {
      const { getViewerFromRequest } = await import('@/lib/visibility');
      username = getViewerFromRequest(req as any);
    } catch {}
  }

  // let oauthToken: any;
  // try { oauthToken = db.prepare('SELECT * FROM oauth_tokens WHERE access_token=?').get(token) as any; } catch {}
  // const username = oauthToken?.username || 'user1';

  // ✅ myapp49 - 폴백 금지 - 인증 없으면 401 / Disable fallback – 401 if unauthenticated
  if (!username) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401, headers: { 'Access-Control-Allow-Origin': '*' } });
  }

  console.log(`🗑 Pinafore 삭제 요청 / Request to delete Pinafore : ${username} -> ${id}`);

  // ✅ myapp49 - 소유권 체크 - 내 글 맞는지 확인 / Ownership Check – Verify if it is my post
  let post: any;
  try {
    post = db.prepare('SELECT id, username, visibility FROM posts WHERE id=?').get(id) as any;
  } catch {}

  if (!post) {
    // 이미 지워졌으면 Pinafore는 404보다 200을 원함 - 멱등성
    return NextResponse.json({ id, deleted: true, alreadyDeleted: true }, {
      headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*' }
    });
  }

  if (post.username !== username) {
    console.log(`🚫 삭제 거부: ${username}가 ${post.username} 글 삭제 시도`);
    return NextResponse.json({ error: 'forbidden - not your post' }, { 
      status: 403, 
      headers: { 'Access-Control-Allow-Origin': '*' } 
    });
  }

  // - DELETE 전송 / Send DELETE

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