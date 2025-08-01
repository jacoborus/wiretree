# Wiretree

**Wiretree** is a lightweight, type-safe dependency injection framework for
TypeScript that emphasizes compositional design and hierarchical organization.
Build scalable, maintainable, and testable applications with intuitive
dependency management.

## ✨ Features

- **🔒 Type-Safe**: Full TypeScript support with compile-time dependency
  validation
- **🏗️ Compositional**: Build complex applications from simple, reusable units
- **📦 Hierarchical**: Organize dependencies with namespaces and blocks
- **♻️ Without Circular Dependencies**: Eliminates circular dependencies by
  design
- **⚡ Lightweight**: Minimal runtime overhead with smart caching
- **🧪 Testable**: Built-in testing utilities for easy mocking and isolation
- **🔧 Zero Configuration**: No decorators, annotations, reflect-metadata, or
  complex setup required

## 📦 Installation

```bash
npm install wiretree
```

## 🚀 Quick Start

```ts
import { createApp, plain } from "wiretree";

// Define your units
const defs = {
  config: plain({ apiUrl: "https://api.example.com" }),
  logger: plain((message: string) => {
    console.log(`[LOG] ${message}`);
  }),
  ...userService, // Import from other modules
};

export type Defs = typeof defs;

// Create your application
const app = createApp(defs);

// Use your dependencies
const config = app("config");
const log = app("logger");
log("Application started!");
```

## 📚 Core Concepts

### Unit Types

Wiretree provides two types of unit definitions:

#### `plain` - Static Values

Store functions that don't require injection, constants, configuration objects,
or pre-instantiated objects.

```ts
const config = plain({
  apiUrl: "https://api.example.com",
  timeout: 5000,
  retries: 3,
});

const database = plain(new DatabaseConnection());
```

#### `factory` - Lazy Singletons

Create instances on-demand with access to other dependencies. Results are
cached.

```ts
const httpClient = factory(function(injector) {
  const config = injector("config");
  return new HttpClient(config.apiUrl);
});

const cache = factory(() => new Map());
```

### Using Services with getInjector

Instead of bound functions, use `getInjector` to access dependencies:

```ts
// user/userService.ts
import { getInjector } from "wiretree";
import type { Defs } from "../app.ts";

const inj = getInjector<Defs>()("@user.service");

export function getUser(id: string) {
  const db = inj("db");
  return db.users.find((user) => user.id === id);
}

export function addUser(name: string, email: string) {
  // Access other units in the same block with dot notation
  const getUserByEmail = inj(".getUserByEmail");
  
  if (getUserByEmail(email)) {
    throw new Error("User already exists");
  }

  const db = inj("db");
  const user = { id: crypto.randomUUID(), name, email };
  db.users.push(user);
  return user.id;
}
```

### Blocks and Namespaces

Organize related units using `block` to create hierarchical namespaces:

```ts
// user/userMod.ts
import { block } from "wiretree";
import * as userService from "./userService.ts";

export default block("@user", {
  ...block("service", userService),
});
```

### Dependency Resolution

Wiretree supports multiple resolution patterns:

```ts
// Absolute resolution - access any unit by full path
const user = app("@user.service.getUser");

// Relative resolution - access units within the same block
const inj = getInjector<Defs>()("@user.service");
const getUserByEmail = inj(".getUserByEmail"); // Resolves to @user.service.getUserByEmail
const db = inj("db"); // Resolves to root-level db

// Cross-block resolution
const inj2 = getInjector<Defs>()("@post.service");
const getUser = inj2("@user.service.getUser"); // Access user service from post service
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
import { getInjector } from "wiretree";
import type { Defs } from "../app.ts";

const inj = getInjector<Defs>()("@user.service");

export function getUser(id: string) {
  const db = inj("db");
  return db.users.find((user) => user.id === id);
}

export function getUserByEmail(email: string) {
  const db = inj("db");
  return db.users.find((user) => user.email === email);
}

export function addUser(name: string, email: string, isAdmin = false) {
  const getUserByEmail = inj(".getUserByEmail");
  const existingUser = getUserByEmail(email);

  if (existingUser) {
    throw new Error(`User with email ${email} already exists`);
  }

  const user = { id: crypto.randomUUID(), name, email, isAdmin };
  inj("db").users.push(user);
  return user.id;
}

export function getUsers() {
  return inj("db").users;
}

// post/postService.ts
import { getInjector } from "wiretree";
import type { Defs } from "../app.ts";

const inj = getInjector<Defs>()("@post.service");

export function addPost(title: string, content: string, userId: string) {
  const getUser = inj("@user.service.getUser");
  const user = getUser(userId);

  if (!user) {
    throw new Error(`User with id ${userId} does not exist`);
  }

  const db = inj("db");
  const post = { id: crypto.randomUUID(), title, content, userId };
  db.posts.push(post);
  return post.id;
}

export function getPost(id: string) {
  const db = inj("db");
  return db.posts.find((post) => post.id === id);
}

export function getPosts() {
  return inj("db").posts;
}

// user/userMod.ts
import { block } from "wiretree";
import * as userService from "./userService.ts";

export default block("@user", {
  ...block("service", userService),
});

// post/postMod.ts
import { block } from "wiretree";
import * as postService from "./postService.ts";

export default block("@post", {
  ...block("service", postService),
});

// app.ts
import { createApp, plain } from "wiretree";
import { db } from "./db.ts";
import userMod from "./user/userMod.ts";
import postMod from "./post/postMod.ts";

const defs = {
  db: plain(db),
  ...userMod,
  ...postMod,
};

export type Defs = typeof defs;
export const app = createApp(defs);

// Usage
const addUser = app("@user.service.addUser");
const userId = addUser("John Doe", "john@example.com");

const addPost = app("@post.service.addPost");
const postId = addPost("Hello World", "This is my first post!", userId);

const posts = app("@post.service.getPosts")();
console.log(posts); // [{ id: "...", title: "Hello World", ... }]

```


## 🧪 Testing

Wiretree includes powerful testing utilities for isolated unit testing:

```ts
import { assertEquals } from "@std/assert";
import { mockUnit } from "wiretree";
import type { User, Post } from "../db.ts";
import {
  addUser as addUserFactory,
  getUsers as getUsersFactory,
} from "./userService.ts";

Deno.test("user service - add user", () => {
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
  addUser("John", "john@example.com", true);

  users = getUsers();
  assertEquals(users.length, 1);
  assertEquals(users[0].name, "John");
});
```

### Testing Utilities

- **`mockUnit(fn, fakeUnits, namespace)`**: Mocks a function with fake dependencies in a specific namespace context



## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.


## 📄 License

MIT © [Jacobo Tabernero Rey](https://github.com/jacoborus)
