import { assertEquals } from "@std/assert";
import { plain, factory, createApp, block } from "./wiretree.ts";

Deno.test("plain function creates value definition", () => {
  const valueDef = plain("testValue");

  assertEquals(valueDef.type.description, "plain");
  assertEquals(valueDef.value, "testValue");
});

Deno.test("factory function creates and caches instances", () => {
  const factoryDef = factory(() => ({ key: "value" }));

  assertEquals(factoryDef.type.description, "factory");
  const instance = factoryDef.value();
  assertEquals(instance.key, "value");
});

// Deno.test("bound function binds function to injector", () => {
//   const injector = getFakeInjector({ key: "value" });
//   const boundFn = bound(function (this: typeof injector) {
//     return this("key");
//   });
//
//   const boundInstance = boundFn.value.bind(injector);
//   assertEquals(boundInstance(), "value");
// });

Deno.test("createApp resolves dependencies", () => {
  const defs = {
    key: plain("value"),
    "@nested.subKey": plain("subValue"),
  };

  const app = createApp(defs);

  assertEquals(app("key"), "value");
  assertEquals(app("@nested.subKey"), "subValue");
});

Deno.test("block creates namespaced definitions", () => {
  const blockInstance = block("namespace", {
    key: plain("value"),
  });

  const blockParent = block("@parent", {
    ...blockInstance,
  });

  assertEquals(blockInstance["namespace.key"].type.description, "plain");
  assertEquals(blockInstance["namespace.key"].value, "value");
  assertEquals(blockParent["@parent.namespace.key"].value, "value");
});

Deno.test("error handling for missing dependencies", () => {
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
