// lib/db/index.ts
import type { DbAdapter } from './adapter.ts';
import { SqliteAdapter } from './drivers/sqlite';
import { MysqlAdapter } from './drivers/mysql';

let instance: DbAdapter | null = null;

export function getDb(): DbAdapter {
  if (instance) return instance;

  const type = process.env.DB_TYPE || 'mysql';

  if (type === 'mysql') {
    console.log(`[DB] Using MySQL -> ${process.env.DB_USER}@${process.env.DB_HOST}/${process.env.DB_DATABASE}`);
    instance = new MysqlAdapter();
  } else {
    const url = process.env.DATABASE_URL || './data.sqlite';
    console.log(`[DB] Using SQLite -> ${url}`);
    instance = new SqliteAdapter(url);
  }

  return instance;
}

export default getDb;