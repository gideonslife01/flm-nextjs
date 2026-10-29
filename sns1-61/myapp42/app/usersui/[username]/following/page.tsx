// ✅ app/usersui/[username]/following/page.tsx
import { notFound } from 'next/navigation';
import db from '@/lib/db';
import FollowList from '../followers/ClientList';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function extractLocalUsername(actor: string): string | null {
  try {
    const u = new URL(actor);
    const parts = u.pathname.split('/');
    const idx = parts.indexOf('users');
    if (idx!== -1 && parts[idx + 1]) return parts[idx + 1];
  } catch {}
  return null;
}

export default async function Page({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;

  console.log('[following] username:', username); // ✅ 로그!

  const user = db.prepare('SELECT username, display_name FROM users WHERE username=?').get(username) as any;
  if (!user) {
    console.log('[following] notFound! user 없음:', username);
    notFound();
  }

  const rows = db.prepare(`SELECT actor, created_at FROM following WHERE username=? ORDER BY created_at DESC`).all(username) as any[];
  console.log('[following] rows:', rows.length);

  const localNames = rows.map(r => extractLocalUsername(r.actor)).filter(Boolean) as string[];
  let map = new Map();
  if (localNames.length > 0) {
    const ph = localNames.map(() => '?').join(',');
    const users = db.prepare(`SELECT username, display_name FROM users WHERE username IN (${ph})`).all(...localNames) as any[];
    users.forEach(u => map.set(u.username, u));
  }

  const DOMAIN = process.env.DOMAIN || 'aloy-horizon.duckdns.org';
  const users = rows.map((r: any) => {
    const local = extractLocalUsername(r.actor);
    const info = local? map.get(local) : null;
    return {
      username: info?.username || local || r.actor,
      display_name: info?.display_name || local || r.actor,
      acct: local? `${local}@${DOMAIN}` : new URL(r.actor).hostname,
      actor: r.actor,
      created_at: r.created_at,
    };
  });

  return <FollowList username={username} type="following" users={users} />;
}