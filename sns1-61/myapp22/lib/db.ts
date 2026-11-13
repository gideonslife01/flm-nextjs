// ✅ myapp22 - ~/myapp22/lib/db.ts 
import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.join(process.cwd(), 'data.sqlite');
const db = new Database(dbPath);
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    username TEXT PRIMARY KEY,
    display_name TEXT DEFAULT '',
    summary TEXT DEFAULT '',
    private_key TEXT,
    public_key TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS posts (
    id TEXT PRIMARY KEY,
    content TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    username TEXT DEFAULT 'user1'
  );

  CREATE TABLE IF NOT EXISTS followers (
    id TEXT PRIMARY KEY,
    actor TEXT NOT NULL,
    inbox TEXT NOT NULL,
    username TEXT
  );

  CREATE TABLE IF NOT EXISTS following (
    id TEXT PRIMARY KEY,
    actor TEXT NOT NULL,
    username TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS inbox_posts (
    id TEXT PRIMARY KEY,
    actor TEXT,
    content TEXT,
    username TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    original_id TEXT
  );
`);

db.exec(`
  CREATE INDEX IF NOT EXISTS idx_followers_username ON followers(username);
  CREATE INDEX IF NOT EXISTS idx_followers_actor ON followers(actor);
  CREATE INDEX IF NOT EXISTS idx_following_username ON following(username);
  CREATE INDEX IF NOT EXISTS idx_following_actor ON following(actor);
  CREATE INDEX IF NOT EXISTS idx_posts_username_created ON posts(username, created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_inbox_username_created ON inbox_posts(username, created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_inbox_actor ON inbox_posts(actor);
  CREATE UNIQUE INDEX IF NOT EXISTS idx_following_actor_username ON following(actor, username);
  CREATE UNIQUE INDEX IF NOT EXISTS idx_followers_actor_username ON followers(actor, username);
`);

export default db;