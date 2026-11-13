"use client";

import { useEffect, useState } from "react";

// 방명록 데이터의 타입 정의
// Define the type for guestbook data
interface GuestbookItem {
  id: number;
  title: string;
  slug: string;
  content: string;
}

export default function GuestbookPage() {
  
  // 상태(State) 정의
  // Define state
  const [posts, setPosts] = useState<GuestbookItem[]>([]);
  const [title, setTitle] = useState("");
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

    if (!title.trim() || !content.trim()) {
      alert("제목과 내용을 모두 입력해 주세요./Please enter both title and content.");
      return;
    }

    try {
      const response = await fetch("/api/guestbookapp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, content }),
      });

      if (response.ok) {
        setTitle("");
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
      <h1 className="text-2xl font-bold">📓 마크다운 방명록 / Markdown Guestbook (App Router)</h1>

      {/* 방명록 입력 폼 / Guestbook Entry Form */}
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "10px", margin: "20px 0" }}>
        <input
          type="text"
          placeholder="제목/Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
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
            <li 
              key={post.slug} 
              style={{ 
                border: "1px solid #f0f0f0", 
                borderRadius: "8px", 
                padding: "20px",
                backgroundColor: "#fff",
                boxShadow: "0 2px 4px rgba(0,0,0,0.02)"
              }}
            >
              {/* 파일 이름을 가독성 좋은 제목 형태로 변환 (대문자화 및 하이픈 제거) */}
              <strong className="text-xl text-gray-900 block capitalize mb-2">
                {post.slug.replace(/-/g, " ")}
              </strong>
              
              {/* 마크다운 원본 텍스트 내용 일부 출력 */}
              <div 
                style={{ 
                  margin: "10px 0 0 0", 
                  color: "#555", 
                  whiteSpace: "pre-wrap",
                  fontSize: "14px",
                  lineHeight: "1.6",
                  backgroundColor: "#fafafa",
                  padding: "12px",
                  borderRadius: "6px"
                }}
              >
                {post.content}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

