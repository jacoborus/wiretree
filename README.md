# Wiremap

**Wiremap** is a lightweight, type-safe dependency injection framework for
TypeScript that favours composition over inheritance. Build scalable,
maintainable, and testable applications with intuitive dependency management.

## ✨ Features

- **🔒 Type-Safe**: Full TypeScript support without manual type injection
- **🧱 Compositional**: Build complex applications from simple, reusable units
- **♻️ Without Circular Dependencies**: Eliminates circular dependencies by
  design
- **🤯 No decorators, no classes**, no gorillas, no jungles. Just the bananas
- **🌲 Hierarchical**: Organize dependencies with namespaces and blocks
- **🧪 Testable**: Built-in testing utilities for easy mocking and isolation
- **🪶 Lightweight**: Minimal runtime overhead with smart caching
- **🔌 Zero Configuration**: Just install and import
- **🔨 Simple API**: So simple, it hurts.


## 📚 Core Concepts

Wiremap apps are conformed by units arranged in hierarchical blocks.

### Units

Units can be any type of value, and can be injected individually or in block proxies into another units.
Units are resolved and cached on demand.
Units can be plain values or the result of a factory function. To declare a function as a factory function add the `isFactory` property as `true` to it. If the factory returns a promise it will also require the `isAsync` prop as `true` to work properly. Pure async factories don't need that flag as the JS runtime can detect the function is async. Having any async factory in your app will make the `wireApp` method to return a promise.
Units can be wired directly to the root of the app or through namespaced blocks

To define a unit, just declare it and export it:

```ts
export const config = {
  port: 3000
}

export function ping () {
  return 'pong';
}

export function queryUser () {
  const db = getDbConnector()

  return function (id: string) {
    return db.users.find(id)
  }
}
queryUser.isFactory = true as const;
```

### Blocks

Blocks are just groups of units or other blocks.
To create a block use the `createBlock` function, then destructure it into other block or your root app definition.

```ts
// userModule.ts
import { createBlock } from 'wiremap'

import * as userService from './userService'
import * as userRepo from './userRepo'

export default createBlock('userModule', {
  ...createBlock('service', userService),
  ...createBlock('repo', userRepo),
})
```

### App

Wiring an app requires an object containing all the units and blocks definitions. This definitions objects type has to be exported to be able to infer the types from injectors in another files.
Wiring a definitions object will return the injector of the root of the app, unless any unit is an async factory, a promise containing the root injector will be returned.

```ts
import { wireApp } from 'wiremap'

import userModule from './userModule'

const units = {
  config: { port: 3000 },
  ...userModule
}
export type Units = typeof units

const appInjector = wireApp(units)

const root = appInjector()
console.log(`App running on port ${root.config.port}`)

const getUser = appInjector('userModule.service').getUser
```


### Injectors

TODO


## 📦 Installation

```bash
npm install wiremap
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
