// ✅ myapp35 - app/api/v1/accounts/[id]/statuses/route.ts
// - pinafore s

import { NextResponse } from 'next/server';
import db from '@/lib/db';

const DOMAIN = process.env.DOMAIN || 'aloy-horizon.duckdns.org';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: rawId } = await params;
    const id = decodeURIComponent(rawId);
    const tempUserid = req.headers.get('x-user') || 'user1';
    const { searchParams } = new URL(req.url);

    if (searchParams.get('pinned') === 'true' || searchParams.get('only_media') === 'true') {
      return NextResponse.json([], { headers: { 'Access-Control-Allow-Origin': '*' } });
    }

    if (id.startsWith('remote_')) {
     
      const withoutPrefix = id.replace('remote_', '');
      const parts = withoutPrefix.split('_');
      const username = parts.pop() || 'user';
      const domain = parts.join('.') || 'mastodon.social';

      console.log(`📝 리모트 글 /remote posts ${username}@${domain}`);

      let rows: any[] = [];
      let actorFromFollow: string | null = null;

      try {
        const followRow = db.prepare(`SELECT * FROM followers WHERE actor LIKE ? ORDER BY rowid DESC LIMIT 1`).get(`%${domain}%`) as any;
        if (!followRow) {
          const followingRow = db.prepare(`SELECT * FROM following WHERE actor LIKE ? ORDER BY rowid DESC LIMIT 1`).get(`%${domain}%`) as any;
          if (followingRow) actorFromFollow = followingRow.actor;
        } else {
          actorFromFollow = followRow.actor;
        }

        if (actorFromFollow) {
          rows = db.prepare(`SELECT * FROM inbox_posts WHERE actor = ? OR actor LIKE ? ORDER BY created_at DESC LIMIT 20`).all(actorFromFollow, `%${actorFromFollow}%`) as any[];
        }
        if (rows.length === 0) {
          rows = db.prepare(`SELECT * FROM inbox_posts WHERE actor LIKE ? AND actor LIKE ? ORDER BY created_at DESC LIMIT 20`).all(`%${domain}%`, `%/users/${username}%`) as any[];
        }
        if (rows.length === 0) {
          rows = db.prepare(`SELECT * FROM inbox_posts WHERE actor LIKE ? ORDER BY created_at DESC LIMIT 20`).all(`%${domain}%`) as any[];
        }
      } catch {}

      console.log(`✅ 최종 ${rows.length}개! ${username}@${domain}`);

      const statuses = rows.map((row: any) => {
        let contentText = '';
        let originalId = row.original_id || row.id;
        let createdAt = row.created_at;
        let actor = row.actor;
        try {
          if (row.content && row.content.startsWith('{')) {
            const obj = JSON.parse(row.content);
            const inner = obj.object || obj;
            contentText = inner.content || inner.object?.content || '';
            originalId = inner.id || obj.id || originalId;
            createdAt = inner.published || obj.published || createdAt;
            actor = obj.actor || actor;
            if (typeof actor === 'object') actor = actor.id;
          } else {
            contentText = row.content || '';
          }
        } catch { contentText = row.content || ''; }

        return {
          id: String(row.id || row.original_id || Date.now()),
          uri: originalId || actor,
          url: originalId || actor,
          account: { id: rawId, username, acct: `${username}@${domain}`, display_name: username, avatar: `https://${DOMAIN}/icon.png` },
          content: contentText.startsWith('<') ? contentText : `<p>${contentText}</p>`,
          created_at: createdAt || new Date().toISOString(),
          visibility: 'public',
          reblogs_count: 0, favourites_count: 0, replies_count: 0,
          favourited: false, reblogged: false, muted: false, bookmarked: false, pinned: false,
        };
      });
      return NextResponse.json(statuses, { headers: { 'Access-Control-Allow-Origin': '*' } });
    }

    const localUsername = id === '1' || id === 'user1' ? tempUserid : id === '1' ? tempUserid : rawId.startsWith('user') ? rawId : tempUserid;

    console.log(`📝 로컬 글/Local post username=${localUsername} id=${id}`);

    const rows = db.prepare(`SELECT * FROM posts WHERE username = ? ORDER BY created_at DESC LIMIT 20`).all(localUsername) as any[];

    const statuses = rows.map((row: any) => ({
      id: String(row.id),
      uri: `https://${DOMAIN}/users/${row.username}/statuses/${row.id}`,
      url: `https://${DOMAIN}/users/${row.username}/statuses/${row.id}`,
      account: { id: rawId, username: row.username, acct: `${row.username}@${DOMAIN}`, display_name: row.username, avatar: `https://${DOMAIN}/icon.png` },
      content: `<p>${row.content || ''}</p>`,
      created_at: row.created_at || new Date().toISOString(),
      visibility: 'public',
      reblogs_count: 0, favourites_count: 0, replies_count: 0,
      favourited: false, reblogged: false, muted: false, bookmarked: false, pinned: false,
    }));

    return NextResponse.json(statuses, { headers: { 'Access-Control-Allow-Origin': '*' } });

  } catch (e) {
    console.error(e);
    return NextResponse.json([], { headers: { 'Access-Control-Allow-Origin': '*' } });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: { 'Access-Control-Allow-Origin': '*' } });
}