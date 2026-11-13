//lib/db/drivers/mysql.ts

import mysql from 'mysql2/promise';
import { DbAdapter, Post, NewPost, EditPost } from '../adapter';
import { randomUUID } from 'crypto';


export class MysqlAdapter implements DbAdapter {
  private pool = mysql.createPool({
    host: process.env.DB_HOST, user: process.env.DB_USER,
    password: process.env.DB_PASSWORD, database: process.env.DB_DATABASE,
  });

// 데이터베이스 초기화 / Initialize the database
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


  // 글 작성 / Write a post
  async createPost(data: NewPost): Promise<Post> {
    const id = randomUUID();
    const now = Date.now();
    await this.pool.query(
      `INSERT INTO posts (id, content, created_at, username, visibility, in_reply_to_id, in_reply_to_username, in_reply_to_account_id) VALUES (?,?,?,?,?,?,?,?)`,
      [id, data.content, now, data.username, data.visibility || 'public', data.in_reply_to_id || null, data.in_reply_to_username || null, data.in_reply_to_account_id || null]
    );

    // 리턴 부분은 나중에 데이터베이스에서 검색한 내용을 리턴 하도록 수정 할 것 
    // The return part should be modified later to return the content retrieved from the database    
    return { id, content: data.content, username: data.username, visibility: data.visibility || 'public', created_at: now, in_reply_to_id: data.in_reply_to_id, in_reply_to_username: data.in_reply_to_username, in_reply_to_account_id: data.in_reply_to_account_id };
  }
  
  // 글 조회 / View Post
  async getPostById(id: string): Promise<Post | null> {
    const [rows] = await this.pool.query('SELECT * FROM posts WHERE id=?', [id]) as [Post[], any];
    return rows[0] || null;
  }
  // 글 삭제 / Delete Post
  async deletePostById(id: string): Promise<boolean> {
    const [result] = await this.pool.query('DELETE FROM posts WHERE id=?', [id]) as [any, any];
    return result.affectedRows > 0;
  }

  // 글 수정 / Edit Post
  async editPost(data: EditPost): Promise<Post> {
    const now = Date.now();
    await this.pool.query(
      `UPDATE posts SET content=?, visibility=?, created_at=? WHERE id=?`,
      [data.content, data.visibility || 'public', now, data.id]
    );
    
    // 리턴 부분은 나중에 데이터베이스에서 검색한 내용을 리턴 하도록 수정 할 것 
    // The return part should be modified later to return the content retrieved from the database
    return { id: data.id, content: data.content, username: data.username, visibility: data.visibility || 'public', created_at: now, in_reply_to_id: data.in_reply_to_id, in_reply_to_username: data.in_reply_to_username, in_reply_to_account_id: data.in_reply_to_account_id };
  }

//----------------------------------------
// 회원가입 / signup
//----------------------------------------

// 데이터베이스 초기화 / Initialize the database
async initUser(): Promise<void> {
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(255) UNIQUE NOT NULL,
        display_name VARCHAR(255) DEFAULT '',
        summary TEXT DEFAULT '',
        private_key TEXT DEFAULT '',
        public_key TEXT DEFAULT '',
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        email_verified TINYINT DEFAULT 0,
        mastodon_id VARCHAR(255) DEFAULT '',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
    `);
  }

  // username 검색 / Search username
  async getUserByUsername(username: string): Promise<{ username: string } | null> {
    const [rows] = await this.pool.query('SELECT username FROM users WHERE username=?', [username]) as [{ username: string }[], any];
    return rows[0] || null; 
  }

  // 이메일 검색 / Search email
  async getUserByEmail(email: string): Promise<{ email: string } | null> {
    const [rows] = await this.pool.query('SELECT email FROM users WHERE email=?', [email]) as [{ email: string }[], any];
    return rows[0] || null; 
  }

  // 회원가입 / Signup
  async createUser(data: { username: string; displayName?: string; email: string; passwordHash: string; publicKey: string; }): Promise<any> {
    const { username, displayName, email, passwordHash, publicKey } = data;
    const mastodonId = randomUUID().slice(0, 8);

  await this.pool.query(
    `INSERT INTO users (
      username, 
      display_name, 
      summary, 
      private_key, 
      public_key, 
      email, 
      password_hash, 
      email_verified, 
      mastodon_id
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      username,                // username
      displayName || username, // display_name
      '',                      // summary
      '',                      // private_key
      publicKey,               // public_key
      email,                   // email
      passwordHash,            // password_hash
      1,                       // email_verified (default value 1)
      mastodonId               // mastodon_id
    ]
    ) as [any, any];

    return { 
      username : username, 
      displayName: displayName || username, 
      email : email 
    };
  }
}