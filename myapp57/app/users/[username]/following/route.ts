import db from '@/lib/db';

export async function GET(
  req: Request, 
  { params }: { params: Promise<{ username: string }> }
) {
  const { username } = await params; // ← await 해야함 / must await
  const DOMAIN = process.env.DOMAIN || 'aloy-horizon.duckdns.org';

  let following: any[] = [];
  try {
    following = db.prepare('SELECT actor FROM following WHERE username = ?').all(username) as any[];
  } catch (e) {
    console.log('following 테이블 없음 또는 에러 / Following table not found or error:', e);
  }

  return Response.json({
    "@context": "https://www.w3.org/ns/activitystreams",
    "id": `https://${DOMAIN}/users/${username}/following`,
    "type": "OrderedCollection",
    "totalItems": following.length,
    "orderedItems": following.map((f: any) => f.actor)
  }, {
    headers: {
      'Content-Type': 'application/activity+json; charset=utf-8',
      'Access-Control-Allow-Origin': '*'
    }
  });
}