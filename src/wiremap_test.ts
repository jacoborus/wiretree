import { assertEquals } from "@std/assert";
import {
  createBlock,
  createInjector,
  mockFactory,
  mockInjection,
  wireApp,
} from "./wiremap.ts";

Deno.test("wireApp resolves dependencies", () => {
  const defs = {
    key: "value",
    "@nested.subKey": "subValue",
    "@nested.subKey2": "subValue2",
  };

  const app = wireApp(defs);

  const keys = Object.keys(app());
  assertEquals(keys.length, 1, "block proxies are ennumerable");

  const nestedKeys = Object.keys(app("@nested"));
  assertEquals(nestedKeys.length, 2, "nested block proxies are ennumerable");

  assertEquals(app().key, "value");
  assertEquals(app("@nested").subKey, "subValue");
  assertEquals(app("@nested").subKey2, "subValue2");
});

Deno.test(
  "wireApp resolves async factories that return a promise",
  async () => {
    function factoryFn() {
      const theKey = inj().key;
      return new Promise((resolve) => {
        resolve(theKey);
      });
    }
    factoryFn.isFactory = true as const;
    factoryFn.isAsync = true as const;

    const defs = {
      key: "value",
      "@nested.subKey": "subValue",
      factoryFn,
    };
    // @ts-ignore: it's just for the internal test
    const inj = createInjector<typeof defs>()();

    const app = await wireApp(defs);

    assertEquals(app().key, "value");
    assertEquals(app("@nested").subKey, "subValue");
    assertEquals(app(".").factoryFn, "value");
  },
);

Deno.test("block creates namespaced definitions", () => {
  wireApp({});
  const blockInstance = createBlock("namespace", {
    key: 5,
    key2: 6,
  });

  const blockParent = createBlock("@parent", {
    ...blockInstance,
  });

  assertEquals(blockInstance["namespace.key"], 5);
  assertEquals(blockInstance["namespace.key2"], 6);
  assertEquals(blockParent["@parent.namespace.key"], 5);
  assertEquals(blockParent["@parent.namespace.key2"], 6);
});

Deno.test("error handling for missing dependencies", () => {
  wireApp({});
  const defs = {
    key: "value",
  };

  const app = wireApp(defs);

  try {
    try {
      try {
        app("nonexistent" as ".");
        throw new Error("Should have thrown an error");
      } catch (e: unknown) {
        if (e instanceof Error) {
          assertEquals(e.message, 'Unit nonexistent not found from block ""');
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
  wireApp({});
  const fakeUnits = {
    "@test.service.getByEmail": (email: string) => {
      assertEquals(email, "email");
      return { email };
    },
  };

  const injector = createInjector<typeof fakeUnits>()("@test.service");

  const getUser = mockInjection((email: string) => {
    // const getByEmail = injector(".").getByEmail;
    const getByEmail = injector("@test.service").getByEmail;
    return getByEmail(email);
  }, fakeUnits);

  assertEquals(getUser("email").email, "email");
});

Deno.test("mockFactory", () => {
  wireApp({});
  const fakeUnits = {
    "@test.service.getByEmail": (email: string) => {
      assertEquals(email, "email");
      return { email };
    },
  };

  const inj = createInjector<typeof fakeUnits>()("@test.service");

  const getUser = mockFactory(() => {
    const getByEmail = inj("@test.service").getByEmail;
    return (email: string) => getByEmail(email);
  }, fakeUnits);

  assertEquals(getUser("email").email, "email");
});
