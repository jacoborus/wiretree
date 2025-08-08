export interface User {
  id: string;
  name: string;
  email: string;
  isAdmin: boolean;
}

export interface Post {
  id: string;
  userId: string;
  title: string;
  content: string;
}

export interface Database {
  users: User[];
  posts: Post[];
}

export const db = {
  users: [],
  posts: [],
} as Database;
