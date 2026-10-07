// ✅ myapp57
// - app/api/v1/statuses/[id]/context/route.ts

import { NextResponse } from 'next/server';
import db from '@/lib/db';

const DOMAIN = process.env.DOMAIN || 'aloy-horizon.duckdns.org';

function toStatus(row: any) {
  if (!row) return null;
  const username = row.username || row.handle?.split('@')[0] || 'unknown';
  return {
    id: String(row.id),
    uri: `https://${DOMAIN}/users/${username}/statuses/${row.id}`,
    url: `https://${DOMAIN}/users/${username}/statuses/${row.id}`,
    created_at: new Date(row.created_at || Date.now()).toISOString(),
    content: row.content?.startsWith('<')? row.content : `<p>${row.content || ''}</p>`,
    account: {
      id: String(row.mastodon_id || username),
      username: username,
      acct: username,
      display_name: row.display_name || username,
      avatar: `https://${DOMAIN}/icon.png`,
      avatar_static: `https://${DOMAIN}/icon.png`,
      header: `https://${DOMAIN}/header.png`,
      header_static: `https://${DOMAIN}/header.png`,
      followers_count: 0,
      following_count: 0,
      statuses_count: 0,
      locked: false,
      bot: false,
      discoverable: true,
    },
    in_reply_to_id: row.in_reply_to_id? String(row.in_reply_to_id) : null,
    in_reply_to_account_id: null,
    reblog: null,
    visibility: row.visibility || 'public',
    sensitive: false,
    spoiler_text: '',
    reblogs_count: 0,
    favourites_count: row.likes_count || 0,
    replies_count: 0,
    favourited: false,
    reblogged: false,
    muted: false,
    bookmarked: false,
    pinned: false,
    media_attachments: [],
    mentions: [],
    tags: [],
    emojis: [],
    card: null,
    poll: null,
  };
}

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  const id = params.id;
  if (!id) {
    return NextResponse.json({ ancestors: [], descendants: [] }, {
      headers: { 'Access-Control-Allow-Origin': '*' }
    });
  }

  // 부모 글 찾기 (posts + inbox_posts 둘 다)
  const target =
    (db.prepare('SELECT p.*, u.mastodon_id FROM posts p LEFT JOIN users u ON p.username = u.username WHERE p.id =?').get(id) as any) ||
    (db.prepare('SELECT * FROM inbox_posts WHERE id =?').get(id) as any);

  if (!target) {
    return NextResponse.json({ ancestors: [], descendants: [] }, {
      headers: { 'Access-Control-Allow-Origin': '*' }
    });
  }

  // 1. ancestors: 위로 올라가기 (최대 10단계)
  const ancestors: any[] = [];
  let cur = target;
  for (let i = 0; i < 10; i++) {
    if (!cur.in_reply_to_id) break;
    const parent =
      (db.prepare('SELECT p.*, u.mastodon_id FROM posts p LEFT JOIN users u ON p.username = u.username WHERE p.id =?').get(cur.in_reply_to_id) as any) ||
      (db.prepare('SELECT * FROM inbox_posts WHERE id =?').get(cur.in_reply_to_id) as any);
    if (!parent) break;
    ancestors.unshift(toStatus(parent));
    cur = parent;
  }

  // 2. descendants: 아래로 내려가기 (내 글에 달린 댓글들)
  const descendants: any[] = [];
  function getChildren(parentId: string) {
    const children = db.prepare(
      'SELECT p.*, u.mastodon_id FROM posts p LEFT JOIN users u ON p.username = u.username WHERE p.in_reply_to_id =? ORDER BY p.created_at ASC'
    ).all(parentId) as any[];
    for (const c of children) {
      const s = toStatus(c);
      if (s) descendants.push(s);
      getChildren(c.id);
    }
  }
  getChildren(id);

  return NextResponse.json(
    { ancestors, descendants },
    { headers: { 'Access-Control-Allow-Origin': '*' } }
  );
}