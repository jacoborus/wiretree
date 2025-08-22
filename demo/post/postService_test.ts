import { assertEquals } from "@std/assert";

import { $, addPost, getPost } from "./postService.ts";

Deno.test(function addPostTest() {
  $.feed({
    "": { db: { users: [], posts: [] } },
    "user.service": {
      getUser: (id: string) => ({
        id,
        name: "jacobo",
        email: "asdfasdf@qfasdfasd.asdf",
        isAdmin: true,
      }),
    },
  });

  const postId = addPost("titulo", "contenido", "11234");
  const post = getPost(postId);

  if (!post) throw new Error("Post not found");

  assertEquals(post.id, postId);
  assertEquals(post.title, "titulo");
  assertEquals(post.content, "contenido");
  assertEquals(post.userId, "11234");
});
