import { assertEquals } from "@std/assert";

import { $, addUser, getUsers } from "./userService.ts";
import type { Database } from "../db.ts";

Deno.test(function addUsertTest() {
  const db: Database = { users: [], posts: [] };
  $.feed({
    "": {
      db,
    },
    "user.service": {
      getUserByEmail: (email: string) => {
        return db.users.find((user) => user.email === email);
      },
    },
  });

  let users = getUsers();
  assertEquals(users.length, 0);

  addUser("john", "john@example.com", true);

  users = getUsers();
  assertEquals(users.length, 1);
});
