import db from '@/lib/db';

export async function GET(_req: Request, { params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const DOMAIN = process.env.DOMAIN || 'aloy-horizon.duckdns.org';

  try {
    // author 컬럼 없으니까 일단 전체에서 최신 20개 / Since there's no author column, just get the latest 20 from all posts
    const posts = db.prepare('SELECT * FROM posts ORDER BY created_at DESC LIMIT 20').all() as any[];
    
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