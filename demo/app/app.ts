import { db } from "../db.ts";
import postMod from "../post/postMod.ts";
import userMod from "../user/userMod.ts";
import { wireApp } from "../../src/wiretree.ts";

const defs = {
  db,
  valor: 5,
  printValor: () => {
    console.log(appRoot().valor);
  },
  test: () => "testtttt",
  ...userMod,
  ...postMod,
} as const;

export type Defs = typeof defs;
console.log(defs);

export const appRoot = wireApp(defs);
console.log(appRoot().valor);
appRoot().printValor();
console.log(appRoot().test());

const addUser = appRoot("@user.service").addUser;
const userId = addUser("jacobo", "jacobo@example.com", true);
console.log(appRoot("@user.service").getUsers());
const addPost = appRoot("@post.service").addPost;
const postId = addPost("Hello World", "This is a test post", userId);
addPost("Hola Mundo!", "Esto es una entrada de prueba", userId);
const thePost = appRoot("@post.service").getPost(postId);
console.log(thePost);
console.log(appRoot("@post.service").getPosts());
