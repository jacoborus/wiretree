import { db } from "../db.ts";
import { postService } from "../post/postService.ts";
import { userService } from "../user/userService.ts";
import { createApp, defValue } from "../../wiretree.ts";

const defs = {
  db: defValue(db),
  valor: defValue(5),
  test: defValue(() => "testtttt"),
  ...userService,
  ...postService,
};

export type Defs = typeof defs;

export const app = createApp(defs);

console.log(app("valor"));
console.log(app("test")());
const addUser = app("@user.addUser");
const userId = addUser("jacobo", "jacobo@example.com", true);
console.log(app("@user.getUsers")());
const addPost = app("@post.addPost");
const postId = addPost("Hello World", "This is a test post", userId);
addPost("Hola Mundo!", "Esto es una entrada de prueba", userId);
const thePost = app("@post.getPost")(postId);
console.log(thePost);
console.log(app("@post.getPosts")());
