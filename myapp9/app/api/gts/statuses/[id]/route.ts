// app/api/gts/statuses/[id]/route.ts
import { auth } from "@/auth"

// 삭제 / Delete
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await auth()
  if (!session?.accessToken) return new Response("Unauthorized", { status: 401 })

  const baseUrl = process.env.GTS_URL || "https://freelifemakers.com"
  const res = await fetch(`${baseUrl}/api/v1/statuses/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${session.accessToken}` }
  })

  return new Response(null, { status: res.status })
}
