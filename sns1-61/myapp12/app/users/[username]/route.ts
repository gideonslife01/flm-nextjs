import fs from 'fs';
import path from 'path';

export async function GET(_req: Request, { params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const domain = 'aloy-horizon.duckdns.org';
  const pubkey = fs.readFileSync(path.join(process.cwd(), 'data/keys/public.pem'), 'utf8');
  
  return Response.json({
    '@context': ['https://www.w3.org/ns/activitystreams', 'https://w3id.org/security/v1'],
    id: `https://${domain}/users/${username}`,
    type: 'Person',
    preferredUsername: username,
    inbox: `https://${domain}/users/${username}/inbox`,
    outbox: `https://${domain}/users/${username}/outbox`,
    publicKey: {
      id: `https://${domain}/users/${username}#main-key`,
      owner: `https://${domain}/users/${username}`,
      publicKeyPem: pubkey
    }
  }, { headers: { 'Content-Type': 'application/activity+json' } });
}
