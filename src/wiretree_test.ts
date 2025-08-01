import { assertEquals } from "@std/assert";
import {
  plain,
  factory,
  createApp,
  block,
  mockInjection,
  mockFactory,
  getInjector,
} from "./wiretree.ts";

Deno.test("plain function creates value definition", () => {
  createApp({});
  const valueDef = plain("testValue");

  assertEquals(valueDef.type.description, "plain");
  assertEquals(valueDef.value, "testValue");
});

Deno.test("factory function creates and caches instances", () => {
  createApp({});
  const factoryDef = factory(() => ({ key: "value" }));

  assertEquals(factoryDef.type.description, "factory");
  const instance = factoryDef.value();
  assertEquals(instance.key, "value");
});

Deno.test("createApp resolves dependencies", () => {
  createApp({});
  const defs = {
    key: plain("value"),
    "@nested.subKey": plain("subValue"),
  };

  const app = createApp(defs);

  assertEquals(app("key"), "value");
  assertEquals(app("@nested.subKey"), "subValue");
});

Deno.test("block creates namespaced definitions", () => {
  createApp({});
  const blockInstance = block("namespace", {
    key: 5,
    key2: 6,
  });

  const blockParent = block("@parent", {
    ...blockInstance,
  });

  assertEquals(blockInstance["namespace.key"], 5);
  assertEquals(blockInstance["namespace.key2"], 6);
  assertEquals(blockParent["@parent.namespace.key"], 5);
  assertEquals(blockParent["@parent.namespace.key2"], 6);
});

Deno.test("error handling for missing dependencies", () => {
  createApp({});
  const defs = {
    key: plain("value"),
  };

  const app = createApp(defs);

  try {
    try {
      try {
        app("nonexistent" as "key");
        throw new Error("Should have thrown an error");
      } catch (e: unknown) {
        if (e instanceof Error) {
          assertEquals(e.message, 'Key nonexistent not found from block ""');
        }
      }
    } catch (e) {
      assertEquals(
        (e as Error).message,
        'Key nonexistent not found from block ""',
      );
    }
  } catch (error) {
    if (error instanceof Error) {
      assertEquals(error.message, 'Key nonexistent not found from block ""');
    }
  }
});

Deno.test("mockInjection", () => {
  createApp({});
  const fakeUnits = {
    "@test.service.getByEmail": (email: string) => {
      assertEquals(email, "email");
      return { email };
    },
  };

  const injector = getInjector<typeof fakeUnits>()("@test.service");

  const getUser = mockInjection(
    function (email: string) {
      const getByEmail = injector("@test.service.getByEmail");
      return getByEmail(email);
    },
    fakeUnits,
    "@test.service",
  );

  assertEquals(getUser("email").email, "email");
});

Deno.test("mockFactory", () => {
  createApp({});
  const fakeUnits = {
    "@test.service.getByEmail": (email: string) => {
      assertEquals(email, "email");
      return { email };
    },
  };

  const inj = getInjector<typeof fakeUnits>()("@test.service");

  const getUser = mockFactory(
    () => {
      const getByEmail = inj("@test.service.getByEmail");
      return (email: string) => getByEmail(email);
    },
    fakeUnits,
    "@test.service",
  );

  assertEquals(getUser("email").email, "email");
});
