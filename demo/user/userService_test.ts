import { assertEquals } from "@std/assert";
import { getFakeInjector } from "../../src/wiretree.ts";

import { User } from "../db.ts";
import {
  addUser as addUserFactory,
  getUsers as getUsersFactory,
} from "./userService.ts";

Deno.test(function addUsertTest() {
  const db = { users: [] as User[], posts: [] };

  const injector = getFakeInjector({
    db,
    ".getUserByEmail": (email: string) => {
      return db.users.find((user) => user.email === email);
    },
  });

  const getUsers = getUsersFactory.bind(injector);
  let users = getUsers();
  assertEquals(users.length, 0);

  const addUser = addUserFactory.bind(injector);
  addUser("jacobo", "jacobo@asdfasdf.com", true);
  users = getUsers();
  assertEquals(users.length, 1);
});
