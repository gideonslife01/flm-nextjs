// ✅ myapp47
//  app/users/[username]/statuses/[id]/route.ts - Tombstone fix

import { NextResponse } from 'next/server';
import db from '@/lib/db';

const DOMAIN = process.env.DOMAIN || 'aloy-horizon.duckdns.org';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ username: string; id: string }> }
) {
  const { username, id } = await params;

  console.log(`🔍 Note 조회(return tombstone): /users/${username}/statuses/${id}`);

  const post = db.prepare('SELECT * FROM posts WHERE id=?').get(id) as any;
  
  if (!post) {
    //  404 말고 410 + Tombstone, GoToSocial, Mastodon에 삭제 확인 용
    // For deletion confirmation on Tombstone, GoToSocial, Mastodon instead of 404 410
    console.log(`🪦 Tombstone 응답: ${id}`);
    return NextResponse.json({
      '@context': 'https://www.w3.org/ns/activitystreams',
      id: `https://${DOMAIN}/users/${username}/statuses/${id}`,
      type: 'Tombstone', // ⭐️
      formerType: 'Note',
      deleted: new Date().toISOString()
    }, {
      status: 410, // 410 Gone
      headers: {
        'Content-Type': 'application/activity+json; charset=utf-8',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }

  // id, url 모두 /statuses/로 일치 시킴 / Match both id and url to /statuses/
  const note = {
    '@context': 'https://www.w3.org/ns/activitystreams',
    id: `https://${DOMAIN}/users/${username}/statuses/${id}`,
    type: 'Note',
    attributedTo: `https://${DOMAIN}/users/${username}`,
    content: post.content?.startsWith('<p>') ? post.content : `<p>${post.content}</p>`,
    published: new Date(post.created_at || Date.now()).toISOString(),
    to: ['https://www.w3.org/ns/activitystreams#Public'],
    cc: [`https://${DOMAIN}/users/${username}/followers`],
    url: `https://${DOMAIN}/users/${username}/statuses/${id}`
  };

  return NextResponse.json(note, {
    headers: {
      'Content-Type': 'application/activity+json; charset=utf-8',
      'Access-Control-Allow-Origin': '*'
    }
  });
}