import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

// myapp15 ✅
const DOMAIN = process.env.DOMAIN || 'aloy-horizon.duckdns.org'; 
//const DOMAIN = 'aloy-horizon.duckdns.org';
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

// myapp14 ✅
// myapp14 - Follow 보내기! / Send Follow
export async function sendFollow(toInbox: string, targetActor: string, username: string) {
  const actorId = `https://${DOMAIN}/users/${username}`;
  const followId = `${actorId}/follows/${Date.now()}`;
  
  const followDoc = {
    '@context': 'https://www.w3.org/ns/activitystreams',
    id: followId,
    type: 'Follow',
    actor: actorId,
    object: targetActor
  };

  const body = JSON.stringify(followDoc);
  const url = new URL(toInbox);
  
  const digest = `SHA-256=${crypto.createHash('sha256').update(body).digest('base64')}`;
  const date = new Date().toUTCString();
  const signingString = `(request-target): post ${url.pathname}\nhost: ${url.host}\ndate: ${date}\ndigest: ${digest}`;
  
  const signer = crypto.createSign('sha256');
  signer.update(signingString);
  const signature = signer.sign(PRIVATE_KEY, 'base64');

  const keyId = `${actorId}#main-key`;
  const sigHeader = `keyId="${keyId}",headers="(request-target) host date digest",signature="${signature}"`;

  console.log(`➡️ [${username}] Follow 전송 / Follow sent -> ${toInbox} (${targetActor})`);

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
  console.log(`📬 Follow 결과 / Follow result: ${res.status}`, text);
  return { ok: res.ok, status: res.status, text, followDoc };
}

// myapp14 ✅ - Signed GET 요청 보내기 / Send Signed GET Request 
export async function signedFetch(urlStr: string, username: string) {
  const actorId = `https://${DOMAIN}/users/${username}`;
  const url = new URL(urlStr);
  const date = new Date().toUTCString();
  const signingString = `(request-target): get ${url.pathname}\nhost: ${url.host}\ndate: ${date}`;
  
  const signer = crypto.createSign('sha256');
  signer.update(signingString);
  const signature = signer.sign(PRIVATE_KEY, 'base64');

  const keyId = `${actorId}#main-key`;
  const sigHeader = `keyId="${keyId}",headers="(request-target) host date",signature="${signature}"`;

  console.log(`🔐 Signed GET -> ${urlStr}`);

  return fetch(urlStr, {
    headers: {
      'Accept': 'application/activity+json',
      'Date': date,
      'Signature': sigHeader,
      'Host': url.host
    }
  });
}

// ✅ myapp17 - Undo Follow
export async function sendUndoFollow(targetActor: string, username: string) {
  const actorId = `https://${DOMAIN}/users/${username}`;

  // let으로 밖에 선언(타입에러 수정) / Declare outside with let (type error fix)
  let followId = `${actorId}/follows/${targetActor}`; 

  try {
    const db = (await import('@/lib/db')).default;
    const row = db.prepare('SELECT id FROM following WHERE actor = ? AND username = ?').get(targetActor, username) as any;
    if (row?.id) {
      followId = row.id;
    }
  } catch {}

  const actorRes = await signedFetch(targetActor, username);
  if (!actorRes.ok) {
    const t = await actorRes.text();
    throw new Error(`대상 조회 실패 ${actorRes.status}: ${t}`);
  }
  const actorData = await actorRes.json();
  const inbox = actorData.inbox;

  const undoId = `${actorId}#undo/${Date.now()}`;
  const undoDoc = {
    '@context': 'https://www.w3.org/ns/activitystreams',
    id: undoId,
    type: 'Undo',
    actor: actorId,
    object: {
      id: followId,
      type: 'Follow',
      actor: actorId,
      object: targetActor
    }
  };

  const body = JSON.stringify(undoDoc);
  const url = new URL(inbox);
  const digest = `SHA-256=${crypto.createHash('sha256').update(body).digest('base64')}`;
  const date = new Date().toUTCString();
  const signingString = `(request-target): post ${url.pathname}\nhost: ${url.host}\ndate: ${date}\ndigest: ${digest}`;
  
  const signer = crypto.createSign('sha256');
  signer.update(signingString);
  const signature = signer.sign(PRIVATE_KEY, 'base64');

  const keyId = `${actorId}#main-key`;
  const sigHeader = `keyId="${keyId}",headers="(request-target) host date digest",signature="${signature}"`;

  console.log(`↩️ [${username}] Undo Follow 전송 -> ${inbox}`);

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
  console.log(`📬 Undo 결과 / Undo result: ${res.status}`, text);
  return { ok: res.ok, status: res.status, text, undoDoc };
}

// ✅ myapp23 - Like 보내기 / Send Like
export async function sendLike(toInbox: string, targetPostId: string, username: string) {
  const actorId = `https://${DOMAIN}/users/${username}`;
  //const likeId = `${actorId}/likes/${Date.now()}`;
    //const likeId = `${actorId}/likes/${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
  const likeId = `${actorId}/likes/${crypto.randomUUID()}`;



  const likeDoc = {
    '@context': 'https://www.w3.org/ns/activitystreams',
    id: likeId,
    type: 'Like',
    actor: actorId,
    object: targetPostId
  };

  const body = JSON.stringify(likeDoc);
  const url = new URL(toInbox);
  const digest = `SHA-256=${crypto.createHash('sha256').update(body).digest('base64')}`;
  const date = new Date().toUTCString();
  const signingString = `(request-target): post ${url.pathname}\nhost: ${url.host}\ndate: ${date}\ndigest: ${digest}`;
  const signer = crypto.createSign('sha256');
  signer.update(signingString);
  const signature = signer.sign(PRIVATE_KEY, 'base64');
  const keyId = `${actorId}#main-key`;
  const sigHeader = `keyId="${keyId}",headers="(request-target) host date digest",signature="${signature}"`;

  console.log(`❤️ [${username}] Like 전송 -> ${toInbox} (${targetPostId})`);

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
  console.log(`📬 Like 결과: ${res.status}`, text);
  return { ok: res.ok, status: res.status, text, likeDoc };
}

// ✅ myapp23 - Undo Like 보내기 / Send Undo Like
export async function sendUndoLike(toInbox: string, likeId: string, targetPostId: string, username: string) {
  const actorId = `https://${DOMAIN}/users/${username}`;
  //const undoId = `${actorId}#undo/${Date.now()}`;
  const undoId = `${actorId}#undo/${crypto.randomUUID()}`;

  const undoDoc = {
    '@context': 'https://www.w3.org/ns/activitystreams',
    id: undoId,
    type: 'Undo',
    actor: actorId,
    object: {
      id: likeId,
      type: 'Like',
      actor: actorId,
      object: targetPostId
    }
  };

  const body = JSON.stringify(undoDoc);
  const url = new URL(toInbox);
  const digest = `SHA-256=${crypto.createHash('sha256').update(body).digest('base64')}`;
  const date = new Date().toUTCString();
  const signingString = `(request-target): post ${url.pathname}\nhost: ${url.host}\ndate: ${date}\ndigest: ${digest}`;
  const signer = crypto.createSign('sha256');
  signer.update(signingString);
  const signature = signer.sign(PRIVATE_KEY, 'base64');
  const keyId = `${actorId}#main-key`;
  const sigHeader = `keyId="${keyId}",headers="(request-target) host date digest",signature="${signature}"`;

  console.log(`💔 [${username}] Undo Like 전송 -> ${toInbox}`);

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
  console.log(`📬 Undo Like 결과: ${res.status}`, text);
  return { ok: res.ok, status: res.status, text, undoDoc };
}

// ✅ myapp23 - Actor 데이터 가져오기 (inbox/route, like/route 공용)
export async function getActorData(actorUrl: string, username: string) {
  const res = await signedFetch(actorUrl, username);
  if (!res.ok) throw new Error(`getActorData failed: ${res.status} ${await res.text()}`);
  const data = await res.json();
  return {
    id: data.id,
    inbox: data.inbox
  };
}