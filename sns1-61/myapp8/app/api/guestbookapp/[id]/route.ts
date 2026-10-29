import { NextResponse } from 'next/server';
import path from 'path';
import Database from 'better-sqlite3';

const dbPath = path.join(process.cwd(), 'local.db');

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idParam } = await params;
    const id = Number(idParam);

    console.log("삭제 요청 ID / Delete Request ID:", id);

    const db = new Database(dbPath);
    const stmt = db.prepare('DELETE FROM posts WHERE id = ?');
    const result = stmt.run(id);
    db.close();

    if (result.changes === 0) {
      return NextResponse.json({ message: "해당 글이 없습니다./The post does not exist." }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("삭제 오류 / Delete Error:", error);
    return NextResponse.json({ message: "삭제 실패/The deletion failed." }, { status: 500 });
  }
}