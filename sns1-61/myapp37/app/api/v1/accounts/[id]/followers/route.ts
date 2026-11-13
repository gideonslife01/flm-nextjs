// ✅ myapp37 - followers API
// /api/v1/accounts/:id/followers

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
    name = decodeURIComponent(name).replace(/[^a-zA-Z0-9_]/g,'_');
  } catch {}
  return { name, domain };
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: rawId } = await params;
    const username = 'user1';
    
    // ✅ followers는 created_at 컬럼 없음! inbox 있음!
    let rows: any[] = [];
    try {
      rows = db.prepare(`SELECT id, actor, inbox, username FROM followers WHERE username =?`).all(username) as any[];
    } catch(e) {
      console.error('❌ followers select error', e);
      // 혹시! 다른 스키마면! 전체!
      try { rows = db.prepare(`SELECT * FROM followers WHERE username =?`).all(username) as any[]; } catch(e2){ rows=[]; }
    }

    console.log(`👥 followers rows=${rows.length}`);

    const accounts = rows.map((row: any, i: number) => {
      const actor = row.actor || '';
      const { name, domain } = parseActor(actor, i);
      return {
        id: `followers_${domain}_${name}_${i}`.replace(/\./g,'_'),
        username: name,
        acct: `${name}@${domain}`,
        display_name: name,
        avatar: `https://${DOMAIN}/icon.png`,
        avatar_static: `https://${DOMAIN}/icon.png`,
        header: `https://${DOMAIN}/icon.png`,
        header_static: `https://${DOMAIN}/icon.png`,
        followers_count: 0, following_count: 0, statuses_count: 0,
        locked: false, bot: false,
        created_at: new Date().toISOString(),
        note: `<p>${actor}</p>`,
        url: actor,
        emojis: [], fields: [],
      };
    });

    return new Response(JSON.stringify(accounts), {
      status: 200,
      headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' }
    });
  } catch(e) {
    console.error('❌ followers fatal', e);
    return new Response(JSON.stringify([]), {
      headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' }
    });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    }
  });
}