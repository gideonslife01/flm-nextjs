// ~/myapp13/app/api/posts/route.ts
import db from '@/lib/db';
import { randomUUID } from 'crypto';
import { sendNote } from '@/lib/ap'; // 글 배달 함수 / Delivery function

// myapp15 ✅
const DOMAIN = process.env.DOMAIN || 'aloy-horizon.duckdns.org';

export async function GET() {
  // R - 읽기 / Read
  const posts = db.prepare('SELECT * FROM posts ORDER BY created_at DESC').all();
  return Response.json(posts);
}

// myapp13 ✅
export async function POST(req: Request) {
  const { content, username = 'user1' } = await req.json();
  if (!content) return Response.json({ error: '내용 없음 / Content is required' }, { status: 400 });

  const id = randomUUID();
  db.prepare('INSERT INTO posts (id, content) VALUES (?, ?)').run(id, content);

  // 1. ActivityPub Note 만들기 / Create ActivityPub Note
  const noteId = `https://${DOMAIN}/users/${username}/posts/${id}`;
  const note = {
    id: noteId,
    type: 'Note',
    attributedTo: `https://${DOMAIN}/users/${username}`,
    content: content,
    to: ['https://www.w3.org/ns/activitystreams#Public'],
    cc: [`https://${DOMAIN}/users/${username}/followers`]
  };

  // 2. 팔로워들한테 배달! / Deliver to followers!
  const followers = db.prepare('SELECT * FROM followers').all() as any[];
  console.log(`📤 ${followers.length}명에게 배달 시작 / delivering to ${followers.length} followers`);

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
  // U - 수정 / Update
  const { id, content } = await req.json();
  if (!id || !content) {
    return Response.json({ error: 'id와 content 필요 / id and content are required' }, { status: 400 });
  }

  const result = db.prepare('UPDATE posts SET content = ? WHERE id = ?').run(content, id);
  
  if (result.changes === 0) {
    return Response.json({ error: '해당 글 없음 / Post not found' }, { status: 404 });
  }

  const post = db.prepare('SELECT * FROM posts WHERE id = ?').get(id);
  return Response.json(post);
}

export async function DELETE(req: Request) {
  // D - 삭제 / Delete
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return Response.json({ error: 'id 필요 / You need id' }, { status: 400 });

  db.prepare('DELETE FROM posts WHERE id = ?').run(id);
  return Response.json({ ok: true });
}
