// lib/crypto_utils.ts

import crypto from 'crypto';

// 환경 변수에서 가져올 마스터 키 (최소 32바이트 문자열이어야 함)
// Master key to be retrieved from environment variables (must be a string of at least 32 bytes)
const MASTER_KEY = process.env.MASTER_KEY || 'your_32_char_random_key_here_12345'; // 반드시 32자 / Must be 32 characters
const ALGORITHM = 'aes-256-cbc';

/**
 * DB에서 가져온 암호화된 문자열을 복원합니다. 
 * Decrypt the encrypted string retrieved from the database.
 */
export function decryptData(encryptedData: string): string {
  const [ivHex, dataHex] = encryptedData.split(':');
  const iv = Buffer.from(ivHex, 'hex');
  const cipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(MASTER_KEY), iv);
  
  let decrypted = cipher.update(dataHex, 'hex', 'utf8');
  decrypted += cipher.final('utf8');
  return decrypted;
}

/**
 * 개인키를 AES-256-CBC로 암호화하는 함수 / A function that encrypts a private key using AES-256-CBC
 */
export function encryptData(data: string): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(MASTER_KEY), iv);
  let encrypted = cipher.update(data, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  // IV를 암호문 앞에 붙여서 저장 (복원 시 필요함.)
  // Store the IV by prepending it to the ciphertext (it will be needed for decryption).
  return iv.toString('hex') + ':' + encrypted;
}
