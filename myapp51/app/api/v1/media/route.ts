// app/api/v1/media/route.ts
//  - ✅ myapp51
import db from '@/lib/db';
import { randomUUID } from 'crypto';
import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// public/uploads
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

export async function POST(req: Request) {
  const username = getUser(req);
  if (!username) return NextResponse.json({error:'unauthorized'}, {status:401});

  const form = await req.formData();
  const file = form.get('file') as File;
  if (!file) return NextResponse.json({error:'file required'}, {status:400});
  if (file.size > 8 * 1024 * 1024) return NextResponse.json({error:'8MB 이하만'}, {status:400});

  if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, {recursive:true});

  const id = randomUUID();
  const ext = file.name.split('.').pop() || 'jpg';
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