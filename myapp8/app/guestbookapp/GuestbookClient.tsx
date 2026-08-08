"use client";
import { useEffect, useState } from "react"

// 방명록 아이템 타입 정의(emain 추가)
// Define the type for guestbook items (including email)
interface GuestbookItem {
  id: number;
  slug: string;
  title: string;
  content: string;
  authorEmail?: string;
}

export default function GuestbookClient({ isLoggedIn, userEmail }: { isLoggedIn: boolean, userEmail: string }) {
  const [posts, setPosts] = useState<GuestbookItem[]>([]);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  const fetchPosts = async () => {
    const res = await fetch("/api/guestbookapp");
    const data = await res.json();
    setPosts(data);
  }
  
  useEffect(() => { fetchPosts() }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch("/api/guestbookapp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, content, authorEmail: userEmail }),
    });
    setTitle(""); setContent(""); fetchPosts();
  }

  const handleDelete = async (id: number) => {
    if (!confirm("삭제할까요?/Are you sure you want to delete this post?")) return;
    await fetch(`/api/guestbookapp/${id}`, { method: "DELETE" });
    fetchPosts();
  }

  return (
    <>
      {isLoggedIn ? (
        <form onSubmit={handleSubmit} className="flex flex-col gap-2 my-6">
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder="제목/Title" className="border p-2 rounded" />
          <textarea value={content} onChange={e => setContent(e.target.value)} placeholder="내용/Content" className="border p-2 rounded" />
          <button type="submit" className="bg-black text-white p-2 rounded">등록하기/Submit</button>
        </form>
      ) : (
        <p className="my-6 text-gray-500">글을 쓰려면 로그인이 필요해요.<br />You need to log in to write a post.</p>
      )}

      <ul className="flex flex-col gap-3 mt-8">
        {posts.map((post) => (
          // key를 id가 없으면 slug로 fallback / Use slug as a fallback if id is not available
          <li key={post.id ?? post.slug} className="border p-4 rounded flex justify-between items-start">
            <div>
              <strong  className="text-sm text-gray-600 whitespace-pre-wrap">{post.title}</strong>
              <p className="text-sm text-gray-600 whitespace-pre-wrap">{post.content}</p>
            </div>

            {post.authorEmail === userEmail && (
              <button onClick={() => handleDelete(post.id)} className="bg-red-500 text-white px-2 py-1 rounded text-xs ml-4 shrink-0">
                삭제/Delete
              </button>
            )}
          </li>
        ))}
      </ul>
    </>
  )
}