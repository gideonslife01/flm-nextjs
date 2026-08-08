import { NextResponse } from 'next/server';
import path from 'path';
import Database from 'better-sqlite3';

const dbPath = path.join(process.cwd(), 'local.db');
const db = new Database(dbPath);

// 1. 테이블 생성 (author_email 추가)
db.exec(`
  CREATE TABLE IF NOT EXISTS posts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    slug TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    author_email TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// 2. 기존 DB에 author_email 컬럼이 없으면 추가 (마이그레이션)
try {
  db.exec(`ALTER TABLE posts ADD COLUMN author_email TEXT`);
} catch (e) {
  // 이미 컬럼이 있으면 에러 무시
}

const checkEmpty = db.prepare('SELECT COUNT(*) as count FROM posts').get() as { count: number };

if (checkEmpty.count === 0) {
  const insertInitial = db.prepare('INSERT INTO posts (slug, title, content) VALUES (?, ?, ?)');
  const defaultTitle = '반갑습니다! 첫 방문을 환영합니다.\nWelcome! Thank you for visiting my blog.';
  const defaultSlug = 'welcome-to-my-blog';
  const defaultContent = `안녕하세요! 블로그 시스템이 성공적으로 구축되었습니다.\nHello! The blog system has been successfully set up.`;
  insertInitial.run(defaultSlug, defaultTitle, defaultContent);
}

export async function GET() {
  try {
    // 3. id와 author_email도 같이 가져오기
    const stmt = db.prepare('SELECT id, slug, title, content, author_email as authorEmail FROM posts ORDER BY created_at DESC');
    const posts = stmt.all();
    return NextResponse.json(posts);
  } catch (error) {
    console.error("SQLite 조회 오류 / SQLiteRead Error:", error);
    return NextResponse.json({ message: "Failed to read data." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { title, content, authorEmail } = body; // authorEmail 받기

    if (!title || !content) {
      return NextResponse.json({ message: '제목과 내용을 모두 입력해주세요./Please enter both title and content.' }, { status: 400 });
    }

    const slug = title.trim().replace(/\s+/g, '-').replace(/[^a-zA-Z0-9가-힣\-]/g, '') + '-' + Date.now();

    // 4. author_email도 저장
    const insertStmt = db.prepare('INSERT INTO posts (slug, title, content, author_email) VALUES (?, ?, ?, ?)');
    const result = insertStmt.run(slug, title, content, authorEmail || null);

    const newPost = { id: result.lastInsertRowid, slug, title, content, authorEmail };
    return NextResponse.json(newPost, { status: 201 });

  } catch (error) {
    console.error("SQLite 저장 오류 / SQLiteSave Error:", error);
    return NextResponse.json({ message: 'Failed to save data.' }, { status: 500 });
  }
}