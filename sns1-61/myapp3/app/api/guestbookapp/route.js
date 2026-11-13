import { NextResponse } from 'next/server';

const guestbookData = [
  { id: 1, name: '2B', content: '니어오토마타 / Nier:Automata' },
  { id: 2, name: '9S', content: 'Next.js API App Routes.' },
];

// GET 요청 처리 (데이터 조회)
// Handle GET requests (data retrieval)
export async function GET() {
  return NextResponse.json(guestbookData);
}

// POST 요청 처리 (데이터 등록)
// Handle POST requests (data registration)
export async function POST(request) {
  const body = await request.json();
  const { name, content } = body;

  if (!name || !content) {
    return NextResponse.json({ message: '이름과 내용을 입력해주세요. / Please enter both name and content.' }, { status: 400 });
  }

  const newPost = {
    id: Date.now(),
    name,
    content,
  };

  guestbookData.push(newPost);
  return NextResponse.json(newPost, { status: 201 });
}

