// ✅ myapp30 - lib/ap.ts (Refactored)
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

const DOMAIN = process.env.DOMAIN || 'aloy-horizon.duckdns.org';

// ✅ myapp30 - 사용자별 개인키 가져오기 / Get user-specific private key
// data/keys/user1/private.pem 형태 지원 / Supports data/keys/user1/private.pem format
// 레거시 경로도 지원 / Also supports legacy path
function getPrivateKey(username: string): string {
  // data/keys/user1/private.pem 형태 지원
  const userKeyPath = path.join(process.cwd(), `data/keys/${username}/private.pem`);
  const legacyKeyPath = path.join(process.cwd(), 'data/keys/private.pem');
  
  try {
    if (fs.existsSync(userKeyPath)) {
      return fs.readFileSync(userKeyPath, 'utf8');
    }
    // user1이면 legacy 경로도 확인 / Check legacy path if username is user1
    if (fs.existsSync(legacyKeyPath)) {
      return fs.readFileSync(legacyKeyPath, 'utf8');
    }
    // data/keys/ 디렉토리에서 직접 / Check directly in data/keys/ directory
    const directPath = path.join(process.cwd(), `data/keys/${username}.pem`);
    if (fs.existsSync(directPath)) {
      return fs.readFileSync(directPath, 'utf8');
    }
  } catch (e) {
    console.error(`🔑 키 로드 실패 ${username}:`, e);
  }
  throw new Error(`Private key not found for ${username}`);
}

// ✅ 공용 - 서명 + 전송 / Shared Use - Sign and send
async function signAndSend(inbox: string, doc: any, username: string) {
  const actorId = `https://${DOMAIN}/users/${username}`;
  const privateKey = getPrivateKey(username);
  const body = JSON.stringify(doc);
  const url = new URL(inbox);
  
  const digest = `SHA-256=${crypto.createHash('sha256').update(body).digest('base64')}`;
  const date = new Date().toUTCString();
  const signingString = `(request-target): post ${url.pathname}\nhost: ${url.host}\ndate: ${date}\ndigest: ${digest}`;
  
  const signer = crypto.createSign('sha256');
  signer.update(signingString);
  const signature = signer.sign(privateKey, 'base64');

  const keyId = `${actorId}#main-key`;
  const sigHeader = `keyId="${keyId}",headers="(request-target) host date digest",signature="${signature}"`;

  const res = await fetch(inbox, {
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
  return { res, text, body, doc };
}

// ✅ 공용 / Shared Use - Signed GET 
export async function signedFetch(urlStr: string, username: string) {
  const actorId = `https://${DOMAIN}/users/${username}`;
  const privateKey = getPrivateKey(username);
  const url = new URL(urlStr);
  const date = new Date().toUTCString();
  const signingString = `(request-target): get ${url.pathname}${url.search}\nhost: ${url.host}\ndate: ${date}`;
  
  const signer = crypto.createSign('sha256');
  signer.update(signingString);
  const signature = signer.sign(privateKey, 'base64');

  const keyId = `${actorId}#main-key`;
  const sigHeader = `keyId="${keyId}",headers="(request-target) host date",signature="${signature}"`;

  console.log(`🔐 Signed GET -> ${urlStr} as ${username}`);

  return fetch(urlStr, {
    headers: {
      'Accept': 'application/activity+json',
      'Date': date,
      'Signature': sigHeader,
      'Host': url.host
    }
  });
}

export async function getActorData(actorUrl: string, username: string) {
  const res = await signedFetch(actorUrl, username);
  if (!res.ok) throw new Error(`getActorData failed: ${res.status} ${await res.text()}`);
  const data = await res.json();
  return { id: data.id, inbox: data.inbox, data };
}

// --- Activity Senders ---

export async function sendAccept(toInbox: string, followActivity: any, username: string) {
  const actorId = `https://${DOMAIN}/users/${username}`;
  const doc = {
    '@context': 'https://www.w3.org/ns/activitystreams',
    id: `${actorId}#accepts/${Date.now()}`,
    type: 'Accept',
    actor: actorId,
    object: followActivity
  };
  console.log(`🚀 [${username}] Accept -> ${toInbox}`);
  const { res, text } = await signAndSend(toInbox, doc, username);
  console.log(`📬 Accept: ${res.status}`, text);
  return res.ok;
}

export async function sendNote(toInbox: string, note: any, username: string, postId: string, content: string) {
  const actorId = `https://${DOMAIN}/users/${username}`;
  const doc = {
    '@context': 'https://www.w3.org/ns/activitystreams',
    id: `${actorId}/posts/${postId}#create`,
    type: 'Create',
    actor: actorId,
    published: new Date().toISOString(),
    to: ['https://www.w3.org/ns/activitystreams#Public'],
    cc: [`${actorId}/followers`],
    object: note
  };
  console.log(`📝 [${username}] Note -> ${toInbox} : ${content.slice(0,20)}`);
  const { res, text } = await signAndSend(toInbox, doc, username);
  console.log(`📬 Note: ${res.status}`, text);
  return res.ok;
}

export async function sendFollow(toInbox: string, targetActor: string, username: string) {
  const actorId = `https://${DOMAIN}/users/${username}`;
  const doc = {
    '@context': 'https://www.w3.org/ns/activitystreams',
    id: `${actorId}/follows/${crypto.randomUUID()}`,
    type: 'Follow',
    actor: actorId,
    object: targetActor
  };
  console.log(`➡ [${username}] Follow -> ${toInbox} (${targetActor})`);
  const { res, text } = await signAndSend(toInbox, doc, username);
  console.log(`📬 Follow: ${res.status}`, text);
  return { ok: res.ok, status: res.status, text, followDoc: doc };
}

export async function sendUndoFollow(targetActor: string, username: string) {
  const actorId = `https://${DOMAIN}/users/${username}`;
  let followId = `${actorId}/follows/${targetActor}`;
  try {
    const db = (await import('@/lib/db')).default;
    const row = db.prepare('SELECT id FROM following WHERE actor = ? AND username = ?').get(targetActor, username) as any;
    if (row?.id) followId = row.id;
  } catch {}

  const { inbox } = await getActorData(targetActor, username);
  const doc = {
    '@context': 'https://www.w3.org/ns/activitystreams',
    id: `${actorId}#undo/${Date.now()}`,
    type: 'Undo',
    actor: actorId,
    object: { id: followId, type: 'Follow', actor: actorId, object: targetActor }
  };
  console.log(`↩ [${username}] Undo Follow -> ${inbox}`);
  const { res, text } = await signAndSend(inbox, doc, username);
  console.log(`📬 Undo Follow: ${res.status}`, text);
  return { ok: res.ok, status: res.status, text, undoDoc: doc };
}

export async function sendLike(toInbox: string, targetPostId: string, username: string) {
  const actorId = `https://${DOMAIN}/users/${username}`;
  const doc = {
    '@context': 'https://www.w3.org/ns/activitystreams',
    id: `${actorId}/likes/${crypto.randomUUID()}`,
    type: 'Like',
    actor: actorId,
    object: targetPostId
  };
  console.log(`❤ [${username}] Like -> ${toInbox}`);
  const { res, text } = await signAndSend(toInbox, doc, username);
  console.log(`📬 Like: ${res.status}`, text);
  return { ok: res.ok, status: res.status, text, likeDoc: doc };
}

export async function sendUndoLike(toInbox: string, likeId: string, targetPostId: string, username: string) {
  const actorId = `https://${DOMAIN}/users/${username}`;
  const doc = {
    '@context': 'https://www.w3.org/ns/activitystreams',
    id: `${actorId}#undo/${crypto.randomUUID()}`,
    type: 'Undo',
    actor: actorId,
    object: { id: likeId, type: 'Like', actor: actorId, object: targetPostId }
  };
  console.log(`💔 [${username}] Undo Like -> ${toInbox}`);
  const { res, text } = await signAndSend(toInbox, doc, username);
  console.log(`📬 Undo Like: ${res.status}`, text);
  return { ok: res.ok, status: res.status, text, undoDoc: doc };
}

export async function sendAnnounce(toInbox: string, targetPostId: string, username: string) {
  const actorId = `https://${DOMAIN}/users/${username}`;
  const doc = {
    '@context': 'https://www.w3.org/ns/activitystreams',
    id: `${actorId}/announces/${crypto.randomUUID()}`,
    type: 'Announce',
    actor: actorId,
    object: targetPostId,
    published: new Date().toISOString(),
    to: ['https://www.w3.org/ns/activitystreams#Public'],
    cc: [`${actorId}/followers`, actorId],
  };
  console.log(`🔁 [${username}] Announce -> ${toInbox}`);
  const { res, text } = await signAndSend(toInbox, doc, username);
  console.log(`📬 Announce: ${res.status}`, text);
  return { ok: res.ok, status: res.status, text, announceDoc: doc };
}

export async function sendUndoAnnounce(toInbox: string, announceId: string, targetPostId: string, username: string) {
  const actorId = `https://${DOMAIN}/users/${username}`;
  const doc = {
    '@context': 'https://www.w3.org/ns/activitystreams',
    id: `${actorId}#undo/${crypto.randomUUID()}`,
    type: 'Undo',
    actor: actorId,
    published: new Date().toISOString(),
    to: ['https://www.w3.org/ns/activitystreams#Public'],
    cc: [`${actorId}/followers`],
    object: {
      id: announceId,
      type: 'Announce',
      actor: actorId,
      object: targetPostId,
      to: ['https://www.w3.org/ns/activitystreams#Public'],
      cc: [`${actorId}/followers`],
    }
  };
  console.log(`↩ [${username}] Undo Announce -> ${toInbox}`);
  const { res, text } = await signAndSend(toInbox, doc, username);
  console.log(`📬 Undo Announce: ${res.status}`, text);
  return { ok: res.ok, status: res.status, text, undoDoc: doc };
}

// ✅ myapp30 - Delete 전송 (새로 추가!) / Send Delete (Newly Added!)
export async function sendDelete(toInbox: string, postId: string, username: string) {
  const actorId = `https://${DOMAIN}/users/${username}`;

  // postId가 이미 전체 URL이면 그대로, UUID면 만들어주기 
  // If postId is already a full URL, use it; if it's a UUID, construct it! 
  const objectId = postId.startsWith('http') 
    ? postId 
    : `${actorId}/statuses/${postId}`; 

  const doc = {
    '@context': 'https://www.w3.org/ns/activitystreams',
    id: `${actorId}#delete/${crypto.randomUUID()}`,
    type: 'Delete',
    actor: actorId,
    object: objectId,
    published: new Date().toISOString(),
    to: ['https://www.w3.org/ns/activitystreams#Public']
  };
  console.log(`🗑 [${username}] Delete -> ${toInbox} (${postId})`);
  const { res, text } = await signAndSend(toInbox, doc, username);
  console.log(`📬 Delete: ${res.status}`, text);
  return { ok: res.ok, status: res.status, text, deleteDoc: doc };
}