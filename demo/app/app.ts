import { db } from "../db.ts";
import postMod from "../post/post-mod.ts";
import userMod from "../user/userMod.ts";
import { createApp, plain } from "../../src/wiretree.ts";

const defs = {
  db: plain(db),
  valor: plain(5),
  test: plain(() => "testtttt"),
  ...userMod,
  ...postMod,
};

export type Defs = typeof defs;

export const app = createApp(defs);

console.log(app("valor"));
console.log(app("test")());

const addUser = app("@user.service.addUser");
const userId = addUser("jacobo", "jacobo@example.com", true);
console.log(app("@user.service.getUsers")());
const addPost = app("@post.service.addPost");
const postId = addPost("Hello World", "This is a test post", userId);
addPost("Hola Mundo!", "Esto es una entrada de prueba", userId);
const thePost = app("@post.service.getPost")(postId);
console.log(thePost);
console.log(app("@post.service.getPosts")());
