import db from '@/lib/db';
export async function GET() {
  const posts = db.prepare('SELECT * FROM posts ORDER BY created_at DESC').all() as any[];
  const domain = 'aloy-horizon.duckdns.org';
  return Response.json({
    '@context': 'https://www.w3.org/ns/activitystreams',
    id: `https://${domain}/users/user1/outbox`,
    type: 'OrderedCollection',
    orderedItems: posts.map(p => ({
      id: `https://${domain}/users/user1/statuses/${p.id}`,
      type: 'Create',
      actor: `https://${domain}/users/user1`,
      object: {
        id: `https://${domain}/users/user1/statuses/${p.id}`,
        type: 'Note',
        content: p.content,
        published: p.created_at
      }
    }))
  }, { headers: { 'Content-Type': 'application/activity+json' } });
}
