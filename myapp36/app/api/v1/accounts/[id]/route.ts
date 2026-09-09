// ✅ myapp35 - app/api/v1/accounts/[id]/route.ts 
// - Profile info.

import { NextResponse } from 'next/server';
import db from '@/lib/db';

const DOMAIN = process.env.DOMAIN || 'aloy-horizon.duckdns.org';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: rawId } = await params;
    const id = decodeURIComponent(rawId);
    const tempUserid = req.headers.get('x-user') || 'user1';  // ✅ 로그인 이전 임시 아이피 변수 / Temporary ID variable before login

    // ✅ relationships 
    if (id === 'relationships') {
      const { searchParams } = new URL(req.url);
      
      // Pinafore는 ?id[]=remote_...&id[]=... 또는 ?id=remote_...
      let ids: string[] = [];
      ids = searchParams.getAll('id[]');
      if (ids.length === 0) ids = searchParams.getAll('id');
      if (ids.length === 0) {
        const single = searchParams.get('id');
        if (single) ids = [single];
      }

      console.log(`👥 relationships raw=${searchParams.toString()} ids=${ids.join(',')}`);

      const results = ids.map(remoteId => {
        let following = false;
        let followed_by = false;
        try {
          const decoded = decodeURIComponent(remoteId);

          // remote_mastodon_social_freelifemakers -> domain=mastodon.social
          const withoutPrefix = decoded.replace('remote_', '');
          const parts = withoutPrefix.split('_');
          const username = parts.pop() || 'user';
          const domain = parts.join('.') || 'mastodon.social';

          // ✅ following: 내가 팔로우했는지! actor에 domain 있으면 / Whether I followed! If the actor has a domain
          const row1 = db.prepare(`SELECT 1 FROM following WHERE username = ? AND actor LIKE ? LIMIT 1`)
          .get(tempUserid, `%${domain}%`) as any;
          if (row1) following = true;

          // ✅ followers: 상대가 나 팔로우했는지 / Whether the other person has followed me
          const row2 = db.prepare(`SELECT 1 FROM followers WHERE username = ? AND actor LIKE ? LIMIT 1`)
          .get(tempUserid, `%${domain}%`) as any;
          if (row2) followed_by = true;

          console.log(`✅ ${decoded} -> following=${following} followed_by=${followed_by}`);
        } catch {}
        return {
          id: remoteId,
          following,
          followed_by,
          blocking: false, muting: false, requested: false,
          domain_blocking: false, showing_reblogs: true, endorsed: false,
        };
      });

      return NextResponse.json(results, { headers: { 'Access-Control-Allow-Origin': '*' } });
    }

    console.log(`👤 프로필/Profile id=${id}`);

    if (id.startsWith('remote_')) {
      const withoutPrefix = id.replace('remote_', '');
      const parts = withoutPrefix.split('_');
      const username = parts.pop() || 'user';
      const domain = parts.join('.') || 'mastodon.social';

      let statusesCount = 0;
      let actorFromFollow: string | null = null;
      let followersCount = 0;
      let followingCount = 0;

      try {
        // - actor 찾기 / search actor
        const f1 = db.prepare(`SELECT actor FROM followers WHERE actor LIKE ? ORDER BY rowid DESC LIMIT 1`).get(`%${domain}%`) as any;
        if (f1?.actor) actorFromFollow = f1.actor;
        else {
          const f2 = db.prepare(`SELECT actor FROM following WHERE actor LIKE ? ORDER BY rowid DESC LIMIT 1`).get(`%${domain}%`) as any;
          if (f2?.actor) actorFromFollow = f2.actor;
        }

        // - 글 수 / Post counts
        if (actorFromFollow) {
          const cnt = db.prepare(`SELECT COUNT(*) as cnt FROM inbox_posts WHERE actor = ?`).get(actorFromFollow) as any;
          statusesCount = cnt?.cnt || 0;

          // domain만으로도 / only domain
          if (statusesCount === 0) {
            const cnt2 = db.prepare(`SELECT COUNT(*) as cnt FROM inbox_posts WHERE actor LIKE ?`).get(`%${domain}%`) as any;
            statusesCount = cnt2?.cnt || 0;
          }
        } else {
          const cnt = db.prepare(`SELECT COUNT(*) as cnt FROM inbox_posts WHERE actor LIKE ?`).get(`%${domain}%`) as any;
          statusesCount = cnt?.cnt || 0;
        }

        // ✅ FOLLOWS/FOLLOWERS COUNT
        /**
         * 리모트 계정 프로필에서는! GoToSocial/Mastodon이 count 팔로우와 팔로워 개수 주지않음.
         * 그래서 내 로컬 아이디가 팔로우하고팔로워하는 갯수를 pinafore에 표시하도록 함.
         * 진짜 팔로우,팔로워정보는 해당 웹사이트에서 확인해야 함.
         * 
         * For remote account profiles, GoToSocial/Mastodon does not provide the following/follower counts.
         * Therefore, the counts of follows and followers for the local account are displayed in Pinafore instead.
         * To see the actual following and follower information, you must check the respective website.
         **/

        const followingCnt = db.prepare(`SELECT COUNT(*) as cnt FROM following WHERE username = ?`).get(`${tempUserid}`) as any;
        const followersCnt = db.prepare(`SELECT COUNT(*) as cnt FROM followers WHERE username = ?`).get(`${tempUserid}`) as any;
        
        // - cnt == number
        followingCount = followingCnt?.cnt || 1;
        followersCount = followersCnt?.cnt || 1;

        console.log(`📊 ${domain} posts=${statusesCount} following=${followingCount} followers=${followersCount} actor=${actorFromFollow}`);
      } catch (e) {
        console.error(e);
      }

      // 프로필 / Profile
      let row: any = null;
      try {
        if (actorFromFollow) {
          row = db.prepare(`SELECT * FROM inbox_posts WHERE actor = ? ORDER BY rowid DESC LIMIT 1`).get(actorFromFollow) as any;
        }
        if (!row) row = db.prepare(`SELECT * FROM inbox_posts WHERE actor LIKE ? ORDER BY rowid DESC LIMIT 1`).get(`%${domain}%`) as any;
      } catch {}

      if (row) {
        return NextResponse.json({
          id: rawId,
          username: username,
          acct: `${username}@${domain}`,
          display_name: username,
          avatar: `https://${DOMAIN}/icon.png`,
          avatar_static: `https://${DOMAIN}/icon.png`,
          header: `https://picsum.photos/seed/${domain}_${username}/1200/400`,
          header_static: `https://picsum.photos/seed/${domain}_${username}/1200/400`,
          followers_count: followersCount, // ✅ 2!
          following_count: followingCount, // ✅ 2!
          statuses_count: statusesCount, // ✅ 6 or 1!
          note: `<p>${username}@${domain}<br>Actor: ${actorFromFollow}<br>Posts in DB: ${statusesCount}</p>`,
          url: row.actor,
          emojis: [],
          fields: [
            { name: 'Domain', value: domain },
            { name: 'Actor', value: actorFromFollow || 'unknown' },
            { name: 'Posts', value: String(statusesCount) }
          ],
          bot: false,
          created_at: row.created_at,
        }, { headers: { 'Access-Control-Allow-Origin': '*' } });
      }

      // fetch 실패시 / if failed fetch...
      return NextResponse.json({
        id: rawId, username, acct: `${username}@${domain}`, display_name: username,
        avatar: `https://${DOMAIN}/icon.png`,
        avatar_static: `https://${DOMAIN}/icon.png`,
        header: `https://picsum.photos/seed/${domain}_${username}/1200/400`,
        followers_count: followersCount || 1,
        following_count: followingCount || 1,
        statuses_count: statusesCount,
        note: `<p>${username}@${domain}</p>`,
        url: `https://${domain}/users/${username}`,
        emojis: [], fields: [], bot: false,
        created_at: new Date().toISOString(),
      }, { headers: { 'Access-Control-Allow-Origin': '*' } });
    }

    // 로컬 / local
    const cntPosts = db.prepare(`SELECT COUNT(*) as cnt FROM posts WHERE username = ?`).get(`${tempUserid}`) as any;
    const cntFollowing = db.prepare(`SELECT COUNT(*) as cnt FROM following WHERE username = ?`).get(`${tempUserid}`) as any;
    const cntFollowers = db.prepare(`SELECT COUNT(*) as cnt FROM followers WHERE username = ?`).get(`${tempUserid}`) as any;

    return NextResponse.json({
      id: rawId, username: `${tempUserid}`, acct: `${tempUserid}@${DOMAIN}`, display_name: `${tempUserid}`,
      avatar: `https://${DOMAIN}/icon.png`, 
      avatar_static: `https://${DOMAIN}/icon.png`,
      header: `https://picsum.photos/seed/${DOMAIN}_${tempUserid}/1200/400`,
      header_static: `https://picsum.photos/seed/${DOMAIN}_${tempUserid}/1200/400`,
      followers_count: cntFollowers?.cnt || 2,
      following_count: cntFollowing?.cnt || 2,
      statuses_count: cntPosts?.cnt || 9,
      note: `<p>${tempUserid}</p>`,
      url: `https://${DOMAIN}/users/${tempUserid}`, 
      emojis: [], fields: [], bot: false,
      created_at: new Date().toISOString(),
    }, { headers: { 'Access-Control-Allow-Origin': '*' } });

  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'failed' }, { status: 500, headers: { 'Access-Control-Allow-Origin': '*' } });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: { 'Access-Control-Allow-Origin': '*' } });
}