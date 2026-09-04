// ✅ myapp31 - lib/auth.ts
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import db from './db';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

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