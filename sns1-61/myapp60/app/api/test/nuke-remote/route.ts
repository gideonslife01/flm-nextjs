export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import crypto from 'crypto';

const DOMAIN = process.env.DOMAIN || 'aloy-horizon.duckdns.org';

function getUser(req: Request) {
  const auth = req.headers.get('Authorization')?.replace('Bearer ','').trim();
  if (auth) {
    const o = db.prepare('SELECT username FROM oauth_tokens WHERE access_token=?').get(auth) as any;
    if (o?.username) return o.username;
    const s = db.prepare('SELECT username FROM sessions WHERE refresh_token=?').get(auth) as any;
    if (s?.username) return s.username;
  }
  const cookie = req.headers.get('cookie') || '';
  const m = cookie.match(/refresh_token=([^;]+)/);
  if (m) {
    const s = db.prepare('SELECT username FROM sessions WHERE refresh_token=?').get(m[1]) as any;
    if (s?.username) return s.username;
  }
  return null;
}

// ✅ 여기에 sendDelete 직접 구현 - lib/ap.ts 안 건드림
async function sendDelete(inboxUrl: string, objectId: string, username: string) {
  const actorId = `https://${DOMAIN}/users/${username}`;

  // 키 가져오기
  const user = db.prepare('SELECT private_key FROM users WHERE username=?').get(username) as any;
  if (!user?.private_key) throw new Error('private_key not found for ' + username);

  const deleteId = `${actorId}#delete-${Date.now()}-${Math.random().toString(36).slice(2)}`;

  // GTS 호환: object를 문자열로 보내는 게 제일 안전
  const activity = {
    "@context": "https://www.w3.org/ns/activitystreams",
    "id": deleteId,
    "type": "Delete",
    "actor": actorId,
    "object": objectId,
    "to": ["https://www.w3.org/ns/activitystreams#Public"],
    "cc": [`https://${DOMAIN}/users/${username}/followers`]
  };

  const body = JSON.stringify(activity);
  const url = new URL(inboxUrl);

  const digest = `SHA-256=${crypto.createHash('sha256').update(body).digest('base64')}`;
  const date = new Date().toUTCString();
  const signedString = `(request-target): post ${url.pathname}${url.search}\nhost: ${url.host}\ndate: ${date}\ndigest: ${digest}`;

  const signer = crypto.createSign('sha256');
  signer.update(signedString);
  const signature = signer.sign(user.private_key, 'base64');

  const keyId = `${actorId}#main-key`;
  const signatureHeader = `keyId="${keyId}",algorithm="rsa-sha256",headers="(request-target) host date digest",signature="${signature}"`;

  const res = await fetch(inboxUrl, {
    method: 'POST',
    headers: {
      'Host': url.host,
      'Date': date,
      'Digest': digest,
      'Signature': signatureHeader,
      'Content-Type': 'application/activity+json',
      'Accept': 'application/activity+json'
    },
    body
  });

  const text = await res.text().catch(() => '');
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} ${text.slice(0,300)}`);
  }
  return { status: res.status, body: text };
}

export async function DELETE(req: NextRequest) {
  const username = getUser(req);
  if (!username) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const url = new URL(req.url);
  const id = url.searchParams.get('id');

  const targetIds = id? [id] : [
    '07360694-eff7-4ac2-be56-4c8d26843f97',
    '01913d88-51bd-4564-9f0a-820ec7e9fb0e'
  ];

  const gtsInbox = 'https://freelifemakers.com/users/user1/inbox';
  const results: any[] = [];

  for (const postId of targetIds) {
    for (const suffix of ['statuses', 'posts']) {
      const objectId = `https://${DOMAIN}/users/${username}/${suffix}/${postId}`;
      try {
        const r = await sendDelete(gtsInbox, objectId, username);
        console.log(`🗑 Delete -> GTS: ${objectId} ${r.status}`);
        results.push({ objectId, ok: true, status: r.status });
      } catch (e: any) {
        console.log(`❌ 실패: ${e.message}`);
        results.push({ objectId, ok: false, error: e.message });
      }
    }
  }

  return NextResponse.json({
    message: `GTS로 Delete ${targetIds.length}개 전송 (독립 sendDelete)`,
    results,
    check: '2분 후 https://freelifemakers.com/@user1 새로고침'
  });
}