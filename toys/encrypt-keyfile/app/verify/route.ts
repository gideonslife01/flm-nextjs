// app/verify/route.ts

import { NextRequest, NextResponse } from 'next/server';
import db from '../../lib/db';
import { decryptData } from '../../lib/crypto_utiles';
import crypto from 'crypto';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const username = searchParams.get('username') as string;

  if (!username) {
    return NextResponse.json({ error: "Username is required" }, { status: 400 });
  }

  // DB에서 사용자 정보 가져오기 / fetch user info from DB
  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username) as any;

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  try {
    // DB에서 가져온 암호화된 개인키 복원 / restore encrypted private key from DB
    const decryptedPrivateKey = decryptData(user.encrypted_private_key);
    
    // 개인키를 파싱하여 공개키 생성 / Generate a public key by parsing the private key
    const privateKeyObject = crypto.createPrivateKey(decryptedPrivateKey);
    const publicKeyObject = crypto.createPublicKey(privateKeyObject);

    // 개인키로 공개키 추출 / Extracting a public key from a private key
    const publicKeyFromPrivateKey = publicKeyObject.export({
      type: 'spki', 
      format: 'pem',
    }).toString();


    // DB에 저장된 공개키 / Public key stored in the DB
    const publicKeyFromDB = user.public_key;

    // console.log("DB Key:", JSON.stringify(publicKeyFromDB)); 
    // console.log("Extracted Key:", JSON.stringify(publicKeyFromPrivateKey));

    // DB에 저장된 공개키와 개인키에서 추출한 공개키가 같은지 비교
    // Compare the public key stored in the DB with the public key extracted from the private key
    const isValidPair = (
      publicKeyFromDB.replace(/\s/g, '') === publicKeyFromPrivateKey.replace(/\s/g, '')
    );

    if (isValidPair) {
      return NextResponse.json({
        success: true,
        message: "Key pair verified successfully",
        details: {
          username: user.username,
          isValid: true 
        }
      });

    } else {
      return NextResponse.json({ success: false, message: "Key pair mismatch" }, { status: 400 });
    }

  } catch (error) {
     console.error(error);
    return NextResponse.json({ error: "Decryption or verification failed." }, { status: 500 });
  }
}

/*

- 유저 키 복원 / restore user key
curl "http://localhost:3000/verify?username=testuser"

*/