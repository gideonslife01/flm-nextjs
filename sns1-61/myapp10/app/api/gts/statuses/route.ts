import { auth } from "@/auth"

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.accessToken) return new Response("Unauthorized", { status: 401 })
  
  const { status } = await req.json()
  const baseUrl = process.env.GTS_URL || "https://freelifemakers.com"
  
  const res = await fetch(`${baseUrl}/api/v1/statuses`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${session.accessToken}`,
      'Content-Type': 'application/json'
    },
    // 글 작성 시 visibility를 "public"으로 설정하여 공개 상태로 게시
    // When creating a post, set visibility to "public" to make it public
    body: JSON.stringify({ status,visibility: "public" })
  })
  
  const data = await res.json()
  return Response.json(data)
}
