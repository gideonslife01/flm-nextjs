// app/api/v1/instance/route.ts - ✅ myapp33-1 - Pinafore용!
import { NextResponse } from 'next/server';

const DOMAIN = process.env.DOMAIN || 'aloy-horizon.duckdns.org';

export async function GET() {
  return NextResponse.json({
    uri: DOMAIN,
    title: 'Aloy Horizon',
    short_description: 'My ActivityPub server!',
    description: 'My own Fediverse server running Next.js',
    email: 'admin@aloy-horizon.duckdns.org',
    version: '4.3.0 (compatible; Aloy Horizon 1.0)', // ✅ Pinafore가 Mastodon으로 인식 / Pinafore recognized as Mastodon
    urls: {
      streaming_api: `wss://${DOMAIN}`
    },
    stats: {
      user_count: 1,
      status_count: 100,
      domain_count: 1000
    },
    thumbnail: `https://${DOMAIN}/icon.png`,
    languages: ['en', 'ko'],
    registrations: true,
    approval_required: false,
    invites_enabled: false,
    configuration: {
      statuses: {
        max_characters: 500,
        max_media_attachments: 4
      }
    },
    rules: []
  });
}

// CORS 에러 방지용 OPTIONS 처리 / Handle OPTIONS to prevent CORS errors
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}