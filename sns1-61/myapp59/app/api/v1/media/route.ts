// app/api/v1/media/route.ts
//  - ✅ myapp51 + myapp52

import db from '@/lib/db';
import { randomUUID } from 'crypto';
import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// public/uploads
const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads');

// ✅ myapp52 - 파일 허용 타입 + 파일 갯수 제한 + 파일 업로드 용량 제한
// Allowed file types + File count limit + File upload size limit
const ALLOWED_MIMES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const MAX_FILE_SIZE = 1 * 1024 * 1024; // 1MB(10 * 1024 * 1024 = 10MB)
const MAX_FILES_PER_USER_PENDING = 4; // 글에 첨부 가능한 이미지는 4개까지만 허용 / A maximum of four images can be attached to the post.

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

export async function POST(req: Request) {
  const username = getUser(req);
  if (!username) return NextResponse.json({error:'unauthorized'}, {status:401});

  // ✅ myapp52 - 파일 갯수 제한 / File count limit
  try {
    const pending = db.prepare(`
      SELECT COUNT(*) as c FROM media_attachments
      WHERE username=? AND id NOT IN (SELECT media_id FROM post_media)
    `).get(username) as any;
    if (pending.c >= MAX_FILES_PER_USER_PENDING) {
      return NextResponse.json({error:`이미지 ${MAX_FILES_PER_USER_PENDING}개까지만 업로드 가능 - 먼저 글을 쓰거나 삭제하세요\n`}, {status:400});
    }
  } catch {}

  const form = await req.formData();
  const file = form.get('file') as File;
  if (!file) return NextResponse.json({error:'file required'}, {status:400});
  // if (file.size > 8 * 1024 * 1024) return NextResponse.json({error:'1MB 이하만'}, {status:400});

  // ✅ myapp52 - 파일 용량 제한 / File size limit
  if (file.size === 0) return NextResponse.json({error:'empty file'}, {status:400});
  if (file.size > MAX_FILE_SIZE) return NextResponse.json({error:`${MAX_FILE_SIZE/1024/1024}MB 이하만 (현재 ${(file.size/1024/1024).toFixed(2)}MB)`}, {status:413});

  // ✅ myapp52 - 마임타입 체크(파일 타입체크) / MIME type check (file type check)
    if (!ALLOWED_MIMES.includes(file.type)) {
    return NextResponse.json({error:`허용 안됨: ${file.type}. 허용: ${ALLOWED_MIMES.join(', ')}`}, {status:400});
  }

  if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, {recursive:true});

  const id = randomUUID();

  // const ext = file.name.split('.').pop() || 'jpg';
  // ✅ myapp52 - 파일 확장자 위조 방어 / Protection against file extension spoofing
  const ext = file.type === 'image/jpeg'? 'jpg' : file.type.split('/')[1]; // png, gif, webp
  if (!['jpg','png','gif','webp'].includes(ext)) {
    return NextResponse.json({error:'invalid extension'}, {status:400});
  }

  const filename = `${id}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  fs.writeFileSync(path.join(UPLOAD_DIR, filename), buffer);

  const url = `/uploads/${filename}`;
  const fullUrl = `https://${process.env.DOMAIN || 'aloy-horizon.duckdns.org'}${url}`;

  db.prepare('INSERT INTO media_attachments (id, username, url, type, created_at) VALUES (?,?,?,?,?)')
   .run(id, username, fullUrl, file.type, Date.now());

  // Mastodon 호환 응답 / Mastodon-compatible response
  return NextResponse.json({ id, url: fullUrl, preview_url: fullUrl, type: 'image' });
}