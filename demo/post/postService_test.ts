import { assertEquals } from "@std/assert";
import { getFakeInjector } from "../../src/wiretree.ts";
import { db as database } from "../db.ts";

import {
  addPost as addPostFactory,
  getPost as getPostFactory,
} from "./postService.ts";

Deno.test(function addPostTest() {
  const db = database;

  const injector = getFakeInjector({
    db,
    "@user.getUser": (id: string) => ({
      id,
      name: "jacobo",
      email: "asdfasdf@qfasdfasd.asdf",
      isAdmin: true,
    }),
  });

  const addPost = addPostFactory.bind(injector);
  const getPost = getPostFactory.bind(injector);
  const postId = addPost("titulo", "contenido", "11234");
  const post = getPost(postId);
  assertEquals(post?.id, postId);
});
