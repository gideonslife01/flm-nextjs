import fs from 'fs';
export async function GET(req: Request, { params }: { params: { username: string } }) {
  const domain = 'aloy-horizon.duckdns.org';
  const pubkey = fs.readFileSync('data/keys/public.pem', 'utf8');
  
  return Response.json({
    '@context': ['https://www.w3.org/ns/activitystreams', 'https://w3id.org/security/v1'],
    id: `https://${domain}/users/${params.username}`,
    type: 'Person',
    preferredUsername: params.username,
    inbox: `https://${domain}/users/${params.username}/inbox`,
    outbox: `https://${domain}/users/${params.username}/outbox`,
    publicKey: {
      id: `https://${domain}/users/${params.username}#main-key`,
      owner: `https://${domain}/users/${params.username}`,
      publicKeyPem: pubkey
    }
  }, { headers: { 'Content-Type': 'application/activity+json' } });
}
