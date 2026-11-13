// app/api/posts/route.ts - ✅ myapp30 + myapp45 + myapp48
import db from '@/lib/db';
import { randomUUID } from 'crypto';
import { sendNote, sendDelete } from '@/lib/ap';
import { NextResponse } from 'next/server'; 
// ✅ myapp48 
import { getViewerFromRequest, canSee } from '@/lib/visibility';

const DOMAIN = process.env.DOMAIN || 'aloy-horizon.duckdns.org';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
   let targetUsername = searchParams.get('username'); // ✅ myapp48


  // ✅ myapp48 - viewer / target 분리 (기존 코드는 token 있으면 username 덮어써서 프로필 조회가 망가짐)
  // targetUsername = 프로필 주인, viewer = 지금 로그인한 사람
  const viewer = getViewerFromRequest(req); // login user
  const profileOwner = targetUsername; // search user

  // ✅ myapp48 - target 체크
  if (!profileOwner) return NextResponse.json({ error: 'username required' }, { status: 400 });

  const allPosts = db.prepare('SELECT * FROM posts WHERE username =? ORDER BY created_at DESC').all(profileOwner) as any[];

  // ✅ myapp48 - visibility 필터링 추가
  // public: 누구나 / unlisted: 로그인 필요 / private: 본인+팔로워만
  const isOwnerView = viewer && viewer === profileOwner;
  const filtered = allPosts.filter((p: any) => {
    if (isOwnerView) return true; // 본인이면 전부 보기
    return canSee(viewer, p); 
  });

  return NextResponse.json(filtered);

  // ✅ myapp45 - 토큰 적용 / token apply
  // -- previous code --
  // let username = searchParams.get('username');
  // const auth = req.headers.get('Authorization') || '';
  // const token = auth.replace('Bearer ', '').trim();
  // if (token) {
  //   const oauth = db.prepare('SELECT username FROM oauth_tokens WHERE access_token=?').get(token) as any;
  //   if (oauth?.username) username = oauth.username; // If you have a token username > tokenuser
  // }
  // if (!username) return NextResponse.json({ error: 'username required' }, { status: 401 });

  // const posts = db.prepare('SELECT * FROM posts WHERE username = ? ORDER BY created_at DESC').all(username);
  // return NextResponse.json(posts);


}

export async function POST(req: Request) {
  let { content, username, visibility } = await req.json();
  // ✅ myapp48 - visibility default value
  visibility = visibility || 'public';

  // ✅ myapp45 - apply token
  const auth = req.headers.get('Authorization') || '';
  const token = auth.replace('Bearer ', '').trim();
  if (token) {
    const oauth = db.prepare('SELECT username FROM oauth_tokens WHERE access_token=?').get(token) as any;
    if (oauth?.username) username = oauth.username; // 토큰 있으면 토큰 유저로 덮어쓰기!
  }
  if (!username) return NextResponse.json({ error: '로그인 필요 / username required' }, { status: 400 });
  if (!content) return NextResponse.json({ error: '내용 없음 / Content required' }, { status: 400 });

  // insert into posts(inbox)
  // ✅ myapp48 - add visibility
  const id = randomUUID();
  const now = Date.now();
  //db.prepare('INSERT INTO posts (id, content, username) VALUES (?, ?, ?)').run(id, content, username);
  db.prepare('INSERT INTO posts (id, content, username, created_at, visibility) VALUES (?,?,?,?,?)').run(id, content, username, now, visibility);

  // ✅ myapp48
  // - to/cc distinction
  const followersUrl = `https://${DOMAIN}/users/${username}/followers`;
  let to: string[] = [];
  let cc: string[] = [];
  if (visibility === 'public') {
    to = ['https://www.w3.org/ns/activitystreams#Public'];
    cc = [followersUrl];
  } else if (visibility === 'unlisted') {
    to = [followersUrl];
    cc = ['https://www.w3.org/ns/activitystreams#Public'];
  } else if (visibility === 'private') {
    to = [followersUrl];
    cc = [];
  }
  // ✅ myapp48
  const noteId = `https://${DOMAIN}/users/${username}/posts/${id}`;
  const note = {
    id: noteId,
    type: 'Note',
    attributedTo: `https://${DOMAIN}/users/${username}`,
    content: content.startsWith('<p>')? content : `<p>${content}</p>`,
    published: new Date().toISOString(),
    to,
    cc
  };

  // ✅ myapp46 - insert into oubox
//   try {
//   //db.prepare('CREATE TABLE IF NOT EXISTS outbox (id TEXT PRIMARY KEY, type TEXT, actor TEXT, object TEXT, created_at INTEGER)').run();
//   db.prepare('INSERT INTO outbox (id, type, actor, object, created_at) VALUES (?,?,?,?,?)')
//     .run(id, 'Create', `https://${DOMAIN}/users/${username}`, JSON.stringify(note), Date.now());
// } catch {}

// ✅ myapp48 - add visibility
  try {
    db.prepare('INSERT INTO outbox (id, type, actor, object, created_at, visibility) VALUES (?,?,?,?,?,?)')
     .run(randomUUID(), 'Create', `https://${DOMAIN}/users/${username}`, JSON.stringify(note), now, visibility);
  } catch (e) {
    console.error('outbox 저장 에러', e);
  }

  const followers = db.prepare('SELECT * FROM followers WHERE username = ?').all(username) as any[];
  console.log(`📤 [${username}] ${followers.length}명에게 배달`);

  await Promise.allSettled(
    followers.map(async (follower) => {
      try {
        // - 팔로워에게 서명해서 전송/ Sign and send to followers
        await sendNote(follower.inbox, note, username, id, content);
        console.log(`✅ -> ${follower.actor}`);
      } catch (e) {
        console.error(`❌ -> ${follower.actor}`, e);
      }
    })
  );

  const post = db.prepare('SELECT * FROM posts WHERE id = ?').get(id);
  return NextResponse.json(post);
}

export async function PUT(req: Request) {
    // ✅ myapp45 - apply token
  let { id, content, username } = await req.json();
  const auth = req.headers.get('Authorization') || '';
  const token = auth.replace('Bearer ', '').trim();
  if (token) {
    const oauth = db.prepare('SELECT username FROM oauth_tokens WHERE access_token=?').get(token) as any;
    if (oauth?.username) username = oauth.username; // 토큰 있으면 토큰 유저로 덮어쓰기!
  }
  if (!id || !content) return NextResponse.json({ error: 'id와 content 필요 / ID and content required' }, { status: 400 });
  
  const result = db.prepare('UPDATE posts SET content = ? WHERE id = ? AND username = ?').run(content, id, username);
  if (result.changes === 0) return NextResponse.json({ error: '해당 글 없음 / Not your post' }, { status: 404 });
  
  const post = db.prepare('SELECT * FROM posts WHERE id = ?').get(id);
  return NextResponse.json(post);
}

export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url);
  let id = searchParams.get('id'); // defalut method is GET
  let username = searchParams.get('username');

  // ✅ myapp45 - apply token
  const auth = req.headers.get('Authorization') || '';
  const token = auth.replace('Bearer ', '').trim();
  if (token) {
    const oauth = db.prepare('SELECT username FROM oauth_tokens WHERE access_token=?').get(token) as any;
    if (oauth?.username) username = oauth.username; // 토큰 있으면 토큰 유저로 덮어쓰기!
  }

  // POST method로도 id와 username을 받을 수 있도록 처리 
  // Allow receiving id and username via POST method as well
  if (!id) {
    try {
      const body = await req.json();
      id = body.id || id;
      //username = body.username || username;
      // ✅ myapp45
      if (body.username) username = body.username;
    } catch {}
  }

  if (!id) {
    return NextResponse.json({error: "id 필요 / ID required"}, {status:400});
  }
  // ✅ myapp45 - username이 null인 경우 추가 / Add a case for when the username is null.
  if (!username) {
    return NextResponse.json({ error: 'unauthorized - username required' }, { status: 401 });
  }
  
  const post = db.prepare('SELECT * FROM posts WHERE id = ? AND username = ?').get(id, username) as any;
  if (!post) return NextResponse.json({ error: '내 글 아님 / Not your post' }, { status: 403 });

  db.prepare('DELETE FROM posts WHERE id = ? AND username = ?').run(id, username);
  db.prepare('DELETE FROM likes WHERE object LIKE ?').run(`%${id}%`);
  db.prepare('DELETE FROM announces WHERE object LIKE ?').run(`%${id}%`);

  // ✅ myapp45 -inbox_posts 삭제 / Delete inbox_posts
  db.prepare('DELETE FROM inbox_posts WHERE original_id LIKE ? OR id LIKE ? OR original_id = ?').run(`%${id}%`, `%${id}%`, id);

  const followers = db.prepare('SELECT * FROM followers WHERE username = ?').all(username) as any[];
  const noteId = `https://${DOMAIN}/users/${username}/posts/${id}`; // ✅ 전체 URL 만들기 / Create full URL
  
  //  await 추가! (로그 바로 보려고) /  Add await! (to see logs immediately)
  await Promise.allSettled(
    followers.map(f => 
      sendDelete(f.inbox, noteId, username) //  noteId로 전송 / Send with noteId
        .then(() => console.log(`✅ Delete -> ${f.actor}`))
        .catch(e => console.error(`❌ Delete failed -> ${f.actor}`, e))
    )
  );

  console.log(`🗑 [${username}] Delete ${id} -> ${followers.length} followers`);
  return NextResponse.json({ ok: true, deletedId: id });
}