import { assertEquals } from "@std/assert";
import { getFakeInjector, bindThis } from "../../src/testing_util.ts";

import type { User, Post } from "../db.ts";
import {
  addUser as addUserFactory,
  getUsers as getUsersFactory,
} from "./userService.ts";

Deno.test(function addUsertTest() {
  const db = { users: [] as User[], posts: [] as Post[] };

  const injector = getFakeInjector({
    db,
    ".getUserByEmail": (email: string) => {
      return db.users.find((user) => user.email === email);
    },
  }) as any;

  const getUsers = bindThis(getUsersFactory, injector);
  let users = getUsers();
  assertEquals(users.length, 0);

  const addUser = bindThis(addUserFactory, injector);
  addUser("john", "john@example.com", true);
  users = getUsers();
  assertEquals(users.length, 1);
});
