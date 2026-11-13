// lib/auth.ts

import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { getDb }from '@/lib/db';
import fs from 'fs';
import path from 'path';


//--------------------------------
// ✅ myapp66 - auth.ts
// 회원가입 / signup
//--------------------------------

const db = getDb();

// username 검색 / Search username
export async function getUser(username: string) {
  return db.getUserByUsername(username);
}

// 이메일 검색 / Search email
export async function getUserByEmail(email: string) {
  return db.getUserByEmail(email);
}

// 패스워드 암호화 / Password encryption
export async function hashPassword(password: string) {
  return await bcrypt.hash(password, 10);
}

// 회원가입 / Signup
export async function createUser(username: string, email: string, passwordHash: string, displayName: string = '') {
  const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
  });

  const userKeyDir = path.join(process.cwd(), `data/keys/${username}`);
  if (!fs.existsSync(userKeyDir)) fs.mkdirSync(userKeyDir, { recursive: true });

  fs.writeFileSync(path.join(userKeyDir, 'private.pem'), privateKey);
  fs.writeFileSync(path.join(userKeyDir, 'public.pem'), publicKey);
  console.log(`✅ 키 파일 저장/save key file: data/keys/${username}/`);

  const result = await db.createUser({ 
    username, 
    displayName: displayName || username, 
    email,
    passwordHash,
    publicKey
  });

  return {
    ...result,
  };

}