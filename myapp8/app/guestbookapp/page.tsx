import { auth, signIn, signOut } from "../auth"
import GuestbookClient from "./GuestbookClient"

export default async function GuestbookPage() {
  const session = await auth()

  return (
    <div className="p-10 max-w- mx-auto">
      <h1 className="text-2xl font-bold">📓 Guestbook + SQLite + OAuth</h1>

      {session?.user? (
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
          {/* <p className="mb-4">글을 작성하려면 로그인이 필요합니다.<br />You need to log in to write a post. </p> */}
          <form action={async () => {
            'use server';
            await signIn("github");
          }}>
            <button className="bg-black text-white px-4 py-2 rounded">GitHub로 로그인/Log in with GitHub</button>
          </form>
        </div>
      )}

      {/* 로그인 했을 때만 방명록 입력/목록 보여주기 /  When logged in, show the guestbook form and list */}
      {/* <GuestbookClient isLoggedIn={!!session?.user} /> */}
      <GuestbookClient
          isLoggedIn={!!session?.user}
          userEmail={session?.user?.email || ""}
      />
    </div>
  )
}