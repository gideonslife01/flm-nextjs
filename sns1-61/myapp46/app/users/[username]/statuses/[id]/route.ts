// app/users/[username]/statuses/[id]/route.ts - Next.js 15 FIX!
import { NextResponse } from 'next/server';
import db from '@/lib/db';

const DOMAIN = process.env.DOMAIN || 'aloy-horizon.duckdns.org';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ username: string; id: string }> }
) {
  const { username, id } = await params; // 👈 await 필수!

  console.log(`🔍 Note 조회: /users/${username}/statuses/${id}`);

  const post = db.prepare('SELECT * FROM posts WHERE id=?').get(id) as any;
  if (!post) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const note = {
    '@context': 'https://www.w3.org/ns/activitystreams',
    id: `https://${DOMAIN}/users/${username}/posts/${id}`,
    type: 'Note',
    attributedTo: `https://${DOMAIN}/users/${username}`,
    content: post.content?.startsWith('<p>') ? post.content : `<p>${post.content}</p>`,
    published: new Date(post.created_at || Date.now()).toISOString(),
    to: ['https://www.w3.org/ns/activitystreams#Public'],
    cc: [`https://${DOMAIN}/users/${username}/followers`],
    url: `https://${DOMAIN}/users/${username}/posts/${id}`
  };

  return NextResponse.json(note, {
    headers: {
      'Content-Type': 'application/activity+json; charset=utf-8',
      'Access-Control-Allow-Origin': '*'
    }
  });
}