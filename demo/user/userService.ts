import { createInjector } from "../../src/wiremap.ts";
import type { Defs } from "../app/app.ts";

const inj = createInjector<Defs>()("user.service");

export function getUsers() {
  const db = inj().db;
  return db.users;
}

export function getUser(id: string) {
  const db = inj().db;
  return db.users.find((user) => user.id === id);
}

export function getUserByEmail(email: string) {
  const db = inj().db;
  return db.users.find((user) => user.email === email);
}

export function addUser(name: string, email: string, isAdmin = false) {
  const getUserByEmail = inj(".").getUserByEmail;
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
  const db = inj().db;
  db.users.push(user);
  return user.id;
}
