// app/feed/page.tsx
import { auth } from "@/auth"
import { getHomeTimeline } from "@/lib/gotosocial" // /lib/gotosocial.ts
import { PostCard } from './PostCard' // Post,Delete Card Component


export default async function Feed() {
  // NextAuth v5 전용 세션 추출
  // Extract session for NextAuth v5
  const session = await auth() 

  // 토큰이 세션에 안전하게 들어왔는지 검증
  // Verify if the token has been safely retrieved in the session
  if (!session?.accessToken) {
    return (
      <div className="p-10 text-center">
        <p className="text-red-500 font-semibold mb-2">인증 토큰을 찾을 수 없습니다. / Unable to find authentication token.</p>
        <a href="/api/auth/signin" className="text-blue-500 underline">로그인 페이지로 이동 / Go to login page</a>
      </div>
    )
  }


  try {

    // /lib/gotosocial.ts의 getHomeTimeline() 함수 사용
    // Use the getHomeTimeline() function from /lib/gotosocial.ts
    const posts = await getHomeTimeline(session.accessToken)

    return (
      <div className="max-w-xl mx-auto p-4 space-y-4">
        <h1 className="text-xl font-bold border-b pb-2">연합 우주 타임라인</h1>
        <h1 className="text-sm text-gray-500"> Federated Universe Timeline </h1>
        {posts.length === 0 ? (
          <p className="text-gray-500 py-10 text-center">아직 타임라인에 표시할 글이 없습니다. / No posts to display yet.</p>
        ) : (
          posts.map((p: any) => <PostCard key={p.id} post={p} token={session.accessToken} />)
        )}
      </div>
    )
  } catch (error) {
    console.error("피드 로딩 중 치명적 에러 / Fatal error while loading feed:", error);
    return <div className="p-10 text-red-500">GTS 백엔드 서버와 통신하는 중 문제가 발생했습니다. / Error occurred while communicating with GTS backend.</div>
  }
}

// signout  : http://localhost:3000/api/auth/signout
// signin  : http://localhost:3000/api/auth/signin