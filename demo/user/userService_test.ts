import { assertEquals } from "@std/assert";
import { mockUnit } from "../../src/wiretree.ts";

import type { User, Post } from "../db.ts";
import {
  addUser as addUserFactory,
  getUsers as getUsersFactory,
} from "./userService.ts";

Deno.test(function addUsertTest() {
  const db = { users: [] as User[], posts: [] as Post[] };

  const fakeUnits = {
    db,
    "@user.service.getUserByEmail": (email: string) => {
      return db.users.find((user) => user.email === email);
    },
  };

  const getUsers = mockUnit(getUsersFactory, fakeUnits, "@user.service");
  let users = getUsers();
  assertEquals(users.length, 0);

  const addUser = mockUnit(addUserFactory, fakeUnits, "@user.service");
  addUser("john", "john@example.com", true);

  users = getUsers();
  assertEquals(users.length, 1);
});
