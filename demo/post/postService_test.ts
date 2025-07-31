import { assertEquals } from "@std/assert";
import { mockUnit } from "../../src/wiretree.ts";

import type { User, Post } from "../db.ts";
import {
  addPost as addPostFactory,
  getPost as getPostFactory,
} from "./postService.ts";

Deno.test(function addPostTest() {
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

  const addPost = mockUnit(addPostFactory, fakeUnits, "@post.service");
  const getPost = mockUnit(getPostFactory, fakeUnits, "@post.service");

  const postId = addPost("titulo", "contenido", "11234");
  const post = getPost(postId);

  if (!post) throw new Error("Post not found");

  assertEquals(post.id, postId);
  assertEquals(post.title, "titulo");
  assertEquals(post.content, "contenido");
});
