// app/api/posts/route.ts - ✅ myapp30
import db from '@/lib/db';
import { randomUUID } from 'crypto';
import { sendNote, sendDelete } from '@/lib/ap';
import { NextResponse } from 'next/server'; 

const DOMAIN = process.env.DOMAIN || 'aloy-horizon.duckdns.org';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const username = searchParams.get('username') || 'user1';
  const posts = db.prepare('SELECT * FROM posts WHERE username = ? ORDER BY created_at DESC').all(username);
  return NextResponse.json(posts);
}

export async function POST(req: Request) {
  const { content, username = 'user1' } = await req.json();
  if (!content) return NextResponse.json({ error: '내용 없음 / Content required' }, { status: 400 });

  const id = randomUUID();
  db.prepare('INSERT INTO posts (id, content, username) VALUES (?, ?, ?)').run(id, content, username);
  
  const noteId = `https://${DOMAIN}/users/${username}/posts/${id}`;
  const note = {
    id: noteId,
    type: 'Note',
    attributedTo: `https://${DOMAIN}/users/${username}`,
    content: content,
    published: new Date().toISOString(),
    to: ['https://www.w3.org/ns/activitystreams#Public'],
    cc: [`https://${DOMAIN}/users/${username}/followers`] // add https:// 
  };

  const followers = db.prepare('SELECT * FROM followers WHERE username = ?').all(username) as any[];
  console.log(`📤 [${username}] ${followers.length}명에게 배달`);

  await Promise.allSettled(
    followers.map(async (follower) => {
      try {
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
  const { id, content, username = 'user1' } = await req.json();
  if (!id || !content) return NextResponse.json({ error: 'id와 content 필요 / ID and content required' }, { status: 400 });
  
  const result = db.prepare('UPDATE posts SET content = ? WHERE id = ? AND username = ?').run(content, id, username);
  if (result.changes === 0) return NextResponse.json({ error: '해당 글 없음 / Not your post' }, { status: 404 });
  
  const post = db.prepare('SELECT * FROM posts WHERE id = ?').get(id);
  return NextResponse.json(post);
}

export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url);
  let id = searchParams.get('id'); // defalut method is GET
  let username = searchParams.get('username') || 'user1';

  // POST method로도 id와 username을 받을 수 있도록 처리 
  // Allow receiving id and username via POST method as well
  if (!id) {
    try {
      const body = await req.json();
      id = body.id || id;
      username = body.username || username;
    } catch {}
  }

  if (!id) {
    return NextResponse.json({error: "id 필요 / ID required"}, {status:400});
  }
  
  const post = db.prepare('SELECT * FROM posts WHERE id = ? AND username = ?').get(id, username) as any;
  if (!post) return NextResponse.json({ error: '내 글 아님 / Not your post' }, { status: 403 });

  db.prepare('DELETE FROM posts WHERE id = ? AND username = ?').run(id, username);
  db.prepare('DELETE FROM likes WHERE object LIKE ?').run(`%${id}%`);
  db.prepare('DELETE FROM announces WHERE object LIKE ?').run(`%${id}%`);

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