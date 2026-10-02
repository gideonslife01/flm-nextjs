import db from '@/lib/db';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const resource = searchParams.get('resource') || '';
  const DOMAIN = process.env.DOMAIN || 'aloy-horizon.duckdns.org';

  let username: string | null = null;
  if (resource.startsWith('acct:')) {
    const m = resource.match(/^acct:([^@]+)@/);
    if (m) username = m[1];
  } else if (resource.includes('/users/')) {
    const m = resource.match(/\/users\/([^\/\?]+)/);
    if (m) username = m[1];
  }

  if (!username) return new Response('not found', { status: 404 });

  // DB에서 검색 / Search in DB
  const user = db.prepare('SELECT username FROM users WHERE username =?').get(username) as any;
  if (!user) {
    console.log(`❌ WebFinger: ${username} 없음 / Not found`);
    return new Response('not found', { status: 404 });
  }

  console.log(`✅ WebFinger: ${username} 찾음 / Found`);
  const actorUrl = `https://${DOMAIN}/users/${username}`;

  return new Response(JSON.stringify({
    subject: `acct:${username}@${DOMAIN}`,
    aliases: [actorUrl],
    links: [{ rel: 'self', type: 'application/activity+json', href: actorUrl }]
  }), {
    headers: {
      'Content-Type': 'application/jrd+json',
      'Access-Control-Allow-Origin': '*'
    }
  });
}