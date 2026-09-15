// ✅ myapp40 - lib/auth.ts
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import db from './db';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { NextRequest } from 'next/server';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';
const DOMAIN = process.env.DOMAIN || 'aloy-horizon.duckdns.org';

export async function hashPassword(password: string) {
  return await bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string) {
  return await bcrypt.compare(password, hash);
}

// ✅ myapp40 - 15분짜리 Access Token / 15-minute access token
export function createAccessToken(username: string) {
  return jwt.sign({ username, type: 'access' }, JWT_SECRET, { expiresIn: '15m' });
}

// ✅ myapp40 - 7일짜리 Refresh Token (랜덤 문자열 + DB 저장용)
// 7-day Refresh Token (random string + for DB storage)
export function createRefreshToken() {
  return crypto.randomBytes(64).toString('hex'); // 128글자 랜덤 / 128-character random string
}

// - 기존 호환용 (Pinafore OAuth는 아직 7일짜리 써도 됨)
export function createToken(username: string) {
  return jwt.sign({ username }, JWT_SECRET, { expiresIn: '7d' });
}

export function verifyToken(token: string) {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    console.log('🔍 decoded:', decoded); 
    return decoded;
  } catch (e) {
    return null;
  }
}

export function getUser(username: string) {
  return db.prepare('SELECT * FROM users WHERE username =?').get(username) as any;
}

export function getUserByEmail(email: string) {
  return db.prepare('SELECT * FROM users WHERE email =?').get(email) as any;
}

export function createUser(username: string, email: string, passwordHash: string, displayName: string = '') {
  const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
  });

  const userKeyDir = path.join(process.cwd(), `data/keys/${username}`);
  if (!fs.existsSync(userKeyDir)) fs.mkdirSync(userKeyDir, { recursive: true });

  fs.writeFileSync(path.join(userKeyDir, 'private.pem'), privateKey);
  fs.writeFileSync(path.join(userKeyDir, 'public.pem'), publicKey);
  console.log(`✅ 키 파일 저장: data/keys/${username}/`);

  return db.prepare(`
    INSERT INTO users (username, display_name, summary, private_key, public_key, email, password_hash, email_verified, created_at)
    VALUES (?,?, '',?,?,?,?, 1, CURRENT_TIMESTAMP)
  `).run(username, displayName || username, privateKey, publicKey, email, passwordHash);
}

export function migrateKeysToFiles() {
  const users = db.prepare('SELECT username, private_key, public_key FROM users').all() as any[];
  for (const u of users) {
    if (!u.private_key) continue;
    const dir = path.join(process.cwd(), `data/keys/${u.username}`);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'private.pem'), u.private_key);
    fs.writeFileSync(path.join(dir, 'public.pem'), u.public_key);
  }
  console.log(`✅ ${users.length}명 키 마이그레이션 완료 / Key migration completed for ${users.length} users.`);
}

// ✅ myapp40 - sessions 테이블에 저장 / Save to the sessions table.
export function createSession(username: string, userAgent: string | null, ip: string | null) {
  const id = crypto.randomUUID();
  const refreshToken = createRefreshToken();
  const accessToken = createAccessToken(username);

  db.prepare(`
    INSERT INTO sessions (id, username, refresh_token, access_token, user_agent, ip, expires_at)
    VALUES (?,?,?,?,?,?, datetime('now', '+7 days'))
  `).run(id, username, refreshToken, accessToken, userAgent, ip);

  return { id, refreshToken, accessToken };
}

export function getSessionByRefreshToken(refreshToken: string) {
  return db.prepare(`
    SELECT * FROM sessions WHERE refresh_token =? AND expires_at > datetime('now')
  `).get(refreshToken) as any;
}

export function deleteSessionByRefreshToken(refreshToken: string) {
  return db.prepare('DELETE FROM sessions WHERE refresh_token =?').run(refreshToken);
}

export function refreshAccessToken(refreshToken: string) {
  const session = getSessionByRefreshToken(refreshToken);
  if (!session) return null;

  const newAccessToken = createAccessToken(session.username);
  db.prepare(`
    UPDATE sessions SET access_token =?, last_used_at = CURRENT_TIMESTAMP WHERE refresh_token =?
  `).run(newAccessToken, refreshToken);

  return { username: session.username, accessToken: newAccessToken };
}

// ✅ myapp39 + myapp40 - username return from request
export function getUsernameFromRequest(req: Request | NextRequest): string | null {
  // 1. Authorization 헤더 / header
  const auth = req.headers.get('Authorization') || (req as any).headers?.get?.('authorization');
  if (auth) {
    const token = auth.replace('Bearer ', '').trim();
    if (token) {
      const jwtDecoded = verifyToken(token);
      if (jwtDecoded?.username) return jwtDecoded.username;
      try {
        const row = db.prepare('SELECT username FROM oauth_tokens WHERE access_token =?').get(token) as any;
        if (row?.username) return row.username;
      } catch {}
    }
  }

  // 2. 쿠키에서 token / Token from the cookie
  const cookie = (req as any).headers?.get?.('cookie') || req.headers.get('cookie') || '';
  const m = cookie.match(/token=([^;]+)/);
  if (m) {
    const decoded = verifyToken(decodeURIComponent(m[1]));
    if (decoded?.username) return decoded.username;
  }

  return null;
}

export function getUsernameFromToken(token: string): string | null {
  const jwtDecoded = verifyToken(token);
  if (jwtDecoded?.username) return jwtDecoded.username;
  try {
    const row = db.prepare('SELECT username FROM oauth_tokens WHERE access_token =?').get(token) as any;
    return row?.username || null;
  } catch {
    return null;
  }
}