// ~/myapp11/lib/db.ts
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const dir = path.join(process.cwd());
const dbPath = path.join(dir, 'data.sqlite');

const db = new Database(dbPath);

// 테이블 생성 / Create table if it doesn't exist
db.exec(`
  CREATE TABLE IF NOT EXISTS posts (
    id TEXT PRIMARY KEY,
    content TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

export default db;
