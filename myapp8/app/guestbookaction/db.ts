// app/guestbookaction/db.ts
import path from 'path'
import Database from 'better-sqlite3'

const dbPath = path.join(process.cwd(), 'local.db')

export function getDb() {
  const db = new Database(dbPath)
  
  // 테이블 생성 / Create table if not exists
  db.exec(`
    CREATE TABLE IF NOT EXISTS posts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      slug TEXT UNIQUE NOT NULL,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      author_email TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)

  // 데이터 없으면 초기데이터 넣기 / If no data, insert initial data
  const checkEmpty = db.prepare('SELECT COUNT(*) as count FROM posts').get() as { count: number }
  
  if (checkEmpty.count === 0) {
    const insertInitial = db.prepare('INSERT INTO posts (slug, title, content) VALUES (?, ?, ?)')
    const defaultTitle = '반갑습니다! 첫 방문을 환영합니다.\nWelcome! Thank you for visiting my blog.'
    const defaultSlug = 'welcome-to-my-blog'
    const defaultContent = `안녕하세요! 블로그 시스템이 성공적으로 구축되었습니다.\nHello! The blog system has been successfully set up.`
    insertInitial.run(defaultSlug, defaultTitle, defaultContent)
    console.log('초기 데이터 생성됨')
  }

  return db
}
