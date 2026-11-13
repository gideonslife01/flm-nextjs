// lib/db/adapter.ts

// 리스트용 / For the list
export type Post = {
  id: string;
  content: string;
  username: string;
  visibility: string;
  created_at: number;
  in_reply_to_id?: string | null;
  in_reply_to_username?: string | null;
  in_reply_to_account_id?: string | null;
};

// 글쓰기용 / For writing purposes
export type NewPost = {
  content: string;
  username: string;
  visibility?: string;
  in_reply_to_id?: string | null;
  in_reply_to_username?: string | null;
  in_reply_to_account_id?: string | null;
};

export interface DbAdapter {
  init(): Promise<void>;                         // 데이터베이스 초기화 / Initialize the database
  createPost(data: NewPost): Promise<Post>;      // 글 작성 / Write a post
  getPostById(id: string): Promise<Post | null>; // 글 조회 / View Post
}