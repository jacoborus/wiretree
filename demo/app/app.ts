import { db } from "../db.ts";
import postMod from "../post/postMod.ts";
import userMod from "../user/userMod.ts";
import { wireApp } from "../../src/wiremap.ts";

const defs = {
  db,
  valor: 5,
  printValor: () => {
    console.log(appInjector().valor);
  },
  test: () => "testtttt",
  ...userMod,
  ...postMod,
} as const;

export type Defs = typeof defs;

export const appInjector = await wireApp(defs);

appInjector().printValor();

const addUser = appInjector("user.service").addUser;

const userId = addUser("jacobo", "jacobo@example.com", true);
console.log("users:", appInjector("user.service").getUsers());

const addPost = appInjector("post.service").addPost;

addPost("Hello World", "This is a test post", userId);
addPost("Hola Mundo!", "Esto es una entrada de prueba", userId);

console.log(appInjector("post.service").getPosts());
