"use client";
import { useActionState } from "react"
import { createPost, deletePost } from "./actions"

interface GuestbookItem {
  id: number;
  slug: string;
  title: string;
  content: string;
  author_email?: string; // DB colomn name : author_email
}

export default function GuestbookClient({
  isLoggedIn,
  userEmail,
  posts
}: {
  isLoggedIn: boolean,
  userEmail: string,
  posts: GuestbookItem[]
}) {
  const [state, formAction, isPending] = useActionState(createPost, null)

  return (
    <>
      {isLoggedIn? (
        <form action={formAction} className="flex flex-col gap-2 my-6">
          <input name="title" placeholder="제목/Title" className="border p-2 rounded" required />
          <textarea name="content" placeholder="내용/Content" className="border p-2 rounded" required />
          <button disabled={isPending} type="submit" className="bg-black text-white p-2 rounded">
            {isPending? '저장중/Submitting...' : '등록하기/Submit'}
          </button>
        </form>
      ) : (
        <p className="my-6 text-gray-500">글을 쓰려면 로그인이 필요해요 / Login is required to write posts.</p>
      )}

      <ul className="flex flex-col gap-3 mt-8">
        {posts.map((post) => (
          <li key={post.id?? post.slug} className="border p-4 rounded flex justify-between items-start">
            <div>
              <strong className="text-sm whitespace-pre-wrap">{post.title}</strong>
              <p className="text-sm text-gray-600 whitespace-pre-wrap">{post.content}</p>
              <p className="text-xs text-gray-400">{post.author_email}</p>
            </div>

            {post.author_email === userEmail && (
              <button
                onClick={async () => {
                  if (!confirm("삭제할까요? / Are you sure you want to delete this post?")) return;
                  await deletePost(post.id)
                }}
                className="bg-red-500 text-white px-2 py-1 rounded text-xs ml-4 shrink-0"
              >
                삭제/Delete
              </button>
            )}
          </li>
        ))}
      </ul>
    </>
  )
}