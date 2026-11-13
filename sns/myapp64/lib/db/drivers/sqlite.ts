// lib/db/drivers/sqlite.ts

import DatabaseSync from 'better-sqlite3';
import path from 'path';
import { DbAdapter, Post, NewPost } from '../adapter';
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
}