export type User = {
  id: string;
  name: string;
  email: string;
};

export type NewUser = User;

export interface DbAdapter {
  init(): Promise<void>;
  close(): Promise<void>;
  createUser(data: NewUser): Promise<User>;
  getUserById(id: string): Promise<User | null>;
  getUserByName(name: string): Promise<User | null>;
  listUsers(): Promise<User[]>;
  deleteUser(id: string): Promise<void>;
}