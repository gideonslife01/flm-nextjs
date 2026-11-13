// lib/db/userdbAdapter.ts

export type NewUser = {
  username: string;
  displayName?: string;
  email: string;
  passwordHash: string;
  publicKey?: string;
};

export type byEmail = {
    email: string;
}

export type byUsername = {
    username: string;
}

export interface UserDbAdapter {
  initUser(): Promise<void>;                                       // 데이터베이스 초기화 / Initialize the database
  getUserByUsername(username: string): Promise<byUsername | null>; // username 검색 / Search username
  getUserByEmail(email: string): Promise<byEmail | null>;          // 이메일 검색 / Search email
  createUser(data: NewUser): Promise<any>;                         // 회원가입 / Signup
}