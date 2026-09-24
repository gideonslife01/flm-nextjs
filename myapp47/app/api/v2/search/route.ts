// ✅ myapp34
import { NextResponse } from 'next/server';
import db from '@/lib/db';

const DOMAIN = process.env.DOMAIN || 'aloy-horizon.duckdns.org';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get('q') || '';
  console.log(`🔍 검색/Search: ${q}`);

  let accounts: any[] = [];

  try {
    const rows = db.prepare('SELECT * FROM accounts WHERE username LIKE? LIMIT 10').all(`%${q}%`) as any[];
    accounts = rows.map((row: any) => ({
      id: row.id || '1',
      username: row.username,
      acct: `${row.username}@${DOMAIN}`,
      display_name: row.username,
      avatar: `https://${DOMAIN}/icon.png`,
      header: `https://${DOMAIN}/header.png`, // ✅ 커버 추가 / Added cover
    }));
  } catch {}

  if (q.includes('@')) {
    const match = q.match(/@?([^@]+)@(.+)/);
    if (match) {
      const username = match[1].toLowerCase();
      const domain = match[2].toLowerCase();

      if (domain === DOMAIN) {
        console.log(`🏠 자기 자신/myself ${username}@${DOMAIN}`);
        if (!accounts.find(a => a.username === username)) {
          accounts.push({
            id: username === 'user1'? '1' : '2',
            username: username,
            acct: `${username}@${DOMAIN}`,
            display_name: username,
            avatar: `https://${DOMAIN}/icon.png`,
            header: `https://${DOMAIN}/header.png`,
          });
        }
      } else {
        try {
          console.log(`🌐 리모트/remote: ${username}@${domain}`);
          const wfRes = await fetch(`https://${domain}/.well-known/webfinger?resource=acct:${username}@${domain}`, {
            headers: {
              Accept: 'application/jrd+json',
              'User-Agent': 'AloyHorizon/1.0 (ActivityPub; +https://aloy-horizon.duckdns.org)'
            },
            signal: AbortSignal.timeout(3000)
          });

          console.log(`📡 webfinger ${wfRes.status}`);

          if (wfRes.ok) {
            const wf = await wfRes.json();
            const link = wf.links?.find((l: any) => l.rel === 'self');
            const href = link?.href;

            if (href) {
              console.log(`🔗 actor href: ${href}`);

              // ✅ 안전한 ID!. -> _, / 없음!
              const safeId = `remote_${domain}_${username}`.replace(/\./g, '_').replace(/[^a-zA-Z0-9_]/g, '_');
              console.log(`🔒 safeId: ${safeId}`);

              const actorRes = await fetch(href, {
                headers: {
                  Accept: 'application/activity+json, application/ld+json; profile="https://www.w3.org/ns/activitystreams"',
                  'User-Agent': 'AloyHorizon/1.0 (ActivityPub; +https://aloy-horizon.duckdns.org)'
                },
                signal: AbortSignal.timeout(3000)
              });

              console.log(`📡 actor ${actorRes.status}`);

              if (actorRes.ok) {
                const actor = await actorRes.json();
                accounts.push({
                  id: safeId, // ✅ 안전한 ID!
                  username: actor.preferredUsername || username,
                  acct: `${actor.preferredUsername}@${domain}`,
                  display_name: actor.name || username,
                  avatar: actor.icon?.url || `https://${DOMAIN}/icon.png`,
                  header: actor.image?.url || (actor as any).header?.url || `https://${DOMAIN}/header.png`, // ✅ 커버!
                  url: actor.id, // 원본 URL은 url 필드에!
                });
                console.log(`✅ 찾음/found! ${username}@${domain} safeId=${safeId}`);
              } else {
                console.log(`⚠ actor 401이지만 webfinger로 리턴! ${username}@${domain}`);
                accounts.push({
                  id: safeId, // ✅ 안전한 ID!
                  username: username,
                  acct: `${username}@${domain}`,
                  display_name: username,
                  avatar: `https://${DOMAIN}/icon.png`,
                  header: `https://${DOMAIN}/header.png`, // ✅ 커버!
                  url: href,
                });
              }
            }
          }
        } catch (e) {
          console.log(`❌ 리모트 실패`, domain, e);
        }
      }
    }
  }

  if (accounts.length === 0 && q.toLowerCase().includes('user1')) {
    accounts = [{
      id: '1',
      username: 'user1',
      acct: `user1@${DOMAIN}`,
      display_name: 'user1',
      avatar: `https://${DOMAIN}/icon.png`,
      header: `https://${DOMAIN}/header.png`,
    }];
  }

  return NextResponse.json({ accounts, statuses: [], hashtags: [] }, {
    headers: { 'Access-Control-Allow-Origin': '*' }
  });
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: { 'Access-Control-Allow-Origin': '*' } });
}