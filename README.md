# Wiretree

**Wiretree** is a TypeScript-based compositional dependency injection framework
that enables you to build scalable, maintainable and testable applications.

Wiretree apps are structured in units and blocks. Blocks do not contain units,
instead, they represent units that share the same namespace. 

Example:

```ts
import { db } from "../db.ts";
import { createApp, defValue } from "wiretree";
import { postService } from "../post/postService.ts";
import { userService } from "../user/userService.ts";

const defs = {
  db: defValue(db),
  ...userService,
  ...postService,
};

export type Defs = typeof defs;

const app = createApp(defs);

const addUser = app("@user.addUser");
addUser("John", "doe@example.com");
```

```ts
import { createBlock, defBinded, type InjectFrom } from "wiretree";
import type { Defs } from "../app/app.ts";

type I = InjectFrom<Defs, "@user">;

export function getUser(this: I, id: string) {
  const db = this("db");
  return db.users.find((user) => user.id === id);
}

export function addUser(this: I, name: string, email: string, isAdmin = false) {
  const user = {
    id: crypto.randomUUID(),
    name,
    email,
    isAdmin,
  };
  this("db").users.push(user);
  return user.id;
}

export const userService = createBlock("@user", {
  getUser: defBinded(getUser),
  addUser: defBinded(addUser),
});
```

```ts
import { createBlock, defBinded, defFactory, type InjectFrom } from "wiretree";
import type { Defs } from "../app/app.ts";

type I = InjectFrom<Defs, "@post">;

export function addPost(
  this: I,
  title: string,
  content: string,
  userId: string,
) {
  const getUser = this("@user.getUser");
  const user = getUser(userId);
  if (!user) throw new Error(`User with id ${userId} does not exist.`);

  const db = this("db");
  const id = crypto.randomUUID();
  db.posts.push({ id, title, userId, content });
  return id;
}

export function getPost(this: I) {
  const db = this("db");
  return (id: string) => db.posts.find((post) => post.id === id);
}

export const postService = createBlock("@post", {
  addPost: defBinded(addPost),
  getPost: defFactory(getPost),
});
```
