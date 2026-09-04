// ✅ myapp31 - ~/myapp31/lib/db.ts 
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const dbPath = path.join(process.cwd(), 'data.sqlite');
const db = new Database(dbPath);

// keys 폴더 생성! / Create keys folder!
const keysDir = path.join(process.cwd(), 'data/keys');
if (!fs.existsSync(keysDir)) {
  fs.mkdirSync(keysDir, { recursive: true });
  console.log('✅ keys 폴더 생성/ keys folder created:', keysDir);
}

/**
 * * SQLite의 WAL(Write-Ahead Logging) 모드는 읽기 및 쓰기 작업을 동시에 수행할 수 있게 하여, 
 * 멀티스레드 애플리케이션의 성능을 향상시킵니다. 
 * 이 모드는 쓰기 작업이 진행되는 동안에도 여러 읽기 작업이 데이터베이스에 접근할 수 있으므로, 
 * 높은 동시성과 낮은 지연 시간이 요구되는 애플리케이션에 특히 유용합니다. 
 * 또한, 기본 롤백 저널(rollback journal) 모드와 비교했을 때 더 뛰어난 내구성과 충돌 복구 기능을 제공합니다.
 * 즉 속도는 2배 빨라지고, 정전 나도 WAL 덕분에 데이터는 안전하게 보존됩니다.
 * 
 * SQLITE WAL (Write-Ahead Logging) mode allows for concurrent reads and writes, 
 * improving performance in multi-threaded applications. 
 * It is particularly useful for applications that require high concurrency and low latency, 
 * as it enables multiple readers to access the database while a writer is making changes. 
 * This mode also provides better durability and crash recovery compared to the default rollback journal mode.
 * In other words, speed doubles, and thanks to WAL, data remains safely preserved even during a power outage.
 * 
 * - WAL 끄기 / WAL OFF
 * sqlite3 data.sqlite "PRAGMA journal_mode=DELETE;"
 * 
 * - WAL 파일을 sqlite3 데이터베이스에 병합 / Merge WAL file into sqlite3 database
 * sqlite3 data.sqlite "PRAGMA wal_checkpoint(TRUNCATE);"
 * 
 * - WAL 모드 확인 / WAL Mode Check
 * sqlite3 data.sqlite "PRAGMA journal_mode;"
 */

db.pragma('journal_mode = WAL');

/**
 * 디스크에 쓰기 전에 SQLite가 데이터를 디스크에 동기화하는 방식을 제어합니다.
 * Controls how SQLite synchronizes data to disk before writing to the disk.
 * 
 * FULL : 가장 안전, 가장 느림 / Safest, Slowest
 * NORMAL : 안전, 빠름 / Safe, Fast
 * OFF : 안전하지 않음, 가장 빠름 / Unsafe, Fastest
 */

db.pragma('synchronous = NORMAL'); // NORMAL, FULL, OFF

db.exec(`
  -- myapp31 - ✅ users 테이블 수정 / Modify users table
CREATE TABLE IF NOT EXISTS users (
  username TEXT PRIMARY KEY,
  display_name TEXT DEFAULT '',
  summary TEXT DEFAULT '',
  private_key TEXT,
  public_key TEXT,
  email TEXT UNIQUE,
  password_hash TEXT,
  email_verified INTEGER DEFAULT 0,
  verification_token TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP);

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

  -- myapp23 ✅ likes/Undo likes
  CREATE TABLE IF NOT EXISTS likes (
    id TEXT PRIMARY KEY,           
    actor TEXT NOT NULL,    
    object TEXT NOT NULL,      
    username TEXT NOT NULL,       
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  -- myapp29 ✅  Boost(Announcement)
  CREATE TABLE IF NOT EXISTS announces (
    id TEXT PRIMARY KEY, 
    username TEXT, 
    object TEXT, 
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    actor TEXT
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

  -- myapp23 ✅
  CREATE INDEX IF NOT EXISTS idx_likes_object ON likes(object);
  CREATE INDEX IF NOT EXISTS idx_likes_actor ON likes(actor);
  CREATE UNIQUE INDEX IF NOT EXISTS idx_likes_actor_object ON likes(actor, object);
  CREATE INDEX IF NOT EXISTS idx_likes_username ON likes(username);
  
  -- myapp24 ✅
  CREATE INDEX IF NOT EXISTS idx_announces_obj_user ON announces(object, username);
  CREATE INDEX IF NOT EXISTS idx_announces_username ON announces(username);

    -- myapp29 ✅
  CREATE INDEX IF NOT EXISTS idx_announces_actor ON announces(actor);
  CREATE UNIQUE INDEX IF NOT EXISTS idx_announces_actor_object ON announces(actor, object);
`);

export default db;
