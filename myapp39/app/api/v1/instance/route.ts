// ✅ myapp39 - app/api/v1/instance/route.ts - middleware가! CORS 처리!하니까! 깔끔!
import { NextResponse } from 'next/server';

const DOMAIN = process.env.DOMAIN || 'aloy-horizon.duckdns.org';

export async function GET() {
  return NextResponse.json({
    uri: `https://${DOMAIN}`, 
    title: 'Aloy Horizon',
    short_description: 'My ActivityPub server!',
    description: 'My own Fediverse server running Next.js',
    email: 'admin@aloy-horizon.duckdns.org',
    version: '4.3.0 (compatible; Aloy Horizon 1.0)',
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
// OPTIONS함수 제거 middleware.ts에서 처리
// Remove OPTIONS function, handle in middleware.ts