// ✅ myapp38 - app/api/v1/notifications/route.ts 

import { NextResponse } from 'next/server';
import db from '@/lib/db';

const DOMAIN = process.env.DOMAIN || 'aloy-horizon.duckdns.org';

function parseActor(actor: string, idx: number) {
  let name = `user${idx}`, domain = 'mastodon.social';
  try {
    const url = new URL(actor);
    domain = url.hostname;
    // /users/xxx, /@xxx, /ap/users/xxx 모두! 대응!
    const m = actor.match(/\/users\/([^\/\?\#]+)/) || actor.match(/\/@([^\/\?]+)/) || actor.match(/\/ap\/users\/([^\/\?]+)/);
    if (m) name = m[1];
    else name = url.pathname.split('/').filter(Boolean).pop() || `user${idx}`;
    name = decodeURIComponent(name).replace(/[^a-zA-Z0-9_]/g,'_').substring(0,20);
  } catch {}
  return { name, domain, actorUrl: actor };
}

function makeAccount(parsed: ReturnType<typeof parseActor>, idx: number, createdAt?: string) {
  return {
    id: `notif_acct_${parsed.domain}_${parsed.name}_${idx}`.replace(/\./g,'_'),
    username: parsed.name,
    acct: `${parsed.name}@${parsed.domain}`,
    display_name: parsed.name,
    avatar: `https://${DOMAIN}/icon.png`,
    avatar_static: `https://${DOMAIN}/icon.png`,
    header: `https://${DOMAIN}/icon.png`,
    header_static: `https://${DOMAIN}/icon.png`,
    followers_count: 0, following_count: 0, statuses_count: 0,
    locked: false, bot: false,
    created_at: createdAt || new Date().toISOString(),
    note: '',
    url: parsed.actorUrl,
    emojis: [], fields: [],
  };
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '20');
    const username = 'user1';
    const myActor = `https://${DOMAIN}/users/${username}`;

    const notifications: any[] = [];

    // 1. Follow 알림 / Follow Notification
    try {
      const follows = db.prepare(`SELECT id, actor, inbox, username, created_at FROM followers WHERE username =? ORDER BY created_at DESC LIMIT 20`).all(username) as any[];
      for (let i=0; i<follows.length; i++) {
        const row = follows[i];
        const actor = row.actor || '';
        if (actor.includes(myActor)) continue; // 자기 제외!
        const parsed = parseActor(actor, i);
        notifications.push({
          id: `follow_${i}_${row.id}`,
          type: 'follow',
          created_at: row.created_at? new Date(row.created_at).toISOString() : new Date().toISOString(),
          account: makeAccount(parsed, i, row.created_at),
          status: null,
        });
      }
    } catch(e){ console.error('follow', e); }

    // 2. Like 알림 / Like Notification
    //  mastodon,gotosocial
    try {
      const likes = db.prepare(`SELECT id, actor, object, username, created_at FROM likes WHERE username =? ORDER BY created_at DESC LIMIT 30`).all(username) as any[];
      console.log(`❤ likes table rows=${likes.length} for ${username}`);
      for (let i=0; i<likes.length; i++) {
        const row = likes[i];
        const actor = row.actor || '';
        const objectId = row.object || '';
        console.log(` like: actor=${actor} object=${objectId}`);

        // 자기 자신 좋아요 제외 / Excludes your own "likes."
        if (actor.includes(myActor) || actor.includes(`/users/${username}`) && actor.includes(DOMAIN)) {
          console.log(` -> self like skip!`);
          continue;
        }

        const parsed = parseActor(actor, i+100);

        // 내 글에 대한 Like만! (object가 내 도메인!) / Only 'Likes' on my posts! (The object is within my domain!)
        // mastodon Like는 object가 내 글이므로 DOMAIN 포함 / mastodon Like includes DOMAIN because the object is my text.
        // object가 mastodon 글인 경우! 내가 Like한 경우는 알림 아니므로 스킵
        // If the object is a Mastodon post! Skip if I liked it, as that doesn't trigger a notification.
        const isMyPost = objectId.includes(DOMAIN) || objectId.includes('aloy-horizon');
        if (!isMyPost) {
          console.log(` -> not my post, skip (outgoing like)`);
          continue;
        }

        // 원본 글 찾기 / Find the original post
        let statusObj: any = null;
        try {
          const shortId = objectId.split('/').pop()?.split('?')[0];
          const post = db.prepare(`SELECT id, content, created_at FROM posts WHERE id =? OR id LIKE? LIMIT 1`).get(objectId, `%${shortId}%`) as any;
          if (post) {
            statusObj = {
              id: post.id,
              uri: objectId,
              url: objectId,
              content: post.content || '<p>내 글</p>',
              created_at: post.created_at? new Date(post.created_at).toISOString() : new Date().toISOString(),
              account: { id: '1', username, acct: `${username}@${DOMAIN}`, display_name: username, avatar: `https://${DOMAIN}/icon.png` },
              visibility: 'public', reblogs_count: 0, favourites_count: 0, replies_count: 0,
            };
          } else {
            statusObj = {
              id: objectId,
              uri: objectId,
              url: objectId,
              content: '<p>내 글에 좋아요 / Like on my post</p>',
              created_at: new Date().toISOString(),
              account: { id: '1', username, acct: `${username}@${DOMAIN}`, display_name: username, avatar: `https://${DOMAIN}/icon.png` },
              visibility: 'public', reblogs_count: 0, favourites_count: 0, replies_count: 0,
            };
          }
        } catch {}

        notifications.push({
          id: `fav_${i}_${row.id}`,
          type: 'favourite',
          created_at: row.created_at? new Date(row.created_at).toISOString() : new Date().toISOString(),
          account: makeAccount(parsed, i+100, row.created_at),
          status: statusObj,
        });
      }
    } catch(e){ console.error('likes notif', e); }

    // 3. Reblog 알림 / Reblog(boost) Notification
    try {
      const boosts = db.prepare(`SELECT id, actor, object, username, created_at FROM announces WHERE username =? ORDER BY created_at DESC LIMIT 20`).all(username) as any[];
      for (let i=0; i<boosts.length; i++) {
        const row = boosts[i];
        const actor = row.actor || '';
        if (actor.includes(myActor)) continue;
        const parsed = parseActor(actor, i+200);
        notifications.push({
          id: `reblog_${i}_${row.id}`,
          type: 'reblog',
          created_at: row.created_at? new Date(row.created_at).toISOString() : new Date().toISOString(),
          account: makeAccount(parsed, i+200, row.created_at),
          status: null,
        });
      }
    } catch(e){}

    notifications.sort((a,b)=> new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    console.log(`🔔 notifications return=${notifications.length} follow=${notifications.filter(n=>n.type==='follow').length} fav=${notifications.filter(n=>n.type==='favourite').length} reblog=${notifications.filter(n=>n.type==='reblog').length}`);

    return NextResponse.json(notifications.slice(0, limit), {
      headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' }
    });
  } catch(e){
    console.error('❌ notifications fatal', e);
    return NextResponse.json([], { headers: { 'Access-Control-Allow-Origin': '*' } });
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