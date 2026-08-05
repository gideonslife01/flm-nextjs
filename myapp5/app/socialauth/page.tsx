// app/guestbook/page.tsx
//import { auth, signIn, signOut } from "@/auth"
import { auth, signIn, signOut } from "../auth"

export default async function GuestbookPage() {
  // 서버에서 유저 정보 바로 가져오기 
  // Get user info directly from the server
  const session = await auth() 

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Social Auth</h1>

      {session?.user ? (
        <div>
          <div className="flex items-center gap-2 mb-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={session.user.image || ""} alt="프로필" className="w-8 h-8 rounded-full" />
            <p>안녕하세요(Hello), <strong>{session.user.name}</strong>님!</p>
          </div>

          {/* Social Auth 작성 폼 위치 / social auth form location   */}
          <textarea className="border p-2 w-full mb-2" placeholder="글을 남겨보세요. / Leave a message." />

          {/* 로그아웃 버튼 / logout button*/}
          <form action={async () => {
            'use server';
            await signOut();
          }}>
            <button className="bg-purple-500 text-white px-3 py-1 rounded">로그아웃/logout</button>
          </form>
        </div>
      ) : (
        <div>
          <p className="mb-4">글을 작성하려면 로그인이 필요합니다. / You need to be logged in to write a message.</p>
          {/* 로그인 버튼 / login button */}
          <form action={async () => {
            'use server';
            await signIn("github");
          }}>
            <button className="bg-black text-white px-4 py-2 rounded">GitHub로 로그인 / Sign in with GitHub</button>
          </form>
        </div>
      )}
    </div>
  )
}

