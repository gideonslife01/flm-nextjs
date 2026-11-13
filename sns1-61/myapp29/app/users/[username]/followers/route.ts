import { NextResponse } from 'next/server';
import db from '@/lib/db';

const DOMAIN = process.env.DOMAIN || 'aloy-horizon.duckdns.org'; 

export async function GET(req: Request, { params }: { params: { username: string }}) {
  const { username } = await params;
  
  try {
    const followers = db.prepare(
      "SELECT actor FROM followers WHERE username = ?"
    ).all(username) as any[];

    const items = followers.map((f: any) => f.actor);

    return NextResponse.json({
      "@context": "https://www.w3.org/ns/activitystreams",
      "id": `https://${DOMAIN}/users/${username}/followers`,
      "type": "OrderedCollection",
      "totalItems": items.length,
      "orderedItems": items,
      "first": {
        "id": `https://${DOMAIN}/users/${username}/followers?page=1`,
        "type": "OrderedCollectionPage",
        "totalItems": items.length,
        "orderedItems": items
      }
    }, {
      headers: { "Content-Type": "application/activity+json" }
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}