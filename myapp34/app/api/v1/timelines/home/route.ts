// ✅myapp34 - app/api/v1/timelines/home/route.ts 
// - pinafore 홈 타임라인 API / pinafore Home Timeline API

import { NextResponse } from 'next/server';
import db from '@/lib/db';

const DOMAIN = process.env.DOMAIN || 'aloy-horizon.duckdns.org';

export async function GET(req: Request) {
  try {
    console.log('🏠 타임라인 요청 / Home timeline request');

    let rows: any[] = [];
    try {
      rows = db.prepare('SELECT * FROM posts ORDER BY rowid DESC LIMIT 20').all() as any[];
      console.log(`📊 posts ${rows.length}개 찾음 / Found ${rows.length} posts `, rows[0]);
    } catch (e) {
      console.error('❌ SELECT 실패 / SELECT failed', e);
      // 테이블 구조 확인!
      try {
        const tableInfo = db.prepare("PRAGMA table_info(posts)").all();
        console.log('📋 posts 테이블 구조 / Posts table structure:', tableInfo);
      } catch {}
      rows = [];
    }

    const statuses = rows.map((row: any) => {
      const id = row.id || row.rowid;
      const content = row.content || '';
      const username = row.username || 'user1';
      let createdAt = new Date().toISOString();
      try {
        const raw = row.created_at;
        if (typeof raw === 'number') {
          // 1788735983998 같은 경우!
          createdAt = new Date(raw > 1000000000000 ? raw : raw * 1000).toISOString();
        } else if (raw) {
          createdAt = new Date(raw).toISOString();
        }
      } catch {}

      return {
        id: String(id),
        uri: `https://${DOMAIN}/users/${username}/statuses/${id}`,
        url: `https://${DOMAIN}/users/${username}/statuses/${id}`,
        account: {
          id: '1',
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

    console.log(`✅ ${statuses.length}개 리턴 / Returned ${statuses.length} statuses`);
    return NextResponse.json(statuses, {
      headers: { 'Access-Control-Allow-Origin': '*' }
    });
  } catch (e) {
    console.error('💥 home 에러 / Home error', e);
    return NextResponse.json([], { headers: { 'Access-Control-Allow-Origin': '*' } });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type, Authorization' } });
}