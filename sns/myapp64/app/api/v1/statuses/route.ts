// ✅ myapp63 + myapp64
// app/api/v1/statuses/route.ts 

import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

const DOMAIN = process.env.DOMAIN || 'aloy-horizon.duckdns.org';

// 글 저장 / Save post
export async function POST(req: Request) {

  // 데이터베이스 초기화 / Initialize the database
  const db = getDb();
  await db.init();
  
  const body = await req.json();

  // 데이터 저장 / Save data to the database
  const post = await db.createPost({
    content: body.status || '',
    username: body.username || 'user1',
    visibility: body.visibility || 'public',
    in_reply_to_id: body.in_reply_to_id || null,
  });
 
  return NextResponse.json(post);

}

// 글 조회 / View post
export async function GET(req: Request) {
  const db = getDb();
  await db.init();
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const post = await db.getPostById(id);
  if (!post) return NextResponse.json({ error: 'not found' }, { status: 404 });
  
  return NextResponse.json(post);
}


// 글 삭제 / Delete post - ✅ myapp64
export async function DELETE(req: Request) {
  const db = getDb();
  await db.init();
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  // DB 모델에 deletePostById가 구현되어 있어야 합니다. 
  // The deletePostById method must be implemented in the DB model.
  const deleted = await db.deletePostById(id); 
  if (!deleted) {
    return NextResponse.json({ error: 'not found' }, { status: 404 });
  }

  return NextResponse.json({ message: 'successfully deleted' });
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {

      // CORS 설정 / CORS settings
      // - 프로덕션 모드에서는 바로 아래 주석 해제 하고 사용할 것
      // - 'Access-Control-Allow-Origin': `https://${DOMAIN}`,

      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}