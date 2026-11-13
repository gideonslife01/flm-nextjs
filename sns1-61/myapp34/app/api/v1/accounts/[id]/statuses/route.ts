// ✅ myapp34
import { NextResponse } from 'next/server';
import db from '@/lib/db';

const DOMAIN = process.env.DOMAIN || 'aloy-horizon.duckdns.org';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: rawId } = await params;
    const id = decodeURIComponent(rawId);
    const { searchParams } = new URL(req.url);

    console.log(`👤 글 목록 요청! id=${id} raw=${rawId}`);

    // ✅ pinned!
    if (searchParams.get('pinned') === 'true') {
      console.log('📌 pinned! 빈 배열!');
      return NextResponse.json([], {
        headers: { 'Access-Control-Allow-Origin': '*' }
      });
    }

    // ✅ 리모트/remote (https:// 또는 remote_ 또는 mastodon 포함!) / 
    if (id.startsWith('https://') || id.startsWith('remote_') || id.includes('mastodon.social')) {
      console.log(`🌐 리모트! 빈 배열 리턴! (Mastodon은 401이라 글 못 가져옴! 정상!)`);
      // Mastodon.social은 outbox도 401! HTTP Signature 필요! 그래서 빈 배열이 정상!
      return NextResponse.json([], {
        headers: { 'Access-Control-Allow-Origin': '*' }
      });
    }

    // ✅ 로컬/local
    const username = rawId === '1'? 'user1' : `user${rawId}`;
    console.log(`🏠 로컬! username=${username}`);

    let rows: any[] = [];
    try {
      rows = db.prepare('SELECT * FROM posts WHERE username=? ORDER BY rowid DESC LIMIT 20').all(username) as any[];
      if (rows.length === 0) {
        rows = db.prepare('SELECT * FROM posts ORDER BY rowid DESC LIMIT 20').all() as any[];
      }
      console.log(`📊 ${rows.length}개 찾음!`);
    } catch (e) {
      console.error('DB 조회 실패', e);
    }

    const statuses = rows.map((row: any) => {
      const content = row.content || '';
      let createdAt = new Date().toISOString();
      try {
        if (typeof row.created_at === 'number') {
          createdAt = new Date(row.created_at > 1e12? row.created_at : row.created_at * 1000).toISOString();
        } else if (row.created_at) {
          createdAt = new Date(row.created_at).toISOString();
        }
      } catch {}

      return {
        id: String(row.id),
        uri: `https://${DOMAIN}/users/${username}/statuses/${row.id}`,
        url: `https://${DOMAIN}/users/${username}/statuses/${row.id}`,
        account: {
          id: rawId,
          username,
          acct: `${username}@${DOMAIN}`,
          display_name: username,
          avatar: `https://${DOMAIN}/icon.png`,
        },
        content: `<p>${content}</p>`,
        created_at: createdAt,
        visibility: 'public',
        reblogs_count: 0,
        favourites_count: 0,
      };
    });

    return NextResponse.json(statuses, {
      headers: { 'Access-Control-Allow-Origin': '*' }
    });

  } catch (e) {
    console.error('statuses 에러', e);
    return NextResponse.json([], {
      headers: { 'Access-Control-Allow-Origin': '*' }
    });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: { 'Access-Control-Allow-Origin': '*' }
  });
}