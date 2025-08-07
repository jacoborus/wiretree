# Wiremap

**Wiremap** is a lightweight, type-safe dependency injection framework for
TypeScript that favours composition over inheritance. Build scalable,
maintainable, and testable applications with intuitive dependency management.

## ✨ Features

- **🔒 Type-Safe**: Full TypeScript support with compile-time dependency
  validation
- **🧱 Compositional**: Build complex applications from simple, reusable units
- **♻️ Without Circular Dependencies**: Eliminates circular dependencies by
  design
- **🤯 No decorators, no classes**, no gorillas, no jungles. Just the bananas
- **🌲 Hierarchical**: Organize dependencies with namespaces and blocks
- **🧪 Testable**: Built-in testing utilities for easy mocking and isolation
- **🪶 Lightweight**: Minimal runtime overhead with smart caching
- **🔌 Zero Configuration**: Just install and import
- **🔨 Simple API**: So simple, it hurts.

## 📦 Installation

```bash
npm install wiremap
```

## 🚀 Quick Start

```ts
import { wireApp } from "wiremap";

// Define your units
const defs = {
  config: { apiUrl: "https://api.example.com" },
  logger: (message: string) => {
    console.log(`[LOG] ${message}`);
  },
  ...userService, // Import from other modules
};

export type Defs = typeof defs;

// Create your application
const app = wireApp(defs);

// Use your dependencies
const config = app().config;
const log = app().logger;

log(`Application started on ${config.apiUrl}`);
```

## 📚 Core Concepts

### Unit Types

#### `factory` - Lazy Singletons

Create instances on-demand with access to other dependencies. Results are
cached.

To declare a function as factory, just add the property `factory` as
`true as const` to it

```ts
const inj = getInjector<Defs>()("@http");

const httpClient = function () {
  const config = inj().config;
  return new HttpClient(config.apiUrl);
};
httpClient.factory = true as const;

const cache = () => new Map();
cache.factory = true as const;
```

### Using Services with getInjector

Use `getInjector` to obtain a namespaced injector that returns proxies for
accessing units:

```ts
// user/userService.ts
import { getInjector } from "wiremap";
import type { Defs } from "../app.ts";

const inj = getInjector<Defs>()("@user.service");

export function getUser(id: string) {
  const db = inj().db;
  return db.users.find((user) => user.id === id);
}

export function addUser(name: string, email: string) {
  // Access other units in the same block with dot notation
  const getUserByEmail = inj(".").getUserByEmail;

  if (getUserByEmail(email)) {
    throw new Error("User already exists");
  }

  const db = inj().db;
  const user = { id: crypto.randomUUID(), name, email };
  db.users.push(user);
  return user.id;
}
```

### Blocks and Namespaces

Organize related units using `createBlock` to create hierarchical namespaces:

```ts
// user/userMod.ts
import { createBlock } from "wiremap";
import * as userService from "./userService.ts";

export default createBlock("@user", {
  ...createBlock("service", userService),
});
```

### Dependency Resolution

Wiremap supports multiple resolution patterns:

```ts
// Absolute resolution - access any unit by full path
const user = app("@user.service").getUser;

// Relative resolution - access units within the same block
const inj = getInjector<Defs>()("@user.service");
const getUserByEmail = inj(".").getUserByEmail; // Resolves to @user.service.getUserByEmail
const db = inj().db; // Resolves to root-level db

// Cross-block resolution
const inj2 = getInjector<Defs>()("@post.service");
const getUser = inj2("@user.service").getUser; // Access user service from post service
```

## 🎯 Complete Example

Here's a practical example showing user and post management:

```ts
// db.ts
export interface User {
  id: string;
  name: string;
  email: string;
  isAdmin: boolean;
}

export interface Post {
  id: string;
  userId: string;
  title: string;
  content: string;
}

export const db = {
  users: [] as User[],
  posts: [] as Post[],
};

// user/userService.ts
import { getInjector } from "wiremap";
import type { Defs } from "../app.ts";

const inj = getInjector<Defs>()("@user.service");

export function getUser(id: string) {
  const db = inj("#").db;
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
    throw new Error(`User with email ${email} already exists`);
  }

  const user = { id: crypto.randomUUID(), name, email, isAdmin };
  inj().db.users.push(user);
  return user.id;
}

export function getUsers() {
  return inj().db.users;
}

// post/postService.ts
import { getInjector } from "wiremap";
import type { Defs } from "../app.ts";

const inj = getInjector<Defs>()("@post.service");

export function addPost(title: string, content: string, userId: string) {
  const getUser = inj("@user.service").getUser;
  const user = getUser(userId);

  if (!user) {
    throw new Error(`User with id ${userId} does not exist`);
  }

  const db = inj().db;
  const post = { id: crypto.randomUUID(), title, content, userId };
  db.posts.push(post);
  return post.id;
}

export function getPost(id: string) {
  const db = inj().db;
  return db.posts.find((post) => post.id === id);
}

export function getPosts() {
  return inj().db.posts;
}

// user/userMod.ts
import { createBlock } from "wiremap";
import * as userService from "./userService.ts";

export default createBlock("@user", {
  ...createBlock("service", userService),
});

// post/postMod.ts
import { createBlock } from "wiremap";
import * as postService from "./postService.ts";

export default createBlock("@post", {
  ...createBlock("service", postService),
});

// app.ts
import { wireApp } from "wiremap";
import { db } from "./db.ts";
import userMod from "./user/userMod.ts";
import postMod from "./post/postMod.ts";

const defs = {
  db,
  ...userMod,
  ...postMod,
};

export type Defs = typeof defs;
export const app = wireApp(defs);

// Usage
const addUser = app("@user.service").addUser;
const userId = addUser("John Doe", "john@example.com");

const addPost = app("@post.service").addPost;
const postId = addPost("Hello World", "This is my first post!", userId);

const posts = app("@post.service").getPosts();
console.log(posts); // [{ id: "...", title: "Hello World", ... }]
```

## 🧪 Testing

Wiremap includes powerful testing utilities for isolated unit testing:

```ts
import { assertEquals } from "@std/assert";
import { mockInjection } from "wiremap";
import type { Post, User } from "../db.ts";
import {
  addUser as addUserUnit,
  getUsers as getUsersUnit,
} from "./userService.ts";

Deno.test("user service - add user", () => {
  const db = { users: [] as User[], posts: [] as Post[] };

  const fakeUnits = {
    db,
    "@user.service.getUserByEmail": (email: string) => {
      return db.users.find((user) => user.email === email);
    },
  };

  const getUsers = mockInjection(getUsersUnit, fakeUnits);
  let users = getUsers();
  assertEquals(users.length, 0);

  const addUser = mockInjection(addUserUnit, fakeUnits);
  addUser("John", "john@example.com", true);

  users = getUsers();
  assertEquals(users.length, 1);
  assertEquals(users[0].name, "John");
});
```

### Testing Utilities

- **`mockInjection(fn, fakeUnits)`**: Mocks a function with fake dependencies
- **`mockFactory(fn, fakeUnits)`**: Mocks a factory function with fake
  dependencies

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

MIT © [Jacobo Tabernero Rey](https://github.com/jacoborus)
