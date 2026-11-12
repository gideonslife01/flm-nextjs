// app/key/

import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import db from '../../lib/db'; 
import { encryptData } from '../../lib/crypto_utiles';


export function createUser(username: string) {
  const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
  });

  // 키파일 저장 경로 설정 / Set key file storage path
  const userKeyDir = path.join(process.cwd(), `data/keys/${username}`);
  if (!fs.existsSync(userKeyDir)) fs.mkdirSync(userKeyDir, { recursive: true });

  // 키 파일 저장 / Save key file
  fs.writeFileSync(path.join(userKeyDir, 'private.pem'), privateKey);
  fs.writeFileSync(path.join(userKeyDir, 'public.pem'), publicKey);
  console.log(`✅ 키 파일 저장/save key file: data/keys/${username}/`);

  // 개인키 암호화 / Private key encryption
  const encryptedPrivateKey = encryptData(privateKey);

  // SQLite에 저장 / Save to SQLite
  try {
    const stmt = db.prepare('INSERT INTO users (username, public_key, encrypted_private_key) VALUES (?, ?, ?)');
    stmt.run(username, publicKey, encryptedPrivateKey);
    console.log(`✅ User ${username} saved to database.`);
  } catch (error) {
    console.error("DB Insert Error:", error);
    throw new Error("Failed to save user to database");
  }

}

export async function POST(req: NextRequest) {
  const { username } = await req.json();
  
  if (!username) {
    return NextResponse.json({ error: "Username is required" }, { status: 400 });
  }

  try {
    createUser(username);
    return NextResponse.json({ message: "User created successfully" });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * 
 
 curl -X POST http://localhost:3000/key \
     -H "Content-Type: application/json" \
     -d '{"username": "testuser"}'

 */