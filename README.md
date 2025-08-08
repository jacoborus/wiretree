# Wiremap

**Wiremap** is a lightweight, type-safe dependency injection framework for **TypeScript** that favors composition over inheritance. Build scalable, maintainable, and testable applications with intuitive and powerful dependency management.

## ✨ Features

- **🔒 Type-Safe**: Full TypeScript support without manual type annotations  
- **🧱 Compositional**: Compose complex applications from small, reusable units  
- **♻️ Circular Dependency-Free**: Designed to eliminate circular dependencies  
- **🤯 No decorators, no classes**, no gorillas, no jungles — just the bananas  
- **🌲 Hierarchical**: Organize dependencies using namespaces and blocks  
- **🧪 Testable**: Built-in utilities for easy mocking and isolated testing  
- **🪶 Lightweight**: Minimal runtime overhead with smart, built-in caching  
- **🔌 Zero Configuration**: Just install and import — no setup needed  
- **🔨 Simple API**: So simple, it hurts  

## 📚 Core Concepts

Wiremap applications are composed of **units** organized into **hierarchical blocks**.

### Units

Units can be any kind of value and can be injected individually or via block proxies into other units. They're resolved and cached on demand.

A unit can be:

- A plain value  
- The result of a factory function  

To declare a function as a factory, add the `isFactory` flag:

- If the factory returns a **promise**, add `isAsync: true`  
- If the function is declared with `async`, no flag is needed — it’s auto-detected  

If **any** unit is an async factory, `wireApp` will return a **Promise**.

Units can be defined directly at the root or within namespaced blocks.

Example:

```ts
export const config = {
  port: 3000
}

export function ping () {
  return 'pong';
}

export function queryUser () {
  const db = getDbConnector();

  return function (id: string) {
    return db.users.find(id);
  };
}
queryUser.isFactory = true as const;
```

### Blocks

Blocks are groups of units (or other blocks). Use createBlock to create one, then compose it into other blocks or your app’s root definition.


```ts
// userModule.ts
import { createBlock } from 'wiremap';

import * as userService from './userService';
import * as userRepo from './userRepo';

export default createBlock('userModule', {
  ...createBlock('service', userService),
  ...createBlock('repo', userRepo),
});
```

### App

To wire an app, pass an object containing all your units and blocks to `wireApp`.

To enable type inference across files, export the type of your definitions object.

If any unit is an async factory, `wireApp` will return a Promise.

```ts
import { wireApp } from 'wiremap';

import userModule from './userModule';

const units = {
  config: { port: 3000 },
  ...userModule
};
export type Units = typeof units;

const appInjector = wireApp(units);

const root = appInjector();
console.log(`App running on port ${root.config.port}`);

const getUser = appInjector('userModule.service').getUser;
```


### Injectors

Wiremap injectors are strongly typed functions that let you access your units.

You can use injectors in three main ways:

- Root Injector: Access top-level units or blocks.
- Scoped Injector: Created from any unit path; accesses relative or nested dependencies.
- Path Resolution:
  - "." resolves to the current block
  - "some.path" resolves absolutely
  - passing nothing resolves to root

Example:

```ts
// app.ts
import { getInjector } from "wiremap";
import type { Units } from "./app";

const serviceInjector = getInjector<Units>()("userModule.service");

// access units from same block
const getUser = serviceInjector(".").getUser;
// access units from root-level
const configAgain = serviceInjector().config; 
// access units from another block
const postArticle = serviceInjector('postModule.service').postArticle;
```


Wiring an app will return the root level injector



## 📦 Installation

```bash
npm install wiremap
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

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

MIT © [Jacobo Tabernero Rey](https://github.com/jacoborus)
