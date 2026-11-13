// app/api/cleanup-orphan/route.ts 
// - 오류 수정용 라우트 , 서버 기능과 상관없음 / Route for error correction; unrelated to server functionality.
// - 리모트 서버 글 + 미디어 삭제 (Tombstone 대응) / Delete remote server post + media (Tombstone handling)
// ✅ myapp52 + myapp56
import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { sendDelete } from '@/lib/ap';
import fs from 'fs'; // ✅ myapp52
import path from 'path'; // ✅ myapp52

const DOMAIN = process.env.DOMAIN || 'aloy-horizon.duckdns.org';
const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads'); // ✅ myapp52

// function getUser(req: Request) {
//   const auth = req.headers.get('Authorization')?.replace('Bearer ','').trim();
//   if (auth) {
//     const o = db.prepare('SELECT username FROM oauth_tokens WHERE access_token=?').get(auth) as any;
//     if (o?.username) return o.username;
//   }
//   // 쿠키 / Cookie
//   const cookie = req.headers.get('cookie') || '';
//   const m = cookie.match(/refresh_token=([^;]+)/);
//   if (m) {
//     const s = db.prepare('SELECT username FROM sessions WHERE refresh_token=?').get(m[1]) as any;
//     if (s?.username) return s.username;
//   }
//   return null;
// }
// ✅ myapp56 - 인증 오류 / Authentication error
function getUser(req: Request) {
  const auth = req.headers.get('Authorization')?.replace('Bearer ','').trim();
  if (auth) {
    // 1. oauth_tokens에서 access_token 검색
    const o = db.prepare('SELECT username FROM oauth_tokens WHERE access_token=?').get(auth) as any;
    if (o?.username) return o.username;
    // 2. sessions에서 refresh_token도 검색 (추가!)
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

function deleteFilesForPost(postId: string, username: string) {
  // ✅ myapp52 - 연결된 미디어 찾아서 파일 + DB 삭제 / Locate linked media and delete both the file and the database entry.
  try {
    const medias = db.prepare(`
      SELECT ma.* FROM media_attachments ma
      JOIN post_media pm ON pm.media_id = ma.id
      WHERE pm.post_id = ? AND ma.username = ?
    `).all(postId, username) as any[];

    if (medias.length > 0) {
      const placeholders = medias.map(() => '?').join(',');
      db.prepare(`DELETE FROM post_media WHERE post_id=?`).run(postId);
      db.prepare(`DELETE FROM media_attachments WHERE id IN (${placeholders}) AND username=?`)
        .run(...medias.map((m:any) => m.id), username);

      for (const m of medias) {
        try {
          const filename = path.basename(new URL(m.url, `https://${DOMAIN}`).pathname);
          const fp = path.join(UPLOAD_DIR, filename);
          if (fs.existsSync(fp)) {
            fs.unlinkSync(fp);
            console.log(`🗑 file deleted: ${filename}`);
          }
        } catch {}
      }
      return medias.length;
    } else {
      // post_media만 남아있을 수도 있으니 정리 / Clean this up, as only `post_media` might remain.
      db.prepare('DELETE FROM post_media WHERE post_id=?').run(postId);
    }
  } catch (e) {
    console.error('media cleanup fail', postId, e);
  }
  return 0;
}

// 글 정보 확인 + 단일 글 상태 확인
// Check post information + Check status of a single post
export async function GET(req: Request) {
  // ✅ myapp52
  const url = new URL(req.url);
  const username = getUser(req);
  if (!username) return NextResponse.json({error:'unauthorized'}, {status:401});

  //const user = url.searchParams.get('username');
  const user = username;
  const checkId = url.searchParams.get('id'); //?id=5a24536b... 로 단일 확인

  if (checkId) {
    const post = db.prepare('SELECT * FROM posts WHERE id=? AND username=?').get(checkId, user) as any;
    const outbox = db.prepare('SELECT * FROM outbox WHERE object LIKE?').get(`%${checkId}%`) as any;
    const inboxPost = db.prepare('SELECT * FROM inbox_posts WHERE original_id LIKE? OR id=?').get(`%${checkId}%`, checkId) as any;
    // ✅ myapp52
    const orphanMediaCount = (db.prepare(`SELECT COUNT(*) as c FROM media_attachments WHERE username=? AND id NOT IN (SELECT media_id FROM post_media)`).get(user) as any).c;

    return NextResponse.json({
      id: checkId,
      existsInPosts:!!post,
      existsInOutbox:!!outbox,
      existsInInboxPosts:!!inboxPost,
      statusesUrl: `https://${DOMAIN}/users/${user}/statuses/${checkId}`,
      tombstoneCheck: `https://${DOMAIN}/users/${user}/statuses/${checkId} -> 410 Tombstone이어야 정상!`,
      willReturn: post? '200 Note' : '410 Tombstone',
      orphanMediaCount : orphanMediaCount, // ✅ myapp52
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
  // ✅ myapp52
  const username = getUser(req);
  if (!username) return NextResponse.json({error:'unauthorized'}, {status:401});

  // 유령글(outbox와 posts테이블의 글이 일치하지 않는것) 삭제
  // Delete ghost posts (posts where the outbox and posts tables do not match)
  // const body = await req.json().catch(()=> ({}));
  //const user = body.username || 'user1';
  const user = username;
  const outboxes = db.prepare(`SELECT id, object FROM outbox WHERE actor LIKE?`).all(`%/${user}`) as any[];
  const followers = db.prepare('SELECT * FROM followers WHERE username=?').all(user) as any[];
  let deleted: string[] = [];
  let deletedFiles = 0; // ✅ myapp52

  for (const o of outboxes) {
    try {
      const obj = JSON.parse(o.object);
      //const objectId = obj.id || '';
      const objectId = obj.object?.id || obj.object || obj.id || ''; // ✅ object.id 우선
      const postId = objectId.split('/').pop()?.split('#')[0]?.split('?')[0];
      if (!postId) continue;
      const exists = db.prepare('SELECT 1 FROM posts WHERE id=?').get(postId);
      if (!exists) {
        // statuses/ + posts/ 둘 다 Delete! (GoToSocial, Mastodon 호환!)
        // Delete both /statuses/ and /posts/! (Compatible with GoToSocial and Mastodon!)
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
        db.prepare('DELETE FROM post_media WHERE post_id=?').run(postId); // ✅ myapp52
        deleted.push(postId);
        console.log(`🧹 고아글 정리/Orphan post delete : ${postId} -> Delete 배달 + outbox 삭제`);
      }
    } catch {}
  }

  // ✅ myapp52 - 추가로 미디어 고아(24시간 지난)도 청소
  // myapp52 - Also cleaning up media orphans (older than 24 hours)
  const cutoff = Date.now() - 24*60*60*1000;
  const orphanMedias = db.prepare(`
    SELECT * FROM media_attachments 
    WHERE username=? AND created_at < ? 
    AND id NOT IN (SELECT media_id FROM post_media)
  `).all(user, cutoff) as any[];
  
  for (const m of orphanMedias) {
    db.prepare('DELETE FROM media_attachments WHERE id=?').run(m.id);
    try {
      const filename = path.basename(new URL(m.url, `https://${DOMAIN}`).pathname);
      const fp = path.join(UPLOAD_DIR, filename);
      if (fs.existsSync(fp)) fs.unlinkSync(fp);
      deletedFiles++;
    } catch {}
  }

  // ✅ myapp52
  return NextResponse.json({ orphans: deleted.length, deleted, deletedFiles, orphanMediasCleaned: orphanMedias.length });
  //return NextResponse.json({ orphans: deleted.length, deleted });
}

export async function DELETE(req: Request) {
  // ✅ myapp52
  const username = getUser(req);
  if (!username) return NextResponse.json({error:'unauthorized'}, {status:401});
  const url = new URL(req.url);
  //const username = url.searchParams.get('username');
  const all = url.searchParams.get('all');
  const singleId = url.searchParams.get('id'); 

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
          console.error(`❌ Delete 실패 / failed ${f.inbox}`, e);
        }
      }
    }

    // ✅ myapp52
    const files = deleteFilesForPost(singleId, username);

    // 로컬 삭제 / local delete
    db.prepare('DELETE FROM posts WHERE id=? AND username=?').run(singleId, username);
    db.prepare('DELETE FROM outbox WHERE object LIKE?').run(`%${singleId}%`);
    db.prepare('DELETE FROM inbox_posts WHERE original_id LIKE? OR id=?').run(`%${singleId}%`, singleId);
    
    console.log(`🗑 [${username}] 단일 삭제 완료: ${singleId} -> 로컬 삭제 + ${files} 미디어 삭제 / 🗑 [${username}] post deleted complete!`);
    
    return NextResponse.json({
      message: `✅ ${singleId} 리모트+로컬 삭제 완료! 이제 410 Tombstone/Remote and local deletion complete! Now for the 410 Tombstone!`,
      deletedId: singleId,
      tombstoneUrl: `https://${DOMAIN}/users/${username}/statuses/${singleId}`,
      followersCount: followers.length
    });
  }

  // 2. 전체 삭제 / Delete All
  if (all!== 'true') {
    return NextResponse.json({ error: '전체 삭제하려면?all=true&username=user1 또는?id=xxx&username=user1 로 호출!' }, { status: 400 });
  }

  const posts = db.prepare('SELECT id FROM posts WHERE username=?').all(username) as any[];
  const outboxes = db.prepare('SELECT id FROM outbox WHERE actor LIKE?').all(`%/${username}`) as any[];

  console.log(`🔥 [${username}] 전체 삭제 시작! posts:${posts.length} outbox:${outboxes.length} followers:${followers.length}`);

  let deleted: string[] = [];
  let totalFiles = 0; // ✅ myapp52

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
    totalFiles += deleteFilesForPost(p.id, username); // ✅ myapp52
    deleted.push(p.id);
    await new Promise(r => setTimeout(r, 100)); // 차단 방지
  }

  db.prepare('DELETE FROM posts WHERE username=?').run(username);
  db.prepare('DELETE FROM outbox WHERE actor LIKE?').run(`%/${username}`);
  try { db.prepare('DELETE FROM inbox_posts WHERE username=?').run(username); } catch {} // ✅ myapp52

  return NextResponse.json({
    message: `✅ ${username} 글 ${deleted.length}개 리모트+로컬 삭제 완료!`,
    deletedCount: deleted.length,
    deletedFiles: totalFiles, // ✅ myapp52
    followersCount: followers.length,
    deleted
  });
}