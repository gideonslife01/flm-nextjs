// ✅ myapp31 - lib/ap.ts (Refactored)
import db from '@/lib/db';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

const DOMAIN = process.env.DOMAIN || 'aloy-horizon.duckdns.org';

// ---- 공용함수 / Common function ----

// ✅ myapp32 - 공개키 캐싱 / Public key caching
const publicKeyCache = new Map<string, { key: string, cachedAt: number }>();
const CACHE_TTL = 1000 * 60 * 60 * 1; // 1시간! (빠르면서 최신!) / 1 hour! (fast and up-to-date!)

// ✅ myapp31 - 사용자별 개인키 가져오기 / Get user-specific private key
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
    console.error(`🔑 키 로드 실패 / Key load failed for ${username}:`, e);
  }
  throw new Error(`Private key not found for ${username}`);
}
// ✅ myapp31 - 사용자별 공개키 가져오기 / Get user-specific public key
function getPublicKey(username: string): string {
  const userKeyPath = path.join(process.cwd(), `data/keys/${username}/public.pem`);
  const legacyKeyPath = path.join(process.cwd(), 'data/keys/public.pem');
  const directPath = path.join(process.cwd(), `data/keys/${username}.pub.pem`);
  
  try {
    if (fs.existsSync(userKeyPath)) {
      return fs.readFileSync(userKeyPath, 'utf8');
    }
    if (fs.existsSync(legacyKeyPath)) {
      return fs.readFileSync(legacyKeyPath, 'utf8');
    }
    if (fs.existsSync(directPath)) {
      return fs.readFileSync(directPath, 'utf8');
    }
    // DB에서 fallback! / Fallback from DB!
    const user = db.prepare('SELECT public_key FROM users WHERE username = ?').get(username) as any;
    if (user?.public_key) return user.public_key;
  } catch (e) {
    console.error(`🔑 public 키 로드 실패 / Public key load failed for ${username}:`, e);
  }
  throw new Error(`Public key not found for ${username}`);
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

// ✅ 공용 - Actor 데이터 가져오기 / Shared Use - Get Actor Data
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
// singnAndSend 포함 / Includes signAndSend
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

// ---- Public Key Fetching and Caching ----

// ✅ myapp31 - HttpSignature 검증 / Verify HttpSignature
// - HTTP Signature 검증! / Verify HTTP Signature!
export async function verifyHttpSignature(
  req: Request,
  publicKeyPem: string
): Promise<boolean> {
  try {
    // - privatekey로 서명된 signature 검증! / Verify signature signed with private key
    const signatureHeader = req.headers.get('signature');
    if (!signatureHeader) {
      console.error('❌ Signature 헤더 없음! / Signature header not found!');
      return false;
    }

    // - Signature 헤더 파싱! / Parse Signature header
    const sigData: any = {};
    signatureHeader.split(',').forEach(pair => {
      const match = pair.match(/(\w+)="([^"]+)"/);
      if (match) sigData[match[1]] = match[2];
    });
    /*
    example sigData:

    sigData = {
      keyId: "https://mastodon.social/users/usersidk#main-key",
      headers: "(request-target) host date digest",
      signature: "abc123base64=="
   }
    */

    const { keyId, headers, signature } = sigData;
    if (!keyId ||!headers ||!signature) {
      console.error('❌ Signature 헤더 파싱 실패! / Failed to parse signature header!', sigData);
      return false;
    }

    // - signingString 재구성! / Reconstruct signingString
    const url = new URL(req.url);
    const method = req.method.toLowerCase();

    let body = '';
    if (method === 'post') {
      body = await req.clone().text();
    }

    const headersList = headers.split(' ');
    const parts: string[] = [];

    for (const h of headersList) {
      if (h === '(request-target)') {
        parts.push(`(request-target): ${method} ${url.pathname}${url.search}`);
      } else if (h === 'host') {
        parts.push(`host: ${req.headers.get('host') || url.host}`);
      } else if (h === 'date') {
        parts.push(`date: ${req.headers.get('date')}`);
      } else if (h === 'digest' && body) {
        const digest = req.headers.get('digest');
        if (digest) parts.push(`digest: ${digest}`);
      } else {
        const val = req.headers.get(h);
        if (val) parts.push(`${h}: ${val}`);
      }
    }

    const signingString = parts.join('\n');
    console.log('🔍 검증 signingString / verification signingString:', signingString);

    // - 공개키로 검증! / Verify with public key
    const verifier = crypto.createVerify('sha256');
    verifier.update(signingString);
    const isValid = verifier.verify(publicKeyPem, signature, 'base64');

    console.log(isValid? '✅ 서명 검증 성공! / Signature verification successful!' : '❌ 서명 검증 실패! / Signature verification failed!');
    return isValid;
  } catch (e) {
    console.error('❌ 검증 중 에러:', e);
    return false;
  }
}

// ✅ myapp31 - Actor 가져와서 publicKey 얻기! / Get Actor and retrieve publicKey!
export async function fetchActorPublicKey(actorUrl: string, username: string): Promise<string> {
  
  // - username이 undefined이면 기본 user1 사용! / If username is undefined, use default user1
  if (!username) {
    console.error('❌ fetchActorPublicKey: username이 undefined! 기본 user1 사용! / username is undefined! Using default user1!');
    username = 'user1'; // fallback!
  }
  console.log(`🔑 Actor publicKey 가져오기 / Get Actor publickey: ${actorUrl} as ${username}`);
  
  try {
    // - Signed GET 시도! (마스토돈 필수) / Try Signed GET! (Mastodon required)
    const res = await signedFetch(actorUrl, username);
    if (!res.ok) throw new Error(`Signed fetch 실패: ${res.status} ${await res.text()}`);
    const actor = await res.json();
    const publicKeyPem = actor.publicKey?.publicKeyPem || actor.publicKey;
    if (publicKeyPem) return publicKeyPem;
  } catch (e) {
    console.log('⚠️ Signed fetch 실패! Plain fetch 시도!', e);
  }

  // - Plain fetch fallback! 
  const res = await fetch(actorUrl, {
    headers: { 
      'Accept': 'application/activity+json, application/ld+json',
      'User-Agent': 'MyApp/1.0'
    }
  });
  if (!res.ok) throw new Error(`Actor fetch 실패: ${res.status} ${await res.text()}`);
  const actor = await res.json();
  const publicKeyPem = actor.publicKey?.publicKeyPem || actor.publicKey;
  if (!publicKeyPem) throw new Error(`publicKey 없음!`);
  return publicKeyPem;
}

// ✅ myapp32 - publicKey 캐싱 + 재시도! / publicKey caching + retry!
// const publicKeyCache = new Map<string, { key: string, cachedAt: number }>();
// const CACHE_TTL = 1000 * 60 * 60 * 1; // 1시간! (빠르면서 최신!) --> 파일 상단

// - 캐시된 publicKey 가져오기 / Get cached publicKey
export async function fetchActorPublicKeyCached(actorUrl: string, username: string): Promise<string> {
  const cached = publicKeyCache.get(actorUrl);

  // - 캐시 유효기간 확인 / Check cache validity
  if (cached && Date.now() - cached.cachedAt < CACHE_TTL) {
    console.log(`⚡ 캐시 히트! ${actorUrl}`);
    return cached.key;
  }

  // - 캐시 없거나 만료 / No cache or expired
  console.log(`🔑 캐시 없음! / No cache, Fetch! ${actorUrl}`);
  const key = await fetchActorPublicKey(actorUrl, username);
  publicKeyCache.set(actorUrl, { key, cachedAt: Date.now() });
  return key;
}

// ✅ myapp32 - publicKey 캐싱 + 재시도! / publicKey caching + retry!
export async function fetchActorPublicKeyWithRetry(
  actorUrl: string, 
  username: string, 
  verifyReq: Request
): Promise<{ publicKey: string, isValid: boolean }> {

  // - 캐시로 먼저 검증! / First, verify with cache!
  let publicKey = await fetchActorPublicKeyCached(actorUrl, username);
  let isValid = await verifyHttpSignature(verifyReq, publicKey);

  if (!isValid) {
    console.log(`⚠️ 캐시 키 검증 실패! / Cache validation failed!, Fresh fetch! ${actorUrl}`);

    // - 실패하면 캐시 버리고 fresh! / If failed, discard cache and fetch fresh!
    publicKeyCache.delete(actorUrl);
    publicKey = await fetchActorPublicKey(actorUrl, username);
    isValid = await verifyHttpSignature(verifyReq, publicKey);

    // - 새 키 캐시! / Cache the new key!
    if (isValid) {
      publicKeyCache.set(actorUrl, { key: publicKey, cachedAt: Date.now() });
    }
  }

  return { publicKey, isValid };
}