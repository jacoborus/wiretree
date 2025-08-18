import { tagBlock } from "../../src/wiremap.ts";
import type { Defs } from "../app/app.ts";

export const $ = tagBlock("post.service");

const wire = $<Defs>();

export function getPosts() {
  const collection = wire(".").collection;
  return collection.slice();
}

export function getPost(id: string) {
  const db = wire().db;
  return db.posts.find((post) => post.id === id);
}

export function addPost(title: string, content: string, userId: string) {
  const getUser = wire("user.service").getUser;
  const user = getUser(userId);
  if (!user) throw new Error(`User with id ${userId} does not exist.`);

  const db = wire().db;
  const id = crypto.randomUUID();
  db.posts.push({ id, title, userId, content });
  return id;
}

export function collection() {
  const db = wire().db;
  return new Promise<typeof db.posts>((resolve) => {
    resolve(db.posts);
  });
}
collection.isFactory = true as const;
collection.isAsync = true as const;
