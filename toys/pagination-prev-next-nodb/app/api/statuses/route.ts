// app/api/statuses/route.ts

import path from 'path';
import fs from 'fs';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const data = [];
  for (let i = 1; i <= 100; i++) {
    data.push({
      id: i,
      title: `Post ${i}`,
      content: `Content for item ${i}`,
      category: "General",
      created_at: new Date().toISOString(),
    });
  }

  // 파일 경로 설정 / Set file path
  const filePath = path.resolve(process.cwd(), 'data', 'data.json');

  // 디렉토리가 없으면 생성 / Create the directory if it does not exist
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');

  return NextResponse.json({ message: "100 items generated successfully!" });
}