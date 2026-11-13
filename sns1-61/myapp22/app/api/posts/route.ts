// app/api/posts/route.ts
// ✅ myapp17
import db from '@/lib/db';
import { randomUUID } from 'crypto';
import { sendNote } from '@/lib/ap';

const DOMAIN = process.env.DOMAIN || 'aloy-horizon.duckdns.org';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const username = searchParams.get('username') || 'user1';

  // ✅ 해당 유저 글만 / Only that user's posts
  const posts = db.prepare('SELECT * FROM posts WHERE username = ? ORDER BY created_at DESC').all(username);
  return Response.json(posts);
}

export async function POST(req: Request) {
  const { content, username = 'user1' } = await req.json();
  if (!content) return Response.json({ error: '내용 없음 / Content required' }, { status: 400 });

  const id = randomUUID();
  
  // ✅ username 저장! / Save username!
  db.prepare('INSERT INTO posts (id, content, username) VALUES (?, ?, ?)').run(id, content, username);
  
  const noteId = `https://${DOMAIN}/users/${username}/posts/${id}`;
  const note = {
    id: noteId,
    type: 'Note',
    attributedTo: `https://${DOMAIN}/users/${username}`,
    content: content,
    to: ['https://www.w3.org/ns/activitystreams#Public'],
    cc: [`https://${DOMAIN}/users/${username}/followers`]
  };

  // ✅ 해당 유저의 팔로워만! / Only that user's followers!
  const followers = db.prepare('SELECT * FROM followers WHERE username = ?').all(username) as any[];
  console.log(`📤 [${username}] ${followers.length}명에게 배달 / Deliver to ${followers.length} followers`);

  for (const follower of followers) {
    try {
      await sendNote(follower.inbox, note, username, id, content);
      console.log(`✅ 배달 성공 / Delivery successful -> ${follower.actor}`);
    } catch (e) {
      console.error(`❌ 배달 실패 / Delivery failed -> ${follower.actor}`, e);
    }
  }

  const post = db.prepare('SELECT * FROM posts WHERE id = ?').get(id);
  return Response.json(post);
}

export async function PUT(req: Request) {
  const { id, content, username = 'user1' } = await req.json();
  if (!id || !content) {
    return Response.json({ error: 'id와 content 필요' }, { status: 400 });
  }
  // ✅ 내 글만 수정 / Only edit my own posts
  const result = db.prepare('UPDATE posts SET content = ? WHERE id = ? AND username = ?').run(content, id, username);
  if (result.changes === 0) {
    return Response.json({ error: '해당 글 없음 / Post not found' }, { status: 404 });
  }
  const post = db.prepare('SELECT * FROM posts WHERE id = ?').get(id);
  return Response.json(post);
}

export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  const username = searchParams.get('username') || 'user1';
  if (!id) return Response.json({ error: 'id 필요 / id required' }, { status: 400 });
  
  // ✅ 내 글만 삭제 / Only delete my own posts
  db.prepare('DELETE FROM posts WHERE id = ? AND username = ?').run(id, username);
  return Response.json({ ok: true });
}