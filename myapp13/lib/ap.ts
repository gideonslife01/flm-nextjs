import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

const DOMAIN = 'yourhost.domain.org';
const KEY_PATH = path.join(process.cwd(), 'data/keys/private.pem');
const PRIVATE_KEY = fs.readFileSync(KEY_PATH, 'utf8');

export async function sendAccept(toInbox: string, followActivity: any, username: string) {
  const actorId = `https://${DOMAIN}/users/${username}`;
  const acceptId = `${actorId}#accepts/${Date.now()}`;
  
  const acceptDoc = {
    '@context': 'https://www.w3.org/ns/activitystreams',
    id: acceptId,
    type: 'Accept',
    actor: actorId,
    object: followActivity
  };

  const body = JSON.stringify(acceptDoc);
  const url = new URL(toInbox);
  
  const digest = `SHA-256=${crypto.createHash('sha256').update(body).digest('base64')}`;
  const date = new Date().toUTCString();
  const signingString = `(request-target): post ${url.pathname}\nhost: ${url.host}\ndate: ${date}\ndigest: ${digest}`;
  
  const signer = crypto.createSign('sha256');
  signer.update(signingString);
  const signature = signer.sign(PRIVATE_KEY, 'base64');

  const keyId = `${actorId}#main-key`;
  const sigHeader = `keyId="${keyId}",headers="(request-target) host date digest",signature="${signature}"`;

  console.log(`🚀 [${username}] Accept 전송 -> ${toInbox}`);

  const res = await fetch(toInbox, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/activity+json',
      'Date': date,
      'Digest': digest,
      'Signature': sigHeader,
      'Host': url.host
    },
    body
  });

  const text = await res.text();
  console.log(`📬 Accept 결과 / Accept result: ${res.status}`, text);
  return res.ok;
}

// myapp13 ✅

export async function sendNote(toInbox: string, note: any, username: string, postId: string, content: string) {
  const actorId = `https://${DOMAIN}/users/${username}`;
  
  const createDoc = {
    '@context': 'https://www.w3.org/ns/activitystreams',
    id: `${actorId}/posts/${postId}#create`,
    type: 'Create',
    actor: actorId,
    object: note
  };

  const body = JSON.stringify(createDoc);
  const url = new URL(toInbox);
  
  const digest = `SHA-256=${crypto.createHash('sha256').update(body).digest('base64')}`;
  const date = new Date().toUTCString();
  const signingString = `(request-target): post ${url.pathname}\nhost: ${url.host}\ndate: ${date}\ndigest: ${digest}`;
  
  const signer = crypto.createSign('sha256');
  signer.update(signingString);
  const signature = signer.sign(PRIVATE_KEY, 'base64');

  const keyId = `${actorId}#main-key`;
  const sigHeader = `keyId="${keyId}",headers="(request-target) host date digest",signature="${signature}"`;

  console.log(`📝 [${username}] Note 전송 / Note sent -> ${toInbox} : ${content.slice(0,20)}`);

  const res = await fetch(toInbox, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/activity+json',
      'Date': date,
      'Digest': digest,
      'Signature': sigHeader,
      'Host': url.host
    },
    body
  });

  const text = await res.text();
  console.log(`📬 Note 결과 / Note result: ${res.status}`, text);
  return res.ok;
}