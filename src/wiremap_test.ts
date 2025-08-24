import { assertEquals, assertThrows } from "@std/assert";
import { tagBlock, wireUp, defineUnit, type InferBlocks } from "./wiremap.ts";

Deno.test("wireUp resolves dependencies", () => {
  const defs = {
    key: "value",
    nested: {
      $: tagBlock("nested"),
      subKey: "subValue",
      subKey2: "subValue2",
    },
  };

  const app = wireUp(defs);

  const keys = Object.keys(app());
  assertEquals(keys.length, 1, "block proxies are ennumerable");

  const nestedKeys = Object.keys(app("nested"));
  assertEquals(nestedKeys.length, 2, "nested block proxies are ennumerable");

  assertEquals(app().key, "value");
  assertEquals(app("nested").subKey, "subValue");
  assertEquals(app("nested").subKey2, "subValue2");
});

Deno.test("wireUp resolves async factories that return a promise", async () => {
  const $ = tagBlock("");
  const wire = $<InferBlocks<typeof defs>>();

  function factoryFn() {
    const theKey = wire().keyName;
    return new Promise((resolve) => {
      resolve(theKey);
    });
  }
  factoryFn.isFactory = true as const;
  factoryFn.isAsync = true as const;

  const defs = {
    $,
    keyName: "value",
    factoryFn,
    nested: {
      $: tagBlock("nested"),
      subKey: "subValue",
    },
  };

  const app = await wireUp(defs);

  assertEquals(app().keyName, "value");
  assertEquals(app("nested").subKey, "subValue");
  assertEquals(app().factoryFn, "value");
});

Deno.test("block creates namespaced definitions", () => {
  const blockInstance = {
    $: tagBlock("@parent.namespace"),
    key: 5,
    key2: 6,
  };

  const blockParent = {
    $: tagBlock("@parent"),
    namespace: blockInstance,
  };

  const mainWire = wireUp({ "@parent": blockParent });

  assertEquals(mainWire("@parent.namespace").key, 5);
  assertEquals(mainWire("@parent.namespace").key2, 6);
});

Deno.test("error handling for missing dependencies", () => {
  const defs = {
    key: "value",
  };

  const app = wireUp(defs);

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

Deno.test("mock injection", () => {
  const fakeUnits = {
    "@test.service": {
      getByEmail: (email: string) => {
        assertEquals(email, "email");
        return { email };
      },
    },
  };

  const tag = tagBlock("@test.service");
  tag.feed(fakeUnits);
  const wire = tag<typeof fakeUnits>();

  const getUser = (email: string) => {
    // const getByEmail = injector(".").getByEmail;
    const getByEmail = wire("@test.service").getByEmail;
    return getByEmail(email);
  };

  assertEquals(getUser("email").email, "email");
});

Deno.test("mockFactory", () => {
  const fakeUnits = {
    "@test.service": {
      getByEmail: (email: string) => {
        assertEquals(email, "email");
        return { email };
      },
    },
  };

  const tag = tagBlock("@test.service");
  tag.feed(fakeUnits);
  const wire = tag<typeof fakeUnits>();

  const getUserFactory = () => {
    const getByEmail = wire("@test.service").getByEmail;
    return (email: string) => getByEmail(email);
  };
  const getUser = getUserFactory();

  assertEquals(getUser("email").email, "email");
});

Deno.test("wireUp protects private units", () => {
  const $A = tagBlock("A");
  const wireA = $A<Defs>();
  const $B = tagBlock("B");
  const wireB = $B<Defs>();

  function priv() {
    return "private";
  }
  priv.isPrivate = true as const;

  function pub() {
    const f = wireA(".").priv;
    return f();
  }

  function other() {
    const f = wireB("A").priv;
    // @ts-ignore: this is just for the internal test
    return f();
  }

  const defs = {
    A: {
      $: $A,
      priv,
      pub,
    },
    B: {
      $: $B,
      other,
    },
  };
  type Defs = typeof defs;

  const main = wireUp(defs);

  assertEquals(
    wireA(".").priv(),
    "private",
    "Private props are accesible from same block injector",
  );
  assertEquals(
    wireA(".").pub(),
    "private",
    "Private props are accesible from other units of same block",
  );

  let passedFromBlockInjector = false;

  try {
    wireB(".").other();
    passedFromBlockInjector = true;
  } catch (e: unknown) {
    if (e instanceof Error) {
      assertEquals(e.message, `Block 'A' has no unit named 'priv'`);
    }
  }

  assertEquals(
    passedFromBlockInjector,
    false,
    "Private units should not be accessible from other blocks",
  );

  let passedFromRootInjector = false;

  try {
    // @ts-ignore: it's just for the internal test
    main("A").priv;
    passedFromRootInjector = true;
  } catch (e: unknown) {
    if (e instanceof Error) {
      assertEquals(e.message, `Block 'A' has no unit named 'priv'`);
    }
  }

  assertEquals(
    passedFromRootInjector,
    false,
    "Private units should not be accessible from root injector",
  );
});

Deno.test("defineUnit: no options", () => {
  const block = {
    $: tagBlock(""),
    valor: defineUnit(5),
    o: {
      $: tagBlock("o"),
      /**  A value */
      valor: defineUnit("hola"),
    },
  };
  const main = wireUp(block);
  assertEquals(main().valor, 5);
  assertEquals(main("o").valor, "hola");
});

Deno.test("defineUnit: isPrivate", () => {
  const $ = tagBlock("");
  const $a = tagBlock("a");
  const $b = tagBlock("b");

  const block = {
    $,
    valor: defineUnit(5),
    a: {
      $: $a,
      valor: defineUnit("hola"),
    },
    b: {
      $: $b,
      valor: defineUnit("hola", { isPrivate: true }),
    },
  };
  type Defs = InferBlocks<typeof block>;
  const main = wireUp(block);
  const awire = $a<Defs>();
  const bwire = $b<Defs>();

  assertEquals(main().valor, 5);
  assertEquals(main("a").valor, "hola");
  assertThrows(() => {
    main("b").valor;
  });

  assertEquals(awire().valor, 5);
  assertEquals(awire("a").valor, "hola");
  assertThrows(() => {
    awire("b").valor;
  });

  assertEquals(bwire().valor, 5);
  assertEquals(bwire("a").valor, "hola");
  assertEquals(bwire(".").valor, "hola");
});
