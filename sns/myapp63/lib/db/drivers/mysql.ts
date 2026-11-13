//lib/db/drivers/mysql.ts

import mysql from 'mysql2/promise';
import { DbAdapter, Post, NewPost } from '../adapter';
import { randomUUID } from 'crypto';

export class MysqlAdapter implements DbAdapter {
  private pool = mysql.createPool({
    host: process.env.DB_HOST, user: process.env.DB_USER,
    password: process.env.DB_PASSWORD, database: process.env.DB_DATABASE,
  });

  async init() {
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS posts (
        id varchar(255) PRIMARY KEY,
        content text NOT NULL,
        created_at BIGINT DEFAULT NULL,
        username varchar(255) DEFAULT 'user',
        visibility varchar(20) DEFAULT 'public',
        original_id varchar(255) DEFAULT NULL,
        \`sensitive\` tinyint DEFAULT 0, 
        in_reply_to_id varchar(255) DEFAULT NULL,
        in_reply_to_username varchar(255) DEFAULT NULL,
        in_reply_to_account_id varchar(255) DEFAULT NULL,
        KEY idx_posts_username_created (username, created_at DESC),
        KEY idx_posts_visibility (visibility),
        KEY idx_posts_reply (in_reply_to_id),
        KEY idx_posts_reply_account (in_reply_to_account_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
    `);
  }

  async createPost(data: NewPost): Promise<Post> {
    const id = randomUUID();
    const now = Date.now();
    await this.pool.query(
      `INSERT INTO posts (id, content, created_at, username, visibility, in_reply_to_id, in_reply_to_username, in_reply_to_account_id) VALUES (?,?,?,?,?,?,?,?)`,
      [id, data.content, now, data.username, data.visibility || 'public', data.in_reply_to_id || null, data.in_reply_to_username || null, data.in_reply_to_account_id || null]
    );
    return { id, content: data.content, username: data.username, visibility: data.visibility || 'public', created_at: now, in_reply_to_id: data.in_reply_to_id, in_reply_to_username: data.in_reply_to_username, in_reply_to_account_id: data.in_reply_to_account_id };
  }

  async getPostById(id: string): Promise<Post | null> {
    const [rows] = await this.pool.query('SELECT * FROM posts WHERE id=?', [id]) as [Post[], any];
    return rows[0] || null;
  }
}