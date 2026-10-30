import Database from 'better-sqlite3';
import type { DbAdapter, User, NewUser } from '../adapter';

export class SqliteAdapter implements DbAdapter {
  private db: any;
  constructor(private path: string = './data.sqlite') {
    this.db = new Database(path);
    this.db.pragma('journal_mode = WAL');
  }

  async init(): Promise<void> {
    // 테이블은 이미 만들었다고 했으니 init은 비워둬도 됨
    // 없으면 생성하도록 안전장치만
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS user (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT NOT NULL
      )
    `);
  }

  async createUser(data: NewUser): Promise<User> {
    this.db.prepare('INSERT INTO user (id, name, email) VALUES (?, ?, ?)')
      .run(data.id, data.name, data.email);
    return data;
  }

  async getUserById(id: string): Promise<User | null> {
    return this.db.prepare('SELECT * FROM user WHERE id = ?').get(id) as User || null;
  }

  async getUserByName(name: string): Promise<User | null> {
    return this.db.prepare('SELECT * FROM user WHERE name = ?').get(name) as User || null;
  }

  async listUsers(): Promise<User[]> {
    return this.db.prepare('SELECT * FROM user').all() as User[];
  }

  async deleteUser(id: string): Promise<void> {
    this.db.prepare('DELETE FROM user WHERE id = ?').run(id);
  }

  async close(): Promise<void> {
    this.db.close();
  }
}