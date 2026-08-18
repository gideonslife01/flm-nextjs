export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const resource = searchParams.get('resource'); // acct:user1@aloy-horizon.duckdns.org
  if (!resource?.includes('user1')) return new Response('not found', { status: 404 });

  const domain = 'aloy-horizon.duckdns.org';
  return Response.json({
    subject: `acct:user1@${domain}`,
    links: [{
      rel: 'self',
      type: 'application/activity+json',
      href: `https://${domain}/users/user1`
    }]
  });
}
