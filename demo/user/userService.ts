import { tagBlock } from "../../src/wiremap.ts";
import type { Defs } from "../app/app.ts";

export const $ = tagBlock("user.service");

const wire = $<Defs>();

export function getUsers() {
  const db = wire().db;
  return db.users;
}

/**
 * Get an user by id
 *
 * @param id - Id of the user
 * @returns  a user or undefined
 *
 * ```ts
 * const user = getUser('1234')
 * ```
 */
export function getUser(id: string) {
  const db = wire().db;
  return db.users.find((user) => user.id === id);
}

export function getUserByEmail(email: string) {
  const db = wire().db;
  return db.users.find((user) => user.email === email);
}

export function addUser(name: string, email: string, isAdmin = false) {
  const getUserByEmail = wire(".").getUserByEmail;
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
  const db = wire().db;
  db.users.push(user);
  return user.id;
}
