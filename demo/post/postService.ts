import {
  createBlock,
  defBinded,
  defFactory,
  type InjectFrom,
} from "../../wiretree.ts";
import type { Defs } from "../app/app.ts";

type I = InjectFrom<Defs, "@post">;

export function getPosts(this: I) {
  const collection = this(".collection");
  return collection.slice();
}

export function getPost(this: I, id: string) {
  const db = this("db");
  return db.posts.find((post) => post.id === id);
}

export function addPost(
  this: I,
  title: string,
  content: string,
  userId: string,
) {
  const getUser = this("@user.getUser");
  const db = this("db");
  const user = getUser(userId);
  if (!user) throw new Error(`User with id ${userId} does not exist.`);
  const id = crypto.randomUUID();
  db.posts.push({ id, title, userId, content });
  return id;
}

function collection(inject: I) {
  const db = inject("db");
  return db.posts;
}

export const postService = createBlock("@post", {
  getPosts: defBinded(getPosts),
  getPost: defBinded(getPost),
  addPost: defBinded(addPost),
  collection: defFactory(collection),
});
