import { getInjector } from "../../src/wiretree.ts";
import type { Defs } from "../app/app.ts";

const inj = getInjector<Defs>()("@post.service");

export function getPosts() {
  const collection = inj(".collection");
  return collection.slice();
}

export function getPost(id: string) {
  const db = inj("db");
  return db.posts.find((post) => post.id === id);
}

export function addPost(title: string, content: string, userId: string) {
  const getUser = inj("@user.service.getUser");
  const user = getUser(userId);
  if (!user) throw new Error(`User with id ${userId} does not exist.`);

  const db = inj("db");
  const id = crypto.randomUUID();
  db.posts.push({ id, title, userId, content });
  return id;
}

export function collection() {
  const db = inj("db");
  return db.posts;
}
collection.factory = true as const;
