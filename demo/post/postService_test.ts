import { assertEquals } from "@std/assert";
import { getFakeInjector } from "../../wiretree.ts";
import { db as database } from "../db.ts";

import {
  addPost as addPostFactory,
  getPost as getPostFactory,
} from "./postService.ts";

Deno.test(function addPostTest() {
  const db = database;

  const injector = getFakeInjector({
    db,
    "@user.getUseir": (id: string) => ({
      id,
      name: "jacobo",
      email: "asdfasdf@qfasdfasd.asdf",
      isAdmin: true,
    }),
    valor: 5,
  });

  const addPost = addPostFactory.bind(injector);
  const getPost = getPostFactory.bind(injector);
  const postId = addPost("titulo", "contenido", "11234");
  const post = getPost(postId);
  assertEquals(post?.id, postId);
});
