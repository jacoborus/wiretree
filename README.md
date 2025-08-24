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

## 🚀 Examples

### Basic Application Setup

```ts
// config.ts
export const config = {
  port: 3000,
  host: "localhost",
  database: {
    url: "postgresql://localhost:5432/myapp"
  }
};

// userService.ts
import { tagBlock } from "wiremap";
import type { Defs } from "./app.ts";

export const $ = tagBlock("user.service");

const wire = $<Defs>();

export function getUsers() {
  const db = wire().database;
  return db.users.findAll();
}

export function createUser(name: string, email: string) {
  const db = wire().database;
  const user = { id: crypto.randomUUID(), name, email };
  db.users.create(user);
  return user;
}

// app.ts
import { wireUp, type InferBlocks } from "wiremap";
import { config } from "./config.ts";
import * as userService from "./userService.ts";
import * as database from "./database.ts";

const defs = {
  config,
  database,
  user: { service: userService }
};

export type Defs = InferBlocks<typeof defs>;

const app = await wireUp(defs);

// Use the application
const users = app("user.service").getUsers();
console.log("Users:", users);
```

### E-commerce Example

```ts
import { wireUp, type InferBlocks } from "wiremap";
// Domain modules
import * as userMod from "./domains/user/userMod.ts";
import * as productMod from "./domains/product/productMod.ts";
import * as orderMod from "./domains/order/orderMod.ts";
import * as paymentMod from "./domains/payment/paymentMod.ts";

const defs = {
  config: {
    port: 3000,
    stripe: { apiKey: process.env.STRIPE_KEY },
    database: { url: process.env.DATABASE_URL },
    redis: { url: process.env.REDIS_URL }
  },
  user: userMod,
  product: productMod,
  order: orderMod,
  payment: paymentMod,
};

export type Defs = InferBlocks<typeof defs>;

const app = await wireUp(defs);

// Start server
console.log(`E-commerce app running on port ${app().config.port}`);
```

## 🏗️ Advanced Usage

### Private Units

Private units are only accessible within their own block and cannot be accessed from other blocks or the root level. To mark a unit as private, set the `isPrivate` property to `true as const`:

```ts
export function internalHelper() {
  return "helper";
}
internalHelper.isPrivate = true as const;

// This unit won't be accessible from other blocks
```

**Important**: The `as const` assertion ensures TypeScript infers the literal type `true` rather than the broader `boolean` type.

### Factory Functions

Use factories to create configurable instances that depend on other units:

```ts
import type { Defs } from "./app.ts";

export const $ = tagBlock("email.service");

const wire = $<Defs>();

export function createEmailSender() {
  const config = wire().config;
  const logger = wire().logger;
  
  return {
    send: (to: string, subject: string, body: string) => {
      logger.info(`Sending email to ${to}: ${subject}`);
      // Use config.smtp settings to send email
      return sendEmail(config.smtp, { to, subject, body });
    },
    
    sendBulk: (emails: EmailData[]) => {
      logger.info(`Sending ${emails.length} bulk emails`);
      return Promise.all(emails.map(email => 
        sendEmail(config.smtp, email)
      ));
    }
  };
}
createEmailSender.isFactory = true as const;
```

Factory functions must be explicitly marked with the `isFactory` property set to `true as const`. This property serves two critical purposes:

1. **Runtime Identification**: Tells Wiremap to call the function on first access rather than treating it as a plain function
2. **Type Safety**: The `as const` assertion ensures TypeScript infers the exact literal type, enabling Wiremap's type system to correctly identify factories and provide proper return type inference

Factories are resolved lazily (on first access) and their results are cached for quick resolution on subsequent calls. This provides efficient initialization - only the units you actually use get created.

Factories are ideal for:
- **Stateful services** that need configuration
- **Complex initialization** requiring multiple dependencies  
- **Shared instances** that should be created once and reused
- **Environment-specific behavior** based on configuration

### Async Factories

Async factories handle asynchronous initialization and are resolved eagerly when `wireUp()` is called, before the wire function is returned:

```ts
export async function databaseConnection() {
  const connection = await connectToDatabase();
  return connection;
}
databaseConnection.isFactory = true as const;
databaseConnection.isAsync = true as const;
```

When async factories are present, `wireUp()` returns a Promise that resolves once all async factories have completed their initialization. This ensures that by the time you can access units, all asynchronous dependencies are fully ready. Like all factories, the resolved values are cached for quick access on subsequent calls.

### Complex Block Hierarchies

Organize your application with nested blocks:

```ts
// userMod.ts
export const $ = tagBlock("user");
export const service = userService;
export const auth = userAuth;

// userAuth.ts  
export const $ = tagBlock("user.auth");
export const login = (credentials: any) => { /* auth logic */ };
export const logout = () => { /* logout logic */ };

// Access deeply nested units
const authService = app("user.auth");
authService.login(credentials);
```

### Dependency Injection Patterns

**Service Locator Pattern:**
```ts
import type { Defs } from "./app.ts";

export const $ = tagBlock("order.service");

const wire = $<Defs>();

export function createOrderService() {
  const userService = wire("user.service");
  const paymentService = wire("payment.service");
  
  return {
    createOrder: (userId: string, items: Item[]) => {
      const user = userService.getUser(userId);
      const payment = paymentService.processPayment(user, items);
      // ...
    }
  };
}
createOrderService.isFactory = true as const;
```

**Local Dependencies:**
```ts
import type { Defs } from "./app.ts";

export const $ = tagBlock("user.service");

const wire = $<Defs>();

export function validateUser(email: string) {
  const getUserByEmail = wire(".").getUserByEmail;
  return getUserByEmail(email) != null;
}
```

## 🎯 Best Practices

### 1. Block Organization
- Keep blocks focused on a single domain or feature
- Use hierarchical naming for related functionality
- Avoid deep nesting (max 3-4 levels)

### 2. Unit Design
- Make units pure functions when possible
- Use factories for stateful or configuration-dependent units
- Keep dependencies explicit and minimal

### 3. Testing Strategy
- Test units in isolation using the `.feed()` method
- Create focused fake implementations for each block
- Test both success and error scenarios
- Organize mock dependencies by block paths

### 4. Type Safety
- Use `InferBlocks` for type definitions
- Export block types for reuse across modules
- Leverage TypeScript's inference for better DX

## 🚀 Migration Guide

### From Other DI Frameworks

**From class-based DI:**
```ts
// Before (class-based)
@Injectable()
class UserService {
  constructor(private db: Database) {}
  
  getUsers() {
    return this.db.users;
  }
}

// After (Wiremap)
import type { Defs } from "./app.ts";

export const $ = tagBlock("user.service");

const wire = $<Defs>();

export function getUsers() {
  const db = wire().db;
  return db.users;
}
```

**From decorator-based DI:**
```ts
// Before (decorators)
@Inject('DATABASE')
private database: Database;

// After (Wiremap)
import type { Defs } from "./app.ts";

export const $ = tagBlock("some.service");

const wire = $<Defs>();

export function someFunction() {
  const database = wire().database;
  // use database...
}
```

## 📖 API Reference

## 📚 Core Concepts

Wiremap applications are composed of **units** organized into **hierarchical blocks**.

### Units

Units are the building blocks of your application. They can be any kind of value and are resolved and cached on demand.

A unit can be:
- **Plain values**: Configuration objects, constants, etc.
- **Plain functions**: Stateless operations
- **Factory functions**: Functions that return configured instances

#### Plain Values
```ts
export const config = {
  port: 3000,
  host: "localhost"
};
```

#### Plain Functions
```ts
export function ping() {
  return "pong";
}
```

#### Factory Functions
Factory functions are called on first access and their result is cached for subsequent access. To declare a function as a factory, you must add the `isFactory` property and set it to `true as const`:

```ts
import type { Defs } from "./app.ts";

export const $ = tagBlock("user.service");

const wire = $<Defs>();

export function createUserValidator() {
  const config = wire().config;
  
  return function(user: User) {
    // validation logic using config
    return user.email.length > 0;
  };
}
createUserValidator.isFactory = true as const;
```

**Important**: The `as const` assertion is crucial for TypeScript to properly infer the literal type `true` instead of the broader `boolean` type.

#### Async Factories
Async factories handle asynchronous initialization and return promises. For async factory functions, you must set both `isFactory` and `isAsync` properties to `true as const`:

```ts
import type { Defs } from "./app.ts";

export const $ = tagBlock("database.service");

const wire = $<Defs>();

export async function createDatabaseConnection() {
  const config = wire().config;
  const connection = await connect(config.databaseUrl);
  return connection;
}
createDatabaseConnection.isFactory = true as const;
createDatabaseConnection.isAsync = true as const;
```

**Important**: Both properties require the `as const` assertion for proper type inference. The `isAsync` flag tells Wiremap that this factory returns a Promise and needs to be awaited eagerly when `wireUp()` is called. Unlike regular factories which are resolved lazily on first access, async factories are resolved immediately during application initialization. When async factories are present, `wireUp()` returns a Promise that resolves once all async factories have completed. The resolved values are cached for quick access on subsequent calls.

### Blocks

Blocks are groups of units and other blocks that provide namespace organization and dependency scoping.

#### Creating a Block

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
```

#### Nested Blocks
Blocks can contain other blocks for hierarchical organization:

```ts
// authMod.ts  
export const $ = tagBlock("user.auth");
export const login = (credentials: any) => { /* auth logic */ };
export const logout = () => { /* logout logic */ };
```

⚠️ **Important**: The block name in `tagBlock()` must match the path used when accessing it via the wire function.

### Wire Functions

The `wireUp` function returns a strongly typed wire function that lets you access your units in three ways:

#### Root Access
Call with no arguments to access top-level units:
```ts
const app = await wireUp(defs);
const config = app().config;
```

#### Local Access  
Call with `"."` to access units from the same block (when used within a block context):
```ts
import type { Defs } from "./app.ts";

export const $ = tagBlock("user.service");

const wire = $<Defs>();

export function validateUser(email: string) {
  const getUserByEmail = wire(".").getUserByEmail;
  return getUserByEmail(email) != null;
}
```

#### Block Access
Call with block path to access units from specific blocks:
```ts
const userService = app("user.service");
const authService = app("user.auth");
```

### App Wiring

To wire an app, pass an object containing all your units and imported block modules to `wireUp`:

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
```

⚠️ **Note**: If any unit is an async factory, `wireUp` will return a Promise.

## 📖 API Reference

### Core Functions

#### `wireUp(defs)`

Wires up a set of unit definitions and blocks for dependency injection.

**Parameters:**
- `defs` - Object containing unit definitions and imported blocks

**Returns:**
- `Wire` function for synchronous resolution
- `Promise<Wire>` if any async factory units exist

**Example:**
```ts
const defs = {
  config: { port: 3000 },
  user: userMod
};
const app = await wireUp(defs);
```

#### `tagBlock(namespace)`

Creates a block tag for a module, enabling it to be wired as a block.

**Parameters:**
- `namespace` - The name/path of the block (must match the key used in wireUp)

**Returns:**
- `BlockTag` object to be exported as `$`

**Example:**
```ts
export const $ = tagBlock("user.service");
```

#### `$.feed(dependencies)`

Feeds mock dependencies to a block for testing purposes.

**Parameters:**
- `dependencies` - Object mapping block paths to their mock implementations

**Example:**
```ts
$.feed({
  "": { db: mockDatabase },
  "user.service": { getUser: mockGetUser }
});
```

### Type Utilities

#### `InferBlocks<T>`

Infers the structure of all blocks and units from a definitions object.

```ts
const defs = { user: userMod, config: { port: 3000 } };
export type Defs = InferBlocks<typeof defs>;
```

## 🧪 Testing

Wiremap provides a simple and powerful testing approach using the `.feed()` method on block tags to inject test dependencies.

### Testing with `.feed()`

Use the `.feed()` method on block tags to provide mock implementations for testing:

```ts
import { assertEquals } from "@std/assert";
import { $, addUser, getUsers } from "./userService.ts";
import type { Database } from "../db.ts";

Deno.test(function addUserTest() {
  // Create test database
  const db: Database = { users: [], posts: [] };
  
  // Feed mock dependencies to the block
  $.feed({
    "": {
      db, // Root-level dependency
    },
    "user.service": {
      // Mock local dependencies within the same block
      getUserByEmail: (email: string) => {
        return db.users.find((user) => user.email === email);
      },
    },
  });

  // Test the functionality
  let users = getUsers();
  assertEquals(users.length, 0);

  addUser("john", "john@example.com", true);

  users = getUsers();
  assertEquals(users.length, 1);
  assertEquals(users[0].name, "john");
});
```

### Cross-Block Testing

You can mock dependencies from other blocks:

```ts
import { $, addPost, getPost } from "./postService.ts";

Deno.test(function addPostTest() {
  $.feed({
    "": { 
      db: { users: [], posts: [] } 
    },
    "user.service": {
      // Mock dependency from another block
      getUser: (id: string) => ({
        id,
        name: "testuser",
        email: "test@example.com",
        isAdmin: true,
      }),
    },
  });

  const postId = addPost("Test Title", "Test Content", "user123");
  const post = getPost(postId);

  assertEquals(post?.title, "Test Title");
  assertEquals(post?.userId, "user123");
});
```

### Testing Best Practices

1. **Use Block Tags**: Always use the `$` export from your modules for feeding dependencies
2. **Organize by Block Path**: Structure your mock dependencies using the same block paths as your application
3. **Create Fresh Mocks**: Create new mock instances for each test to avoid state contamination
4. **Test Edge Cases**: Include tests for error conditions and boundary cases
5. **Use Descriptive Names**: Name your test functions clearly to describe what they test

## 🤝 Contributing

Contributions are welcome!

**💬 Questions or Feedback?**\
Open an issue on [GitHub](https://github.com/jacoborus/wiremap/issues)

## 📄 License

MIT © [Jacobo Tabernero Rey](https://github.com/jacoborus)
