import db from '@/lib/db';
import { sendNote } from '@/lib/ap'; // ✅ myapp32 - 서명 전송 / Signed transmission
import { randomUUID } from 'crypto';

const DOMAIN = process.env.DOMAIN || 'aloy-horizon.duckdns.org';

// - 남이 내글을 보러 올떄 사용 / Used when someone comes to see my post
export async function GET(_req: Request, { params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;

  try {
    // ✅ myap32 - username 필터 추가 / Added username filter
    const posts = db.prepare('SELECT * FROM posts WHERE username = ? ORDER BY created_at DESC LIMIT 20').all(username) as any[];
    
    return new Response(JSON.stringify({
      '@context': 'https://www.w3.org/ns/activitystreams',
      id: `https://${DOMAIN}/users/${username}/outbox`,
      type: 'OrderedCollection',
      totalItems: posts.length,
      orderedItems: posts.map(p => ({
        id: `https://${DOMAIN}/users/${username}/statuses/${p.id}`,
        type: 'Create',
        actor: `https://${DOMAIN}/users/${username}`,
        published: new Date(p.created_at).toISOString(),
        object: {
          id: `https://${DOMAIN}/users/${username}/statuses/${p.id}`,
          type: 'Note',
          attributedTo: `https://${DOMAIN}/users/${username}`,
          content: p.content,
          published: new Date(p.created_at).toISOString(),
          to: ['https://www.w3.org/ns/activitystreams#Public'],
          cc: [`https://${DOMAIN}/users/${username}/followers`]
        }
      }))
    }), { 
      headers: { 'Content-Type': 'application/activity+json; charset=utf-8' } 
    });

  } catch (e) {
    console.error('outbox 에러 / outbox error:', e);
    return new Response(JSON.stringify({
      '@context': 'https://www.w3.org/ns/activitystreams',
      id: `https://${DOMAIN}/users/${username}/outbox`,
      type: 'OrderedCollection',
      totalItems: 0,
      orderedItems: []
    }), { headers: { 'Content-Type': 'application/activity+json' } });
  }
}

// ✅ myapp32 - POST 추가! (Outbox 서명!) / Added POST! (Outbox signing!)
// - 내가 글을 쓸때 사용 / Used when I write a post

// ✅ POST 추가! Pinafore가 여기로 글 씀! / Added POST! Pinafore writes here!
export async function POST(req: Request, { params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  try {
    const body = await req.json();
    const content = body.object?.content || body.content || '';
    if (!content) return new Response(JSON.stringify({ error: 'content 없음' }), { status: 400 });

    const id = randomUUID();
    db.prepare('INSERT INTO posts (id, content, username) VALUES (?,?,?)').run(id, content, username);

    const noteId = `https://${DOMAIN}/users/${username}/posts/${id}`;
    const note = {
      id: noteId,
      type: 'Note',
      attributedTo: `https://${DOMAIN}/users/${username}`,
      content: content,
      published: new Date().toISOString(),
      to: ['https://www.w3.org/ns/activitystreams#Public'],
      cc: [`https://${DOMAIN}/users/${username}/followers`]
    };

    // ✅ api/posts와 동일 로직! 서명 전송! / Same logic as api/posts! Signed transmission!
    const followers = db.prepare('SELECT * FROM followers WHERE username = ?').all(username) as any[];
    await Promise.allSettled(
      followers.map(async (f) => {
        try {
          await sendNote(f.inbox, note, username, id, content);
        } catch (e) {
          console.error(`❌ -> ${f.actor}`, e);
        }
      })
    );

    const activity = {
      "@context": "https://www.w3.org/ns/activitystreams",
      id: `${noteId}#activity`,
      type: 'Create',
      actor: `https://${DOMAIN}/users/${username}`,
      object: note
    };

    return new Response(JSON.stringify(activity), {
      status: 201,
      headers: { 'Content-Type': 'application/activity+json' }
    });

  } catch (e) {
    console.error('outbox POST 에러:', e);
    return new Response(JSON.stringify({ error: String(e) }), { status: 500 });
  }
}