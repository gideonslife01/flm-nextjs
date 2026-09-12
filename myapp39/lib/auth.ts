// ✅ myapp31 - lib/auth.ts
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import db from './db';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { NextRequest } from 'next/server'; // ✅ myapp39

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';
const DOMAIN = process.env.DOMAIN || 'aloy-horizon.duckdns.org';

export async function hashPassword(password: string) {
  return await bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string) {
  return await bcrypt.compare(password, hash);
}

export function createToken(username: string) {
  return jwt.sign({ username }, JWT_SECRET, { expiresIn: '7d' });
}

export function verifyToken(token: string) {
  try {
    return jwt.verify(token, JWT_SECRET) as { username: string };
  } catch {
    return null;
  }
}

export function getUser(username: string) {
  return db.prepare('SELECT * FROM users WHERE username = ?').get(username) as any;
}

export function getUserByEmail(email: string) {
  return db.prepare('SELECT * FROM users WHERE email = ?').get(email) as any;
}

//  ✅ myapp31 - 신규 유저 생성 (키도 같이 생성!) / Create a new user (with keys!)
export function createUser(username: string, email: string, passwordHash: string, displayName: string = '') {
  const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
  });

  // ap.ts 구조 / ap.ts structure: data/keys/${username}/private.pem
  const userKeyDir = path.join(process.cwd(), `data/keys/${username}`);
  if (!fs.existsSync(userKeyDir)) fs.mkdirSync(userKeyDir, { recursive: true });
  
  fs.writeFileSync(path.join(userKeyDir, 'private.pem'), privateKey);
  fs.writeFileSync(path.join(userKeyDir, 'public.pem'), publicKey);
  console.log(`✅ 키 파일 저장: data/keys/${username}/`);

  //  DB에도 저장! (2중 백업!) / Save to DB as well! (double backup!)
  return db.prepare(`
    INSERT INTO users (username, display_name, summary, private_key, public_key, email, password_hash, email_verified, created_at)
    VALUES (?, ?, '', ?, ?, ?, ?, 1, CURRENT_TIMESTAMP)
  `).run(username, displayName || username, privateKey, publicKey, email, passwordHash);
}

//  ✅ myapp31 -기존 DB -> 파일로 마이그레이션! / Migrate existing DB keys to files!
export function migrateKeysToFiles() {
  const users = db.prepare('SELECT username, private_key, public_key FROM users').all() as any[];
  for (const u of users) {
    if (!u.private_key) continue;
    const dir = path.join(process.cwd(), `data/keys/${u.username}`);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'private.pem'), u.private_key);
    fs.writeFileSync(path.join(dir, 'public.pem'), u.public_key);
  }
  console.log(`✅ ${users.length}명 키 마이그레이션 완료!`);
}

// ✅ myapp39 
// Request에서 username 추출 (JWT + oauth_tokens 둘 다 지원)
// Extract username from the request (supports both JWT and oauth_tokens)
export function getUsernameFromRequest(req: Request | NextRequest): string | null {
  // 1. Authorization 헤더 확인 / Check the Authorization header.
  const auth = req.headers.get('Authorization') || (req as any).headers?.get?.('authorization');
  if (!auth) {
    // 쿠키에서 token 확인 (웹 로그인용) / Check for token in cookies (for web login)
    const cookie = (req as any).headers?.get?.('cookie') || '';
    const m = cookie.match(/token=([^;]+)/);
    if (m) {
      const decoded = verifyToken(m[1]);
      if (decoded?.username) return decoded.username;
    }
    return null;
  }

  const token = auth.replace('Bearer ', '').trim();
  if (!token) return null;

  // JWT 먼저 시도 (웹 로그인용) / Try JWT first (for web login)
  const jwtDecoded = verifyToken(token);
  if (jwtDecoded?.username) {
    return jwtDecoded.username;
  }

  // oauth_tokens에서 찾기 (Pinafore Mastodon API용)
  // Find in oauth_tokens (for Pinafore Mastodon API)
  try {
    const row = db.prepare('SELECT username FROM oauth_tokens WHERE access_token =?').get(token) as any;
    if (row?.username) {
      return row.username;
    }
  } catch (e) {
    console.error('oauth_tokens 조회 실패', e);
  }

  return null;
}

// ✅ myapp39
// Pinafore용 verify_credentials에서 쓰기 좋게
// To make it convenient to use in verify_credentials for Pinafore
export function getUsernameFromToken(token: string): string | null {
  // JWT?
  const jwtDecoded = verifyToken(token);
  if (jwtDecoded?.username) return jwtDecoded.username;

  // oauth_tokens?
  try {
    const row = db.prepare('SELECT username FROM oauth_tokens WHERE access_token =?').get(token) as any;
    return row?.username || null;
  } catch {
    return null;
  }
}