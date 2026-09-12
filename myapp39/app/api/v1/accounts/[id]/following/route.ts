// ✅ myapp38 - following API
// /api/v1/accounts/:id/following

import { NextResponse } from 'next/server';
import db from '@/lib/db';

const DOMAIN = process.env.DOMAIN || 'aloy-horizon.duckdns.org';

function parseActor(actor: string, idx: number) {
  let name = `user${idx}`, domain = 'mastodon.social';
  try {
    const url = new URL(actor);
    domain = url.hostname;
    const m = actor.match(/\/users\/([^\/\?\#]+)/);
    if (m) name = m[1];
    else name = url.pathname.split('/').filter(Boolean).pop() || `user${idx}`;
    name = decodeURIComponent(name).replace(/[^a-zA-Z0-9_]/g,'_').substring(0,20);
  } catch {}
  return { name, domain };
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const username = 'user1';
    const rows = db.prepare(`SELECT id, actor, inbox, username, created_at FROM following WHERE username =? ORDER BY created_at DESC`).all(username) as any[];

    const accounts = rows.map((row: any, i: number) => {
      const { name, domain } = parseActor(row.actor, i);
      return {
        id: `following_${domain}_${name}_${i}`.replace(/\./g,'_'),
        username: name,
        acct: `${name}@${domain}`,
        display_name: name,
        avatar: `https://${DOMAIN}/icon.png`,
        avatar_static: `https://${DOMAIN}/icon.png`,
        header: `https://${DOMAIN}/icon.png`,
        header_static: `https://${DOMAIN}/icon.png`,
        followers_count: 0, following_count: 0, statuses_count: 0,
        locked: false, bot: false,
        created_at: row.created_at? new Date(row.created_at).toISOString() : new Date().toISOString(),
        note: `<p>${row.actor}</p>`,
        url: row.actor,
        emojis: [], fields: [],
      };
    });

    return new Response(JSON.stringify(accounts), {
      status: 200,
      headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' }
    });
  } catch(e) {
    console.error(e);
    return new Response(JSON.stringify([]), { headers: { 'Access-Control-Allow-Origin': '*' } });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type, Authorization' } });
}