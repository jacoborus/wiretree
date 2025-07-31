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
import { createApp } from "wiretree";

// Define your units
const defs = {
  config: plain({ apiUrl: "https://api.example.com" }),
  logger: function (message: string) {
    console.log(`[LOG] ${message}`);
  }),
  ...userService, // Import from other modules
};

// Create your application
const app = createApp(defs);

type Defs = typeof defs;

// Use your dependencies
const config = app("config");
const log = app("logger");
log("Application started!");
```

## 📚 Core Concepts

### Unit Types

Wiretree provides three types of unit definitions:

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
const getPrice = factory(function (this: Injector) {
  const { fee } = this("config");
  return (p: number) => p + config.fee;
});

const cache = factory(() => new Map());
```


### Blocks and Namespaces

Organize related units using `block` to create hierarchical namespaces:

```ts
// user/userService.ts
export const userService = block("@user", {
  getById: bound(getUser),
  getByEmail: bound(getUserByEmail),
  add: bound(addUser),
  list: bound(getUsers),
});

function getUser(this: InjectFrom<Defs, "@user">, id: string) {
  const db = this("db");
  return db.users.find((user) => user.id === id);
}

function addUser(this: InjectFrom<Defs, "@user">, name: string, email: string) {
  // Access other units in the same block with dot notation
  const getByEmail = this(".getByEmail");

  if (getByEmail(email)) {
    throw new Error("User already exists");
  }

  const db = this("db");
  const user = { id: crypto.randomUUID(), name, email };
  db.users.push(user);
  return user.id;
}
```

### Dependency Resolution

Wiretree supports multiple resolution patterns:

```ts
// Absolute resolution - access any unit by full path
const user = app("@user.getById");

// Relative resolution - access units within the same block
function someUserFunction(this: InjectFrom<Defs, "@user">) {
  const getByEmail = this(".getByEmail"); // Resolves to @user.getByEmail
  const db = this("db"); // Resolves to root-level db
}

// Cross-block resolution
function postFunction(this: InjectFrom<Defs, "@post">) {
  const getUser = this("@user.getById"); // Access user block from post block
}
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
import { block, bound, type InjectFrom } from "wiretree";
import type { Defs } from "../app.ts";

type I = InjectFrom<Defs, "@user">;

export const userService = block("@user", {
  getById: bound(getUser),
  getByEmail: bound(getUserByEmail),
  add: bound(addUser),
  list: bound(getUsers),
});

function getUser(this: I, id: string) {
  const db = this("db");
  return db.users.find((user) => user.id === id);
}

function getUserByEmail(this: I, email: string) {
  const db = this("db");
  return db.users.find((user) => user.email === email);
}

function addUser(this: I, name: string, email: string, isAdmin = false) {
  const getByEmail = this(".getByEmail");
  const existingUser = getByEmail(email);

  if (existingUser) {
    throw new Error(`User with email ${email} already exists`);
  }

  const user = { id: crypto.randomUUID(), name, email, isAdmin };
  this("db").users.push(user);
  return user.id;
}

function getUsers(this: I) {
  return this("db").users;
}

// post/postService.ts
import { block, bound, type InjectFrom } from "wiretree";
import type { Defs } from "../app.ts";

type I = InjectFrom<Defs, "@post">;

export const postService = block("@post", {
  add: bound(addPost),
  getById: bound(getPost),
  list: bound(getPosts),
});

function addPost(this: I, title: string, content: string, userId: string) {
  const getUser = this("@user.getById");
  const user = getUser(userId);

  if (!user) {
    throw new Error(`User with id ${userId} does not exist`);
  }

  const db = this("db");
  const post = { id: crypto.randomUUID(), title, content, userId };
  db.posts.push(post);
  return post.id;
}

function getPost(this: I, id: string) {
  const db = this("db");
  return db.posts.find((post) => post.id === id);
}

function getPosts(this: I) {
  return this("db").posts;
}

// app.ts
import { createApp, plain } from "wiretree";
import { db } from "./db.ts";
import { userService } from "./user/userService.ts";
import { postService } from "./post/postService.ts";

const defs = {
  db: plain(db),
  ...userService,
  ...postService,
};

export type Defs = typeof defs;
export const app = createApp(defs);

// Usage
const addUser = app("@user.add");
const userId = addUser("John Doe", "john@example.com");

const addPost = app("@post.add");
const postId = addPost("Hello World", "This is my first post!", userId);

const posts = app("@post.list")();
console.log(posts); // [{ id: "...", title: "Hello World", ... }]

```


## 🧪 Testing

Wiretree includes powerful testing utilities for isolated unit testing:

```ts
import { bindThis, getFakeInjector } from "wiretree/testing";
import { addUser, getUsers } from "./userService.ts";

Deno.test("user service - add user", () => {
  const db = { users: [], posts: [] };

  // Create a fake injector with mock dependencies
  const injector = getFakeInjector({
    db,
    ".getByEmail": (email: string) =>
      db.users.find((user) => user.email === email),
  });

  // Bind functions to the fake injector
  const boundAddUser = bindThis(addUser, injector);
  const boundGetUsers = bindThis(getUsers, injector);

  // Test the functionality
  assertEquals(boundGetUsers().length, 0);

  const userId = boundAddUser("John", "john@example.com", true);
  assertEquals(boundGetUsers().length, 1);
  assertEquals(boundGetUsers()[0].name, "John");
});
```

### Testing Utilities

- **`getFakeInjector(deps)`**: Creates a mock injector with predefined
  dependencies
- **`bindThis(fn, context)`**: Binds a function to a specific context for
  testing



## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.


## 📄 License

MIT © [Jacobo Tabernero Rey](https://github.com/jacoborus)
