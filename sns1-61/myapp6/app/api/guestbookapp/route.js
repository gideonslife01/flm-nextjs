import { NextResponse } from 'next/server';
//import fs from 'fs';
import path from 'path';
import Database from 'better-sqlite3';

// 데이터베이스 연결 및 초기화 / Database connection and initialization
// DB 파일은 프로젝트 루트의 local.db 파일로 생성됩니다.
// The database file will be created as local.db in the project root.
const dbPath = path.join(process.cwd(), 'local.db');
const db = new Database(dbPath);

// 서버 시작 시 posts 테이블이 없으면 생성합니다.
// Create the posts table if it doesn't exist when the server starts.
db.exec(`
  CREATE TABLE IF NOT EXISTS posts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    slug TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// DB가 비어 있다면 초기 인사말 데이터 등록
// If the database is empty, register initial greeting data
const checkEmpty = db.prepare('SELECT COUNT(*) as count FROM posts').get();

if (checkEmpty.count === 0) {
  const insertInitial = db.prepare('INSERT INTO posts (slug, title, content) VALUES (?, ?, ?)');
  
  const defaultTitle = '반갑습니다! 첫 방문을 환영합니다.';
  const defaultSlug = 'welcome-to-my-blog';
  const defaultContent = `안녕하세요! 블로그 시스템이 성공적으로 구축되었습니다.
  \n\n이 글은 데이터베이스가 비어 있을 때 자동으로 생성되는 첫 안내글입니다. 자유롭게 새 글을 작성하여 블로그를 채워보세요!
  \n\nHello! The blog system has been successfully set up.
  \n\nThis post is the first greeting that is automatically created when the database is empty. Feel free to write new posts and fill your blog!
  `;

  insertInitial.run(defaultSlug, defaultTitle, defaultContent);
  console.log(' 초기 인사말 데이터가 성공적으로 생성되었습니다. / Initial greeting data has been successfully created.');
}

// GET 요청 처리 (데이터 조회) / Handle GET request (data retrieval)
export async function GET() {
  try {
    // 최신 등록 순서(created_at 내림차순)로 데이터를 가져옵니다.
    // Fetch data in the order of latest registration (descending order of created_at)
    const stmt = db.prepare('SELECT slug, title, content FROM posts ORDER BY created_at DESC');
    const posts = stmt.all();

    return NextResponse.json(posts);
  } catch (error) {
    console.error("SQLite 조회 오류 / SQLite read error:", error);
    return NextResponse.json(
      { message: "데이터를 읽어오지 못했습니다. / Failed to read data." }, 
      { status: 500 }
    );
  }
}

// POST 요청 처리 (데이터 등록)
// Handle POST request (data registration)
export async function POST(request) {
  try {
    const body = await request.json();
    const { title, content } = body;

    if (!title || !content) {
      return NextResponse.json(
        { message: '제목과 내용을 모두 입력해주세요. / Please enter both title and content.' }, 
        { status: 400 }
      );
    }

    // slug 만들기 - 공백을 하이픈으로 대체하고 특수문자 제거
    // Create slug - replace spaces with hyphens and remove special characters
    const slug = title
      .trim()
      .replace(/\s+/g, '-')
      .replace(/[^a-zA-Z0-9가-힣\-]/g, '');

    // 중복된 slug(제목)가 있는지 확인
    // Check for duplicate slug (title)
    const checkStmt = db.prepare('SELECT id FROM posts WHERE slug = ?');
    const existingPost = checkStmt.get(slug);

    if (existingPost) {
      return NextResponse.json(
        { message: '이미 동일한 제목의 글이 존재합니다. / A post with the same title already exists.' }, 
        { status: 409 }
      );
    }

    // 데이터베이스에 새 게시글 삽입
    // Insert new post into the database
    const insertStmt = db.prepare('INSERT INTO posts (slug, title, content) VALUES (?, ?, ?)');
    insertStmt.run(slug, title, content);

    // 성공 시 반환할 데이터 객체
    // Data object to return on success
    const newPost = { slug, title, content };

    return NextResponse.json(newPost, { status: 201 });

  } catch (error) {
    console.error("SQLite 저장 오류 / SQLite write error:", error);
    return NextResponse.json(
      { message: '서버에 데이터를 저장하지 못했습니다. / Failed to save data.' }, 
      { status: 500 }
    );
  }
}

