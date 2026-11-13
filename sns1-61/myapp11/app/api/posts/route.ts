// ~/myapp11/app/api/posts/route.ts
import db from '@/lib/db';
import { randomUUID } from 'crypto';

export async function GET() {
  // R - 읽기 / Read
  const posts = db.prepare('SELECT * FROM posts ORDER BY created_at DESC').all();
  return Response.json(posts);
}

export async function POST(req: Request) {
  // C - 생성 / Create
  const { content } = await req.json();
  if (!content) return Response.json({ error: '내용 없음 / Content is required' }, { status: 400 });

  const id = randomUUID();
  db.prepare('INSERT INTO posts (id, content) VALUES (?, ?)').run(id, content);

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
