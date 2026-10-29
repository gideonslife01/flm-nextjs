// ✅ myapp43 - app/api/followerslist/route.ts
import { NextResponse } from 'next/server';
import db from '@/lib/db';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const username = searchParams.get('username');
  if (!username) return NextResponse.json({ error: 'username required' }, { status: 400 });

  const DOMAIN = process.env.DOMAIN || 'aloy-horizon.duckdns.org';
  const rows = db.prepare(`SELECT actor FROM following WHERE username=? ORDER BY created_at DESC`).all(username) as any[];

  const data = rows.map(r => {
    try {
      const url = new URL(r.actor);
      const hostname = url.hostname; // ex) freelifemakers.com

      const parts = url.pathname.split('/').filter(Boolean);
      let remoteName: string | null = null;
      const idx = parts.indexOf('users');
      if (idx!== -1) remoteName = parts[idx+1];
      else if (parts[0]?.startsWith('@')) remoteName = parts[0].substring(1);
      else remoteName = parts[0];

      // ✅ 도메인이 내 도메인일 때만 로컬 DB 조회!
      // Query the local DB only when the domain matches mine!
      const isLocalDomain = hostname === DOMAIN || hostname === 'localhost' || hostname.endsWith(`.${DOMAIN}`);

      let info = null;
      if (isLocalDomain && remoteName) {
        info = db.prepare('SELECT username, display_name FROM users WHERE username=?').get(remoteName) as any;
      }

      const isLocalUser = isLocalDomain &&!!info;

      return {
        username: remoteName || r.actor,
        display_name: info?.display_name || remoteName || 'remote',
        acct: isLocalUser
         ? `${remoteName}@${DOMAIN}` // ✅ 진짜 로컬일 때만 aloy
          : `${remoteName}@${hostname}`, // ✅ freelifemakers.com이면 freelifemakers@freelifemakers.com
        actor: r.actor,
        domain: hostname,
      };
    } catch {
      return { acct: r.actor, actor: r.actor, username: r.actor };
    }
  });

  return NextResponse.json(data);
}