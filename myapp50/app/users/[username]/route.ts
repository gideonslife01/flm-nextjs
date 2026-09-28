// myapp18✅/app/users/[username]/statuses/[id]/route.ts
import db from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ username: string; id: string }> }
) {
  const { username, id } = await params; 
  
  // posts table
  let post: any = db.prepare(
    `SELECT * FROM posts WHERE id = ? AND username = ?`
  ).get(id, username);

  // inbox_posts table
  if (!post) {
    // inbox는 id가 전체 URL이라 LIKE로 찾기
    // inbox uses the full URL as id, so we search with LIKE
    post = db.prepare(
      `SELECT * FROM inbox_posts WHERE id LIKE ? AND username = ?`
    ).get(`%${id}`, username);
  }

  if (!post) {
    return new NextResponse('Not found', { status: 404 });
  }

  const base = process.env.NEXT_PUBLIC_BASE_URL || 'https://aloy-horizon.duckdns.org';
  const url = `${base}/users/${username}/statuses/${id}`;

  return NextResponse.json({
    "@context": "https://www.w3.org/ns/activitystreams",
    id: url,
    type: "Note",
    attributedTo: `${base}/users/${username}`,
    content: post.content,
    published: post.created_at,
    to: ["https://www.w3.org/ns/activitystreams#Public"],
  });
}