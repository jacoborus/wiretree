import { db } from "../db.ts";
import postMod from "../post/postMod.ts";
import userMod from "../user/userMod.ts";
import { createApp } from "../../src/wiretree.ts";

const defs = {
  db,
  valor: 5,
  printValor: () => {
    console.log(app("#").valor);
  },
  test: () => "testtttt",
  ...userMod,
  ...postMod,
} as const;

export type Defs = typeof defs;
console.log(defs);

export const app = createApp(defs);
console.log(app("#").valor);
app("#").printValor();
console.log(app("#").test());

const addUser = app("@user.service").addUser;
const userId = addUser("jacobo", "jacobo@example.com", true);
console.log(app("@user.service").getUsers());
const addPost = app("@post.service").addPost;
const postId = addPost("Hello World", "This is a test post", userId);
addPost("Hola Mundo!", "Esto es una entrada de prueba", userId);
const thePost = app("@post.service").getPost(postId);
console.log(thePost);
console.log(app("@post.service").getPosts());
