import { assertEquals } from "@std/assert";
import { mockInjection, wireApp } from "../../src/wiremap.ts";

import type { User, Post } from "../db.ts";
import { addPost, getPost } from "./postService.ts";

Deno.test(function addPostTest() {
  wireApp({});
  const db = { user: [] as User[], posts: [] as Post[] };
  const fakeUnits = {
    db,
    "@user.service.getUser": (id: string) => ({
      id,
      name: "jacobo",
      email: "asdfasdf@qfasdfasd.asdf",
      isAdmin: true,
    }),
  };

  const addPostInstance = mockInjection(addPost, fakeUnits);
  const getPostInstance = mockInjection(getPost, fakeUnits);

  const postId = addPostInstance("titulo", "contenido", "11234");
  const post = getPostInstance(postId);

  if (!post) throw new Error("Post not found");

  assertEquals(post.id, postId);
  assertEquals(post.title, "titulo");
  assertEquals(post.content, "contenido");
});
