// app/api/cleanup-orphan/route.ts - 리모트 서버 글까지 싹 삭제! (Tombstone 대응 FIX!)
import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { sendDelete } from '@/lib/ap';

const DOMAIN = process.env.DOMAIN || 'aloy-horizon.duckdns.org';

// 글 정보 확인 + 단일 글 상태 확인
export async function GET(req: Request) {
  const url = new URL(req.url);
  const user = url.searchParams.get('username') || 'user1';
  const checkId = url.searchParams.get('id'); //?id=5a24536b... 로 단일 확인

  if (checkId) {
    const post = db.prepare('SELECT * FROM posts WHERE id=? AND username=?').get(checkId, user) as any;
    const outbox = db.prepare('SELECT * FROM outbox WHERE object LIKE?').get(`%${checkId}%`) as any;
    const inboxPost = db.prepare('SELECT * FROM inbox_posts WHERE original_id LIKE? OR id=?').get(`%${checkId}%`, checkId) as any;

    return NextResponse.json({
      id: checkId,
      existsInPosts:!!post,
      existsInOutbox:!!outbox,
      existsInInboxPosts:!!inboxPost,
      statusesUrl: `https://${DOMAIN}/users/${user}/statuses/${checkId}`,
      tombstoneCheck: `https://${DOMAIN}/users/${user}/statuses/${checkId} -> 410 Tombstone이어야 정상!`,
      willReturn: post? '200 Note' : '410 Tombstone'
    });
  }

  const postsCount = (db.prepare('SELECT COUNT(*) as c FROM posts WHERE username=?').get(user) as any).c;
  const outboxCount = (db.prepare('SELECT COUNT(*) as c FROM outbox WHERE actor LIKE?').get(`%/${user}`) as any).c;
  const followers = db.prepare('SELECT * FROM followers WHERE username=?').all(user) as any[];

  return NextResponse.json({
    user,
    postsCount,
    outboxCount,
    followers: followers.length,
    followersList: followers.map((f:any)=>f.inbox),
    usage: {
      single: `/api/cleanup-orphan?id=5a24536b-06ec-400c-8539-4c1350dd1d19&username=user1 (DELETE)`,
      all: `/api/cleanup-orphan?all=true&username=user1 (DELETE)`,
      check: `/api/cleanup-orphan?id=xxx&username=user1 (GET)`,
      orphan: `/api/cleanup-orphan (POST) - outbox와 posts 불일치 정리`
    }
  });
}

export async function POST(req: Request) {
  // 유령글(outbox와 posts테이블의 글이 일치하지 않는것) 삭제
  const body = await req.json().catch(()=> ({}));
  const user = body.username || 'user1';
  const outboxes = db.prepare(`SELECT id, object FROM outbox WHERE actor LIKE?`).all(`%/${user}`) as any[];
  const followers = db.prepare('SELECT * FROM followers WHERE username=?').all(user) as any[];
  let deleted: string[] = [];

  for (const o of outboxes) {
    try {
      const obj = JSON.parse(o.object);
      const objectId = obj.id || '';
      const postId = objectId.split('/').pop()?.split('#')[0]?.split('?')[0];
      if (!postId) continue;
      const exists = db.prepare('SELECT 1 FROM posts WHERE id=?').get(postId);
      if (!exists) {
        // 🔥 FIX: statuses/ + posts/ 둘 다 Delete! (GoToSocial, Mastodon 호환!)
        const delIds = [
          `https://${DOMAIN}/users/${user}/statuses/${postId}`,
          `https://${DOMAIN}/users/${user}/posts/${postId}`
        ];
        for (const delId of delIds) {
          for (const f of followers) {
            try { await sendDelete(f.inbox, delId, user); } catch {}
          }
        }
        db.prepare('DELETE FROM outbox WHERE id=?').run(o.id);
        deleted.push(postId);
        console.log(`🧹 고아글 정리: ${postId} -> Delete 배달 + outbox 삭제`);
      }
    } catch {}
  }
  return NextResponse.json({ orphans: deleted.length, deleted });
}

export async function DELETE(req: Request) {
  const url = new URL(req.url);
  const username = url.searchParams.get('username') || 'user1';
  const all = url.searchParams.get('all');
  const singleId = url.searchParams.get('id'); // 🔥 추가!?id=xxx 단일 삭제!

  const followers = db.prepare('SELECT * FROM followers WHERE username=?').all(username) as any[];

  // 1. 단일 글 삭제 - 네가 원하는 기능!
  if (singleId) {
    console.log(`🗑 [${username}] 단일 삭제: ${singleId}`);

    const objectIds = [
      `https://${DOMAIN}/users/${username}/statuses/${singleId}`,
      `https://${DOMAIN}/users/${username}/posts/${singleId}` // 옛날 ID 호환!
    ];

    for (const objectId of objectIds) {
      for (const f of followers) {
        try {
          await sendDelete(f.inbox, objectId, username);
          console.log(`🗑 Delete -> ${f.inbox} : ${objectId}`);
        } catch (e) {
          console.error(`❌ Delete 실패 ${f.inbox}`, e);
        }
      }
    }

    // 로컬 삭제!
    db.prepare('DELETE FROM posts WHERE id=? AND username=?').run(singleId, username);
    db.prepare('DELETE FROM outbox WHERE object LIKE?').run(`%${singleId}%`);
    db.prepare('DELETE FROM inbox_posts WHERE original_id LIKE? OR id=?').run(`%${singleId}%`, singleId);

    return NextResponse.json({
      message: `✅ ${singleId} 리모트+로컬 삭제 완료! 이제 410 Tombstone!`,
      deletedId: singleId,
      tombstoneUrl: `https://${DOMAIN}/users/${username}/statuses/${singleId}`,
      followersCount: followers.length
    });
  }

  // 2. 전체 삭제
  if (all!== 'true') {
    return NextResponse.json({ error: '전체 삭제하려면?all=true&username=user1 또는?id=xxx&username=user1 로 호출!' }, { status: 400 });
  }

  const posts = db.prepare('SELECT id FROM posts WHERE username=?').all(username) as any[];
  const outboxes = db.prepare('SELECT id FROM outbox WHERE actor LIKE?').all(`%/${username}`) as any[];

  console.log(`🔥 [${username}] 전체 삭제 시작! posts:${posts.length} outbox:${outboxes.length} followers:${followers.length}`);

  let deleted: string[] = [];

  for (const p of posts) {
    const objectIds = [
      `https://${DOMAIN}/users/${username}/statuses/${p.id}`,
      `https://${DOMAIN}/users/${username}/posts/${p.id}`
    ];
    for (const objectId of objectIds) {
      for (const f of followers) {
        try {
          await sendDelete(f.inbox, objectId, username);
        } catch {}
      }
    }
    deleted.push(p.id);
    await new Promise(r => setTimeout(r, 100)); // 차단 방지
  }

  db.prepare('DELETE FROM posts WHERE username=?').run(username);
  db.prepare('DELETE FROM outbox WHERE actor LIKE?').run(`%/${username}`);

  return NextResponse.json({
    message: `✅ ${username} 글 ${deleted.length}개 리모트+로컬 삭제 완료!`,
    deletedCount: deleted.length,
    followersCount: followers.length,
    deleted
  });
}