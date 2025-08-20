import { db } from "../db.ts";
import * as postMod from "../post/postMod.ts";
import * as userMod from "../user/userMod.ts";
import { wireUp, type InferBlocks } from "../../src/wiremap.ts";

const defs = {
  db,
  valor: 5,
  printValor: () => {
    console.log(app().valor);
  },
  test: () => "testtttt",
  user: userMod,
  post: postMod,
} as const;

export type Defs = InferBlocks<typeof defs>;

export const app = await wireUp(defs);

app().printValor();

const addUser = app("user.service").addUser;

const userId = addUser("jacobo", "jacobo@example.com", true);
console.log("users:", app("user.service").getUsers());

const addPost = app("post.service").addPost;

addPost("Hello World", "This is a test post", userId);
addPost("Hola Mundo!", "Esto es una entrada de prueba", userId);

console.log(app("post.service").getPosts());
