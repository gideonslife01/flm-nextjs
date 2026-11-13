// lib/db/adapter.ts
import type { UserDbAdapter } from './userdbAdapter';

type Visibility = 'public' | 'private' | 'unlisted' | 'direct' | 'followers-only' | 'custom';

// 리스트용 / For the list
export type Post = {
  id: string;
  content: string;
  username: string;
  visibility: Visibility;
  created_at: number;
  in_reply_to_id?: string | null;
  in_reply_to_username?: string | null;
  in_reply_to_account_id?: string | null;
};

// 글쓰기용 / For writing purposes
export type NewPost = {
  content: string;
  username: string;
  visibility?: Visibility;
  in_reply_to_id?: string | null;
  in_reply_to_username?: string | null;
  in_reply_to_account_id?: string | null;
};

// 글 수정/ For editing purposes
export type EditPost = NewPost & {
  id: string;
};

export interface DbAdapter extends UserDbAdapter {
  init(): Promise<void>;                         // 데이터베이스 초기화 / Initialize the database
  createPost(data: NewPost): Promise<Post>;      // 글 작성 / Write a post
  getPostById(id: string): Promise<Post | null>; // 글 조회 / View Post
  deletePostById(id: string): Promise<boolean>;  // 글 삭제 / Delete Post
  editPost(data: EditPost): Promise<Post>;       // 글 수정 / Edit Post
}