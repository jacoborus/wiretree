import { assertEquals } from "@std/assert";
import { getFakeInjector, bindThis } from "../../src/testing_util.ts";
import { db as database } from "../db.ts";
import type { InjectFrom } from "../../src/wiretree.ts";
import type { Defs } from "../app/app.ts";

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
  }) as InjectFrom<Defs, "@post">;

  const addPost = bindThis(addPostFactory, injector);
  const getPost = bindThis(getPostFactory, injector);
  const postId = addPost("titulo", "contenido", "11234");
  const post = getPost(postId);
  assertEquals(post?.id, postId);
});
