import { auth, signIn, signOut } from "../auth"
import { getDb } from './db'
import GuestbookClient from "./GuestbookClient"

// 서버에서 DB 직접 읽기 (fetch 필요 없음)
// Directly read from the database on the server (no fetch needed)
async function getPosts() {
  const db = getDb()
  const posts = db.prepare('SELECT * FROM posts ORDER BY id DESC').all()
  db.close()
  return posts as any[]
}

export default async function GuestbookPage() {
  const session = await auth()
  const posts = await getPosts() 
  

  return (
    <div className="p-10 max-w-xl mx-auto">
      <h1 className="text-2xl font-bold">📓 Guestbook (Server Action)</h1>

      {session?.user ? (
        <div className="my-4">
          <div className="flex items-center gap-2 mb-4">
            <img src={session.user.image || ""} alt="프로필/Profile" className="w-8 h-8 rounded-full" />
            <p>안녕하세요, <strong>{session.user.name}</strong>님! <br />
            Hello, <strong>{session.user.name}</strong>!</p>
          </div>
          <form action={async () => {
            'use server';
            await signOut();
          }}>
            <button className="bg-purple-500 text-white px-3 py-1 rounded">로그아웃/logout</button>
          </form>
        </div>
      ) : (
        <div className="my-4">
          <form action={async () => {
            'use server';
            await signIn("github");
          }}>
            <button className="bg-black text-white px-4 py-2 rounded">GitHub로 로그인/Log in with GitHub</button>
          </form>
        </div>
      )}

    <GuestbookClient
      isLoggedIn={!!session?.user}
      userEmail={session?.user?.email || ""} 
      posts={posts}
    />
    </div>
  )
}