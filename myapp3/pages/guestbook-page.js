import { useEffect, useState } from "react";

export default function GuestbookPage() {

  // 상태(State) 정의
  // Define state
  const [posts, setPosts] = useState([]);
  const [name, setName] = useState("");
  const [content, setContent] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  // Pages Router API에서 데이터 가져오기 (GET)
  // Fetch data from the Pages Router API (GET)
  const fetchPosts = async () => {
    try {
      // 방금 만든 "pages/api/guestbook" 주소
      // The address of the newly created "pages/api/guestbook"
      const response = await fetch("/api/guestbook"); 
      if (!response.ok) throw new Error("데이터 수신 실패 / Failed to receive data.");
      const data = await response.json();
      setPosts(data);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, []);

  // 새 방명록 등록하기 (POST) 
  // Register a new guestbook entry
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!name.trim() || !content.trim()) {
      alert("이름과 내용을 입력해 주세요. / Please enter both name and content.");
      return;
    }

    try {
      const response = await fetch("/api/guestbook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, content }),
      });

      if (response.ok) {
        setName("");
        setContent("");
        fetchPosts(); // 등록 후 목록 새로고침 / Refresh the list after registration
      } else {
        alert("등록 실패");
      }
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div style={{ padding: "40px", maxWidth: "600px", margin: "0 auto", fontFamily: "sans-serif" }}>
      <h1>📓 방명록 / Guestbook (Page Router)</h1>

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
          style={{ padding: "8px", border: "1px solid #ccc", borderRadius: "4px", minHeight: "60px" }}
        />
        <button type="submit" style={{ padding: "10px", backgroundColor: "#40d080", color: "white", border: "none", borderRadius: "4px", cursor: "pointer" }}>
          등록하기/Submit
        </button>
      </form>

      <hr style={{ margin: "30px 0", border: "0", borderTop: "1px solid #eee" }} />

      <h2 >최근 방명록 목록 / Recent Guestbook Entries</h2>
      {isLoading ? (
        <p>로딩 중 / Loading...</p>
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

