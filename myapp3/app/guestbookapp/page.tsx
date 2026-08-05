"use client";

import { useEffect, useState } from "react";

// 방명록 데이터의 타입 정의
// Define the type for guestbook data
interface GuestbookItem {
  id: number;
  name: string;
  content: string;
}

export default function GuestbookPage() {
  
  // 상태(State) 정의
  // Define state
  const [posts, setPosts] = useState<GuestbookItem[]>([]);
  const [name, setName] = useState("");
  const [content, setContent] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  // API에서 방명록 목록 가져오는 함수 (GET)
  // Function to fetch guestbook entries from the API (GET)
  const fetchPosts = async () => {
    try {
      const response = await fetch("/api/guestbookapp");
      if (!response.ok) throw new Error("데이터를 가져오는데 실패했습니다. / Failed to fetch data.");
      const data = await response.json();
      setPosts(data);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  // 페이지가 처음 켜질 때 API 호출하기
  // Call the API when the page first loads
  useEffect(() => {
    fetchPosts();
  }, []);

  // 새 방명록 등록하는 함수 (POST)
  // Function to register a new guestbook entry (POST)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); // 새로고침 방지 / Prevent page refresh

    if (!name.trim() || !content.trim()) {
      alert("이름과 내용을 모두 입력해 주세요./Please enter both name and content.");
      return;
    }

    try {
      const response = await fetch("/api/guestbookapp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, content }),
      });

      if (response.ok) {
        // 등록 성공 시 입력창을 비우고 목록 새로고침
        // If registration is successful, clear the input fields and refresh the list
        setName("");
        setContent("");
        fetchPosts();
      } else {
        alert("등록에 실패했습니다./Failed to register the entry.");
      }
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div className="p-10 max-w-[600px] mx-auto font-sans">
      <h1 className="text-3xl font-bold">📓 방명록 / Guestbook (App Router)</h1>

      {/* 방명록 입력 폼 / Guestbook Entry Form */}
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "10px", margin: "20px 0" }}>
        <input
          type="text"
          placeholder="이름/Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          style={{ padding: "8px", border: "1px solid #ccc", borderRadius: "4px" }}
        />
        <textarea
          placeholder="내용을 입력하세요/Please enter your message"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          style={{ padding: "8px", border: "1px solid #ccc", borderRadius: "4px", minHeight: "8px" }}
        />
        <button type="submit" style={{ padding: "10px", backgroundColor: "#dcd809", color: "white", border: "none", borderRadius: "4px", cursor: "pointer" }}>
          등록하기/Submit
        </button>
      </form>

      <hr style={{ margin: "30px 0", border: "0", borderTop: "1px solid #eee" }} />

      {/* 방명록 목록 출력 / Guestbook Entry List */}
      <h2 className="text-2xl font-bold text-gray-800">최근 방명록 목록 / Recent Guestbook Entries</h2>
      {isLoading ? (
        <p>로딩 중/Loading...</p>
      ) : posts.length === 0 ? (
        <p>작성된 방명록이 없습니다. 첫 글을 남겨보세요! / There are no guestbook entries yet. Be the first to leave a message!</p>
      ) : (
        <ul style={{ listStyle: "none", padding: 0 }}>
          {posts.map((post) => (
            <li key={post.id} style={{ borderBottom: "1px solid #eee", padding: "15px 0" }}>
              <strong>{post.name}</strong>
              <p style={{ margin: "5px 0 0 0", color: "#555" }}>{post.content}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

