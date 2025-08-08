import { assertEquals } from "@std/assert";
import { mockInjection, wireApp } from "../../src/wiremap.ts";

import type { User, Post } from "../db.ts";
import {
  addUser as addUserFactory,
  getUsers as getUsersFactory,
} from "./userService.ts";

Deno.test(function addUsertTest() {
  wireApp({});
  const db = { users: [] as User[], posts: [] as Post[] };

  const fakeUnits = {
    db,
    "@user.service.getUserByEmail": (email: string) => {
      return db.users.find((user) => user.email === email);
    },
  };

  const getUsers = mockInjection(getUsersFactory, fakeUnits);
  let users = getUsers();
  assertEquals(users.length, 0);

  const addUser = mockInjection(addUserFactory, fakeUnits);
  addUser("john", "john@example.com", true);

  users = getUsers();
  assertEquals(users.length, 1);
});
