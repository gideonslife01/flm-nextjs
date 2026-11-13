// ✅ myapp34 - Profile info.

import { NextResponse } from 'next/server';
const DOMAIN = process.env.DOMAIN || 'aloy-horizon.duckdns.org';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: rawId } = await params;
    const id = decodeURIComponent(rawId);
    console.log(`👤 계정 요청 ! id=${id} raw=${rawId}`);

    // ✅ 리모트/remote!
    if (id.includes('mastodon.social') || id.includes('https') || id.startsWith('remote_')) {
      console.log(`🌐 리모트 계정으로 처리!`);

      let username = 'remote';
      let domain = 'mastodon.social';
      let url = id;

      if (id.startsWith('remote_')) {
        // ✅ remote_mastodon_social_freelifemakers -> 파싱/parse!
        const withoutPrefix = id.replace('remote_', ''); // mastodon_social_freelifemakers
        const parts = withoutPrefix.split('_'); // [mastodon, social, freelifemakers]
        username = parts.pop() || 'user'; // 마지막이 username! freelifemakers
        domain = parts.join('.') || 'mastodon.social'; // 나머지는 domain! mastodon.social
        url = `https://${domain}/@${username}`;
        console.log(`🌐 파싱! domain=${domain} username=${username}`);
      } else if (id.startsWith('https://')) {
        try {
          const u = new URL(id);
          domain = u.hostname;
          username = u.pathname.split('/').pop() || 'user';
          url = id;
        } catch {}
      } else if (id.includes('@')) {
        // freelifemakers@mastodon.social 형식!
        const [u, d] = id.split('@');
        username = u;
        domain = d;
        url = `https://${domain}/@${username}`;
      }

      // ✅ Profile 헤더/Profile header picsum으로! public/header.png 없어도 됨!
      const headerUrl = `https://picsum.photos/seed/${domain}_${username}/1200/400`;

      return NextResponse.json({
        id: rawId,
        username: username,
        acct: `${username}@${domain}`,
        display_name: username,
        avatar: `https://${DOMAIN}/icon.png`,
        header: headerUrl, // ✅ 커버! 그라데이션!
        header_static: headerUrl,
        avatar_static: `https://${DOMAIN}/icon.png`,
        followers_count: 123,
        following_count: 45,
        statuses_count: 67,
        note: `<p>Remote account from ${domain}</p>`,
        url: url,
        emojis: [],
        fields: [
          { name: 'Domain', value: domain },
          { name: 'Original', value: url }
        ],
        bot: false,
        group: false,
        discoverable: true,
        noindex: false,
        suspended: false,
        limited: false,
        locked: false,
        created_at: new Date().toISOString(),
        last_status_at: new Date().toISOString(),
      }, { headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' } });
    }

    // ✅ 로컬/local
    const username = rawId === '1'? 'user1' : rawId.replace('user', '')? `user${rawId}` : 'user1';
    const headerUrl = `https://picsum.photos/seed/${username}_${DOMAIN}/1200/400`;

    return NextResponse.json({
      id: rawId,
      username,
      acct: `${username}@${DOMAIN}`,
      display_name: username,
      avatar: `https://${DOMAIN}/icon.png`,
      avatar_static: `https://${DOMAIN}/icon.png`,
      header: headerUrl, // ✅ 커버!
      header_static: headerUrl,
      followers_count: 1,
      following_count: 1,
      statuses_count: 9,
      note: `<p>${username} on ${DOMAIN}</p>`,
      url: `https://${DOMAIN}/users/${username}`,
      emojis: [],
      fields: [],
      bot: false,
      group: false,
      discoverable: true,
      created_at: new Date().toISOString(),
      last_status_at: new Date().toISOString(),
    }, { headers: { 'Access-Control-Allow-Origin': '*' } });

  } catch (e) {
    console.error('accounts/[id] 에러', e);
    return NextResponse.json({
      id: '1',
      username: 'user1',
      acct: `user1@${DOMAIN}`,
      display_name: 'user1',
      avatar: `https://${DOMAIN}/icon.png`,
      header: `https://picsum.photos/seed/user1/1200/400`,
      followers_count: 1,
      following_count: 1,
      statuses_count: 9,
      note: 'Error fallback',
      url: `https://${DOMAIN}/users/user1`,
      emojis: [],
      fields: []
    }, { headers: { 'Access-Control-Allow-Origin': '*' } });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Authorization, Content-Type'
    }
  });
}