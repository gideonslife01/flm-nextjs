import mysql from 'mysql2/promise';
import type { DbAdapter, User, NewUser } from '../adapter.ts';

export class MysqlAdapter implements DbAdapter {
  private pool: mysql.Pool;

  constructor() {
    // .env.local에서 각각 읽음
    this.pool = mysql.createPool({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'mysns',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_DATABASE || 'mysns',
      waitForConnections: true,
      connectionLimit: 10,
    });
  }

  async init(): Promise<void> {
    await this.pool.execute(`
      CREATE TABLE IF NOT EXISTS \`user\` (
        id VARCHAR(255) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL
      )
    `);
  }

  async createUser(data: NewUser): Promise<User> {
    await this.pool.execute('INSERT INTO `user` (id, name, email) VALUES (?, ?, ?)', [data.id, data.name, data.email]);
    return data;
  }

  async getUserById(id: string): Promise<User | null> {
    const [rows] = await this.pool.execute('SELECT * FROM `user` WHERE id = ?', [id]);
    return (rows as User[])[0] || null;
  }

  async getUserByName(name: string): Promise<User | null> {
    const [rows] = await this.pool.execute('SELECT * FROM `user` WHERE name = ?', [name]);
    return (rows as User[])[0] || null;
  }

  async listUsers(): Promise<User[]> {
    const [rows] = await this.pool.execute('SELECT * FROM `user`');
    return rows as User[];
  }

  async deleteUser(id: string): Promise<void> {
    await this.pool.execute('DELETE FROM `user` WHERE id = ?', [id]);
  }

  async close(): Promise<void> {
    await this.pool.end();
  }
}