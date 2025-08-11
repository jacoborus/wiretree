# Wiremap

**Wiremap** is a lightweight, type-safe dependency injection framework for
TypeScript that favors composition over inheritance. Build scalable,
maintainable, and testable applications with intuitive and powerful dependency
management.

---

⚠️ **PRE-RELEASE SOFTWARE**

This is an alpha version under active development. The API is subject to change.

---

## ✨ Features

- **🔒 Type-Safe**: Full TypeScript support without manual type annotations
- **🧱 Compositional**: Compose complex applications from small, reusable units
- **♻️ Circular Dependency-Free**: Designed to eliminate circular dependencies
- **🤯 No decorators, no classes**, no gorillas, no jungles. Just the bananas
- **🌲 Hierarchical**: Organize dependencies using namespaces and blocks
- **🧪 Testable**: Built-in utilities for easy mocking and isolated testing
- **🪶 Lightweight**: Minimal runtime overhead with smart, built-in caching
- **🔌 Zero Configuration**: Just install and import, no setup needed
- **🔨 Simple API**: So simple, it hurts

## 📦 Installation

```bash
# choose your poison
npm install wiremap
pnpm add wiremap
deno add jsr:@jacobo/wiremap
bun add wiremap
```

## 🚀 Basic Example

```ts
import { createBlock, wireApp } from "./src/wiremap.ts";

// Define your units
const units = {
  config: { port: 3000, host: "localhost" },
  ...createBlock("database", {
    connection: () => ({ url: "mongodb://localhost" }),
    users: [] as User[],
  }),
};

// Wire the application
const app = wireApp(units);

// Access units at root level
const root = app();
console.log(`Server: ${root.config.host}:${root.config.port}`);

// Access units inside a block
const db = app("database");
console.log("DB URL:", db.connection.url);
```

## 📚 Core Concepts

Wiremap applications are composed of **units** organized into **hierarchical
blocks**.

### Units

Units can be any kind of value and can be injected individually or via block
proxies into other units. They're resolved and cached on demand.

A unit can be:

- A plain value
- The result of a factory function

To declare a function as a factory, add the `isFactory` flag:

```ts
export function doSomething() {
  // does something
}
doSomething.isFactory = true as const;
```

To be able to resolve async factory functions or the ones that return a promise
add the flag `isAsync`:

```ts
export function doSomething() {
  // does something
}
doSomething.isFactory = true as const;
doSomething.isFactory = true as const;
```

Example:

```ts
// plain value
export const config = {
  port: 3000,
};

// plain function
export function ping() {
  return "pong";
}

// plain function with injection
export async function addPost(entry: Entry) {
  const authorize = inject("auth.service").authorize;
  const postRepo = inject(".").repo;
  await authorize(entry.author);
  await postRepo.insert(entry);
}

// factory function
export function queryUser() {
  const db = getDbConnector();

  return function (id: string) {
    return db.users.find(id);
  };
}
queryUser.isFactory = true as const;
```

### Blocks

Blocks are groups of units and other blocks. Use createBlock to create one, then
compose it into other blocks or your app’s root definition by destructuring its
result.

```ts
// userModule.ts
import { createBlock } from "wiremap";

import * as userService from "./userService";
import * as userRepo from "./userRepo";

export default createBlock("userModule", {
  ...createBlock("service", userService),
  ...createBlock("repo", userRepo),
});
```

### App

To wire an app, pass an object containing all your units and blocks to
`wireApp`.

If any unit is an async factory, `wireApp` will return a Promise.

```ts
import { wireApp } from "wiremap";

import userModule from "./userModule";

const units = {
  config: { port: 3000 },
  ...userModule,
};
export type Units = typeof units;

const appInjector = wireApp(units);

const root = appInjector();
console.log(`App running on port ${root.config.port}`);

const userService = appInjector("user.service");
const getUser = userService.getUser;
```

### Injectors

Wiremap injectors are strongly typed functions that let you access your units.

You can use injectors in three main ways:

- Root injector: Access top-level units by passing nothing to `createInjector`
- Local injector: Access units from the same block by passing `"."` to
  `createInjector`
- Scoped Injector: Resolves a block absolutely with full block path
  `"some.block.path"`

Example:

```ts
// userService.ts
import { createInjector } from "wiremap";
import type { Units } from "./app";

const serviceInjector = createInjector<Units>()("userModule.service");

// access units from same block
const getUser = serviceInjector(".").getUser;
// access units from root-level
const configAgain = serviceInjector().config;
// access units from another block
const postArticle = serviceInjector("postModule.service").postArticle;
```

Wiring an app will return the root level injector

## 🧪 Testing

Wiremap includes powerful testing utilities for isolated unit testing:

### Testing Utilities

- **`mockInjection(fn, fakeUnits)`**: Mocks a function with fake dependencies
- **`mockFactory(fn, fakeUnits)`**: Mocks a factory function with fake
  dependencies

```ts
import { mockInjection } from "wiremap";
import type { Post, User } from "../db.ts";
import {
  addUser as addUserUnit,
  getUsers as getUsersUnit,
} from "./userService.ts";

const fakeUnits = {
  "@user.service.getUserByEmail": (email: string) => {
    return db.users.find((user) => user.email === email);
  },
  db: { users: [] as User[], posts: [] as Post[] },
};

const getUsers = mockInjection(getUsersUnit, fakeUnits);
let users = getUsers();
assertEquals(users.length, 0);

const addUser = mockInjection(addUserUnit, fakeUnits);
addUser("John", "john@example.com", true);

users = getUsers();
assertEquals(users.length, 1);
assertEquals(users[0].name, "John");
```

## 🤝 Contributing

Contributions are welcome!

**💬 Questions or Feedback?**\
Open an issue on [GitHub](https://github.com/jacoborus/wiremap/issues)

## 📄 License

MIT © [Jacobo Tabernero Rey](https://github.com/jacoborus)
