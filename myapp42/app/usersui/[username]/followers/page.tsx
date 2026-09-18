// ✅ myapp42 - app/usersui/[username]/followers/page.tsx
import { notFound } from 'next/navigation';
import db from '@/lib/db';
import FollowList from './ClientList';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function extractLocalUsername(actor: string): string | null {
  try {
    const url = new URL(actor);
    const parts = url.pathname.split('/');
    const idx = parts.indexOf('users');
    if (idx !== -1 && parts[idx + 1]) return parts[idx + 1];
  } catch {}
  return null;
}

export default async function Page({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;

  const user = db.prepare('SELECT username FROM users WHERE username=?').get(username) as any;
  if (!user) notFound();

  const followerRows = db.prepare(`SELECT actor, inbox, created_at FROM followers WHERE username=? ORDER BY created_at DESC`).all(username) as any[];

  const localUsernames = followerRows.map(r => extractLocalUsername(r.actor)).filter(Boolean) as string[];
  let localUsersMap = new Map();
  if (localUsernames.length > 0) {
    const placeholders = localUsernames.map(() => '?').join(',');
    // ✅ FIX! acct 빼고 display_name만!
    const users = db.prepare(`SELECT username, display_name FROM users WHERE username IN (${placeholders})`).all(...localUsernames) as any[];
    users.forEach((u: any) => localUsersMap.set(u.username, u));
  }

  const DOMAIN = process.env.DOMAIN || 'aloy-horizon.duckdns.org';

  const users = followerRows.map((r: any) => {
    const localName = extractLocalUsername(r.actor);
    const localInfo = localName? localUsersMap.get(localName) : null;
    return {
      username: localInfo?.username || localName || r.actor,
      display_name: localInfo?.display_name || localName || r.actor,
      acct: localName? `${localName}@${DOMAIN}` : new URL(r.actor).hostname, // ✅ acct는 직접 만들기 / Create the 'acct' yourself.
      actor: r.actor,
      isLocal: !!localInfo,
      created_at: r.created_at,
    };
  });

  return <FollowList username={username} type="followers" users={users} />;
}