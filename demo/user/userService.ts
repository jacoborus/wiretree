import { block, bound, type InjectFrom } from "../../src/wiretree.ts";
import type { Defs } from "../app/app.ts";

type I = InjectFrom<Defs, "@user">;

export const userService = block("@user", {
  getUser: bound(getUser),
  getUserByEmail: bound(getUserByEmail),
  getUsers: bound(getUsers),
  addUser: bound(addUser),
});

export function getUsers(this: I) {
  const db = this("db");
  return db.users;
}

export function getUser(this: I, id: string) {
  const db = this("db");
  return db.users.find((user) => user.id === id);
}

export function getUserByEmail(this: I, email: string) {
  const db = this("db");
  return db.users.find((user) => user.email === email);
}

export function addUser(this: I, name: string, email: string, isAdmin = false) {
  const getUserByEmail = this(".getUserByEmail");
  const existingUser = getUserByEmail(email);
  if (existingUser) {
    throw new Error(`User with email ${email} already exists.`);
  }

  const user = {
    id: crypto.randomUUID(),
    name,
    email,
    isAdmin,
  };
  this("db").users.push(user);
  return user.id;
}
