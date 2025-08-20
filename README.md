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
import { wireUp, tagBlock } from "wiremap";

// userMod.ts - Create a block by exporting $ and individual units
export const $ = tagBlock("user");
export const addUser = (name: string, email: string) => ({ name, email, id: Math.random() });
export const getUsers = () => [];

// app.ts - Wire your application
import * as userMod from "./userMod.ts";

const defs = {
  config: { port: 3000, host: "localhost" },
  user: userMod,
};

const app = await wireUp(defs);

// Access units at root level
const root = app();
console.log(`Server: ${root.config.host}:${root.config.port}`);

// Access units inside a block
const userService = app("user");
userService.addUser("John", "john@example.com");
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

To be able to resolve async factory functions or the ones that return a promise,
add the flag `isAsync`:

```ts
export function doSomething() {
  // does something
}
doSomething.isFactory = true as const;
doSomething.isAsync = true as const;
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

Blocks are groups of units and other blocks. To create a block:

1. Export a `$` variable using `tagBlock("blockName")` from your module
2. Export your units as individual exports (not in objects)
3. Import and use the module in your `wireUp` call

```ts
// userMod.ts
import { tagBlock } from "wiremap";

export const $ = tagBlock("user");
export const addUser = (name: string, email: string) => ({ name, email, id: Math.random() });
export const getUsers = () => [];
export const deleteUser = (id: string) => { /* delete logic */ };

// Nested blocks - blocks can contain other blocks
// authMod.ts  
export const $ = tagBlock("user.auth");
export const login = (credentials: any) => { /* auth logic */ };
export const logout = () => { /* logout logic */ };
```

The block name in `tagBlock()` must match the path used when accessing it via the wire function.

### App

To wire an app, pass an object containing all your units and imported block modules to `wireUp`.

If any unit is an async factory, `wireUp` will return a Promise.

```ts
import { wireUp, type InferBlocks } from "wiremap";
import * as userMod from "./userMod.ts";
import * as postMod from "./postMod.ts";

const defs = {
  config: { port: 3000 },
  user: userMod,
  post: postMod,
};

export type Defs = InferBlocks<typeof defs>;

const app = await wireUp(defs);

const root = app();
console.log(`App running on port ${root.config.port}`);

const userService = app("user.service");
userService.addUser("John", "john@example.com");
```

### Wire Functions

The `wireUp` function returns a strongly typed wire function that lets you access your units.

You can use the wire function in three main ways:

- **Root access**: Call with no arguments `app()` to access top-level units
- **Local access**: Call with `"."` to access units from the same block (when used within a block context)
- **Block access**: Call with block path `"user.service"` to access units from specific blocks

Example:

```ts
const app = await wireUp(defs);

// Access root-level units
const config = app().config;

// Access units from specific blocks
const userService = app("user.service");
const postService = app("post.service");

// Type inference works automatically
userService.addUser("name", "email"); // fully typed
```

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
