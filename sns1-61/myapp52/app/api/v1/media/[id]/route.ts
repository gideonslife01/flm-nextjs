// ✅ myapp52
// app/api/v1/media/[id]/route.ts
// - 테마UI에 이미지 선택후 선택 취소시 삭제 하는 기능
// Function to delete an image when it is deselected in the theme UI.

import db from '@/lib/db';
import fs from 'fs';
import path from 'path';
import { NextResponse } from 'next/server';

const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads');

function getUser(req: Request) {
  const auth = req.headers.get('Authorization')?.replace('Bearer ','').trim();
  if (auth) {
    const o = db.prepare('SELECT username FROM oauth_tokens WHERE access_token=?').get(auth) as any;
    if (o?.username) return o.username;
  }
  // 쿠키 / Cookie
  const cookie = req.headers.get('cookie') || '';
  const m = cookie.match(/refresh_token=([^;]+)/);
  if (m) {
    const s = db.prepare('SELECT username FROM sessions WHERE refresh_token=?').get(m[1]) as any;
    if (s?.username) return s.username;
  }
  return null;
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
    
  const { id } = await params;
  const username = getUser(req);
  if (!username) return NextResponse.json({error:'unauthorized'}, {status:401});

  const m = db.prepare('SELECT * FROM media_attachments WHERE id=?').get(id) as any;
  if (!m) return NextResponse.json({deleted:true});

  // - 소유권 체크 / Ownership Check
  if (m.username!== username) {
    return NextResponse.json({error:'forbidden - not your media'}, { status: 403, headers: { 'Access-Control-Allow-Origin': '*' }});
  }

  // - 트랜잭션으로 post_media + media_attachments 같이 삭제
  // Delete post_media and media_attachments together within a transaction
  const tx = db.transaction(() => {
    db.prepare('DELETE FROM post_media WHERE media_id=?').run(id);
    db.prepare('DELETE FROM media_attachments WHERE id=? AND username=?').run(id, username);
  });
  tx();

  try {
    const filename = path.basename(new URL(m.url, 'https://a.com').pathname);
    const fp = path.join(UPLOAD_DIR, filename);
    if (fs.existsSync(fp)) fs.unlinkSync(fp);
  } catch {}
  return NextResponse.json({deleted:true});
}