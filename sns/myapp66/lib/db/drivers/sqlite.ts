// lib/db/drivers/sqlite.ts

import DatabaseSync from 'better-sqlite3';
import path from 'path';
import { DbAdapter, Post, NewPost, EditPost } from '../adapter';
import { randomUUID } from 'crypto';

export class SqliteAdapter implements DbAdapter {
  private db = new DatabaseSync(path.join(process.cwd(), 'data.sqlite'));

  async init() {
    this.db.exec(`PRAGMA journal_mode = WAL`);
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS posts (
        id TEXT PRIMARY KEY, content TEXT NOT NULL,
        username TEXT DEFAULT 'user1', visibility TEXT DEFAULT 'public',
        original_id TEXT, sensitive INTEGER DEFAULT 0,
        in_reply_to_id TEXT, in_reply_to_username TEXT,
        in_reply_to_account_id TEXT, created_at INTEGER
      );
    `);
  }

  // 글 작성 / Write a post
  async createPost(data: NewPost): Promise<Post> {
    const id = randomUUID();
    const now = Date.now();
    this.db.prepare(`
      INSERT INTO posts (id, content, created_at, username, visibility, in_reply_to_id, in_reply_to_username, in_reply_to_account_id)
      VALUES (?,?,?,?,?,?,?,?)
    `).run(id, data.content, now, data.username, data.visibility || 'public', data.in_reply_to_id || null, data.in_reply_to_username || null, data.in_reply_to_account_id || null);
    
    return { id, content: data.content, username: data.username, visibility: data.visibility || 'public', created_at: now, in_reply_to_id: data.in_reply_to_id, in_reply_to_username: data.in_reply_to_username, in_reply_to_account_id: data.in_reply_to_account_id };
  }
  
  // 글 조회 / View Post
  async getPostById(id: string): Promise<Post | null> {
    const row = this.db.prepare('SELECT * FROM posts WHERE id=?').get(id) as Post | undefined;
    return row || null;
  }

  // 글 삭제 / Delete Post
  async deletePostById(id: string): Promise<boolean> {
    const result = this.db.prepare('DELETE FROM posts WHERE id=?').run(id);
    return result.changes > 0;
  }

  // 글 수정 / Edit Post
  async editPost(data: EditPost): Promise<Post> {
    const now = Date.now();
    this.db.prepare(`
      UPDATE posts SET content=?,visibility=?, created_at=?
      WHERE id=?
    `).run(data.content,data.visibility || 'public', now, data.id);
    
    // 리턴 부분은 나중에 데이터베이스에서 검색한 내용을 리턴 하도록 수정 할 것 
    // The return part should be modified later to return the content retrieved from the database
    return { id: data.id, content: data.content, username: data.username, visibility: data.visibility || 'public', created_at: now, in_reply_to_id: data.in_reply_to_id, in_reply_to_username: data.in_reply_to_username, in_reply_to_account_id: data.in_reply_to_account_id };
  }

//----------------------------------------
// 회원가입 / signup
//----------------------------------------
async initUser(): Promise<void> {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        display_name TEXT DEFAULT '',
        summary TEXT DEFAULT '',
        private_key TEXT NOT NULL,
        public_key TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        email_verified INTEGER DEFAULT 0,
        mastodon_id TEXT UNIQUE NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);
  }

  async getUserByUsername(username: string): Promise<{ username: string } | null> {
    const row = this.db.prepare('SELECT username FROM users WHERE username=?').get(username) as { username: string } | undefined;
    return row || null;
  }

  async getUserByEmail(email: string): Promise<{ email: string } | null> {
    const row = this.db.prepare('SELECT email FROM users WHERE email=?').get(email) as { email: string } | undefined;
    return row || null;
  }

  async createUser(data: { username: string; displayName?: string; email: string; passwordHash: string; publicKey: string; }): Promise<any> {
    const { username, displayName, email, passwordHash, publicKey } = data;
    const mastodonId = randomUUID().slice(0, 8);

    this.db.prepare(`
      INSERT INTO users (
      username, 
      display_name, 
      summary, 
      private_key, 
      public_key, 
      email, 
      password_hash, 
      email_verified, 
      mastodon_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      username,                // username
      displayName || username, // display_name
      '',                      // summary
      '',                      // private_key
      publicKey,               // public_key
      email,                   // email
      passwordHash,            // password_hash
      1,                       // email_verified (default value 1)
      mastodonId               // mastodon_id
    );

    return { 
      username : username, 
      displayName: displayName || username, 
      email : email 
    };
  }

}