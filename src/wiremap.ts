type Hashmap = Record<string, unknown>;

let unitDefinitions: Hashmap = {};
let unitCache: Hashmap = {};
let takenInjectorsKeys = new Set<string>();
let blockPaths: string[] = [];
let proxiesCache = new Map<string, unknown>();

type WiredApp<Defs extends Hashmap> =
  HasAsync<Defs> extends true
    ? Promise<BlockInjector<Defs, "">>
    : BlockInjector<Defs, "">;

type HasAsync<T extends Hashmap> = true extends {
  [K in keyof T]: IsAsyncFactory<T[K]>;
}[keyof T]
  ? true
  : false;

/**
 * Wires up a dependency injection application from unit definitions.
 *
 * @param defs - Object containing unit definitions, where keys are unit names and values are factories or values
 * @returns Promise<BlockInjector> if async factory units exist, otherwise BlockInjector for synchronous resolution
 */
export function wireApp<Defs extends Hashmap>(defs: Defs): WiredApp<Defs> {
  unitDefinitions = defs;
  unitCache = {};
  proxiesCache = new Map();
  blockPaths = getBlockPaths(defs);
  takenInjectorsKeys = new Set<string>();
  const injector = generateInjector<Defs, "">("");

  if (hasAsyncKeys(defs)) {
    // This will cause wireApp to return a promise that resolves
    // when all async factories are resolved
    return resolveAsyncFactories().then(() => injector) as WiredApp<Defs>;
  }

  return injector as WiredApp<Defs>;
}

/**
 * Extract the paths of the blocks of a hashmap
 *
 * This will return "b" | "b.e":
 *
 * BlockPaths<{
 *   a: 1,
 *   "b.c": 2,
 *   "b.d": 3,
 *   "b.e.other": 3,
 * }>
 */
type BlockPaths<L extends Hashmap> = {
  [K in keyof L]: ExtractBlockPath<Extract<K, string>>;
}[keyof L];

/** Extract keys with no dots in them */
type NoDots<T extends string> = T extends `${string}.${string}` ? never : T;

/**
 * Extracts the path of a block from a unit path.
 * Returns never if the path does not contain dots.
 *
 * Example:
 *
 * ExtractBlockPath<"a.b.c.d">; // "a.b.c"
 * ExtractBlockPath<"a.b.d">; // "a.b"
 * ExtractBlockPath<"a">; // never
 */
type ExtractBlockPath<T extends string> = T extends `${infer S}.${infer C}`
  ? C extends NoDots<C>
    ? S
    : `${S}.${ExtractBlockPath<C>}`
  : never;

/** Extracts the paths of blocks from a hashmap of definitions into an array */
function getBlockPaths<L extends Hashmap>(defs: L): BlockPaths<L>[] {
  return Object.keys(defs)
    .filter((key) => key.split(".").length > 1)
    .map((key) => {
      const parts = key.split(".");
      return parts
        .slice(0, parts.length - 1)
        .join(".") as BlockPaths<L>[][number];
    });
}

/** Check if any of the definitions are async factories */
function hasAsyncKeys(list: Hashmap): boolean {
  return Object.keys(list).some((key) => isAsyncFactory(list[key]));
}

async function resolveAsyncFactories(): Promise<void> {
  const keys = Object.keys(unitDefinitions);

  for await (const key of keys) {
    const unitDef = unitDefinitions[key];
    if ((isFunction(unitDef) || isPromise(unitDef)) && isFactory(unitDef)) {
      unitCache[key] = await unitDef();
    }
  }
}

/** Add a prefix to all keys of a hashmap. */
type PrefixedHashmap<N extends string, L extends Hashmap> = {
  [K in keyof L as `${N}.${Extract<K, string>}`]: L[K];
};

/**
 * Creates a namespaced block of units with a common prefix.
 *
 * @param name - The namespace prefix for all units in the block
 * @param units - Object containing unit definitions to be namespaced
 * @returns Object with all units prefixed with the namespace
 */
export function createBlock<L extends Hashmap, Prefix extends string>(
  name: Prefix,
  units: L,
): PrefixedHashmap<Prefix, L> {
  const result: Hashmap = {};
  for (const key in units) {
    if (Object.prototype.hasOwnProperty.call(units, key)) {
      result[`${name}.${key}`] = units[key];
    }
  }
  return result as PrefixedHashmap<Prefix, L>;
}

interface BlockInjector<L extends Hashmap, P extends string> {
  (): BlockProxy<L, P, "">;
  <K extends "." | BlockPaths<L>>(key?: K): BlockProxy<L, P, K>;
}

type InjectorFactory<L extends Hashmap> = <N extends BlockPaths<L>>(
  namespace: N,
) => BlockInjector<L, N>;

/**
 * Creates an injector factory function for accessing units within specific namespaces.
 *
 * @returns Function that takes a namespace and returns a BlockInjector for that namespace
 */
export function createInjector<L extends Hashmap>(): InjectorFactory<L> {
  return function <N extends BlockPaths<L>>(namespace: N): BlockInjector<L, N> {
    return generateInjector<L, N>(namespace);
  };
}

function generateInjector<Defs extends Hashmap, P extends string>(
  parent: P,
): BlockInjector<Defs, P> {
  if (takenInjectorsKeys.has(parent)) {
    throw new Error(`Injector for "${parent}" is already in use.`);
  }

  const localCache: Hashmap = {};
  takenInjectorsKeys.add(parent);

  function blockInjector(): BlockProxy<Defs, P, "">;
  function blockInjector<K extends "." | BlockPaths<Defs>>(
    blockKey: K,
  ): BlockProxy<Defs, P, K>;
  function blockInjector<K extends "." | BlockPaths<Defs>>(
    blockKey?: K,
  ): BlockProxy<Defs, P, K extends undefined ? "" : K> {
    const key = (blockKey ?? "") as K extends undefined ? "" : K;

    type ThisProxy = BlockProxy<Defs, P, K extends undefined ? "" : K>;

    if (key in localCache) {
      return localCache[key] as ThisProxy;
    }

    const k = String(key);

    let proxy;

    if (k === ".") {
      // local block resolution, exposes private units
      proxy = createBlockProxy(parent, parent) as unknown as ThisProxy;
    } else if (k === "") {
      // root block resolution
      proxy = createBlockProxy(parent, "") as ThisProxy;
    } else if (blockPaths.includes(k)) {
      // external block resolution, uses absolute path of the block
      proxy = createBlockProxy(parent, k) as unknown as ThisProxy;
    } else {
      throw new Error(`Unit ${String(key)} not found from block "${parent}"`);
    }

    localCache[k] = proxy;
    proxiesCache.set(k, proxy);
    return proxy;
  }

  return blockInjector;
}

/**
 * Extract the names of the units of a block
 *
 * This will  return "c" | "d":
 *
 * BlockUnitNames<{
 *   a: 1,
 *   "b.c": 2,
 *   "b.d": 3,
 *   "b.e.other": 3,
 * }, "b">
 */
type BlockUnitNames<L extends Hashmap, N extends string> = {
  [K in keyof L]: N extends ""
    ? K extends NoDots<infer UnitName>
      ? UnitName
      : never
    : K extends `${N}.${NoDots<infer UnitName>}`
      ? UnitName
      : never;
}[keyof L];

/**
 * Extract the names of the public units of a block
 *
 * This will  return "c" | "d":
 *
 * BlockUnitNames<{
 *   a: 1,
 *   "b.c": 2,
 *   "b.d": 3,
 *   "b.c": {(): any; isPrivate: true }
 * }, "b">
 */
type PublicBlockUnitNames<L extends Hashmap, N extends string> = {
  [K in keyof L]: K extends `${N}.${NoDots<infer UnitName>}` //
    ? L[K] extends { isPrivate: true }
      ? never
      : UnitName //
    : never;
}[keyof L];

type BlockProxy<
  L extends Hashmap,
  P extends string,
  N extends string,
> = N extends "."
  ? {
      [K in BlockUnitNames<L, P>]: InferUnitValue<L[`${P}.${K}`]>;
    }
  : N extends ""
    ? {
        [K in BlockUnitNames<L, "">]: InferUnitValue<L[K]>;
      }
    : N extends P
      ? {
          [K in BlockUnitNames<L, N>]: InferUnitValue<L[`${N}.${K}`]>;
        }
      : {
          [K in PublicBlockUnitNames<L, N>]: InferUnitValue<L[`${N}.${K}`]>;
        };

type InferUnitValue<D> =
  D extends Factory<infer T> ? (T extends Promise<infer V> ? V : T) : D;

function createBlockProxy<
  L extends Hashmap,
  P extends string,
  N extends string,
>(parent: P, namespace: N): BlockProxy<L, P, N> {
  const unitKeys = getBlockUnitPaths(parent, namespace);

  return new Proxy(
    {}, // used as a cache for the block
    {
      get: <K extends string>(cachedblock: Hashmap, prop: K) => {
        type ProxyValue = InferUnitValue<N extends "" ? L[K] : L[`${N}.${K}`]>;

        if (prop in cachedblock) {
          return cachedblock[prop] as ProxyValue;
        }

        const finalKey = namespace === "" ? prop : `${namespace}.${prop}`;

        if (unitKeys.includes(finalKey)) {
          if (finalKey in unitCache) {
            const cachedValue = unitCache[finalKey];
            cachedblock[prop] = cachedValue;
            return cachedValue as ProxyValue;
          }

          const def = unitDefinitions[finalKey];

          const value = isFactory(def) ? def() : def;

          cachedblock[prop] = value;
          unitCache[finalKey] = value;
          return def as ProxyValue;
        }

        throw new Error(
          `Key "${String(prop)}" not found in block "${namespace}"`,
        );
      },

      ownKeys() {
        return unitKeys;
      },

      getOwnPropertyDescriptor() {
        return {
          writable: false,
          enumerable: true,
          // this is required to allow the proxy to be enumerable
          configurable: true,
        };
      },
    },
  ) as BlockProxy<L, P, N>;
}

/**
 * Extracts the paths of the units of a block.
 *
 * Example:
 * This returns ["b.c", "b.d", "b.e.other"]
 *
 * getBlockUnitPaths("b",
 *   a: 1,
 *   "b.c": 2,
 *   "b.d": 3,
 *   "b.e.other": 3,
 * })
 */
function getBlockUnitPaths<P extends string, N extends string>(
  parent: P,
  namespace: N,
) {
  if (namespace === "") {
    return Object.keys(unitDefinitions).filter(
      (key) => key.split(".").length === 1,
    );
  }

  if ((namespace as string) === parent) {
    return Object.keys(unitDefinitions).filter(
      (key) =>
        key.startsWith(`${namespace}.`) &&
        key.slice(namespace.length + 1).split(".").length === 1,
    );
  }

  return Object.keys(unitDefinitions).filter(
    (key) =>
      key.startsWith(`${namespace}.`) &&
      key.slice(namespace.length + 1).split(".").length === 1 &&
      !isPrivate(unitDefinitions[key]),
  );
}

function isPromise<T>(value: unknown): value is Promise<T> {
  return (
    value instanceof Promise ||
    (typeof value === "object" &&
      value !== null &&
      "then" in value &&
      typeof value.then == "function")
  );
}

type Func = (...args: unknown[]) => unknown;

function isFunction<T>(unit: unknown): unit is () => T {
  return typeof unit === "function";
}

interface Factory<T> {
  (...args: unknown[]): T;
  isFactory: true;
}

function isFactory<T>(unit: unknown): unit is Factory<T> {
  if (!isFunction(unit) && !isPromise(unit)) {
    return false;
  }

  return "isFactory" in unit && unit.isFactory === true;
}

type IsAsyncFactory<T> = T extends { isFactory: true }
  ? T extends (...args: unknown[]) => Promise<unknown>
    ? true
    : T extends Promise<unknown>
      ? true
      : false
  : false;

function isAsyncFactory<T>(unit: T): boolean {
  if (!isFactory(unit)) return false;
  if (isPromise(unit)) return true;
  if (!isFunction(unit)) return false;
  if ("isAsync" in unit && unit.isAsync === true) return true;

  const AsyncFunction = Object.getPrototypeOf(async function () {
    /* nope */
  }).constructor;
  return unit instanceof AsyncFunction;
}

interface PrivateUnit extends Func {
  isPrivate: true;
}

function isPrivate(unit: unknown): unit is PrivateUnit {
  if (unit === null) return false;
  if (isFunction(unit) || isPromise(unit)) {
    return "isPrivate" in unit && unit.isPrivate === true;
  }
  return false;
}

/**
 * Mocks dependency injection for testing by temporarily replacing units with test doubles.
 *
 * @param unit - The function to be tested that uses dependency injection
 * @param units - Mock units to replace the real dependencies during test execution
 * @returns The original function with mocked dependencies injected
 */
export function mockInjection<D extends Func, L extends Hashmap>(
  unit: D,
  units: L,
): D {
  return function (...args: unknown[]) {
    const oldPublicKeys = blockPaths;
    blockPaths = getBlockPaths(units);
    const oldMainCache = unitCache;
    const oldMainDefs = unitDefinitions;
    unitDefinitions = units;
    const result = unit(...args);
    unitCache = oldMainCache;
    unitDefinitions = oldMainDefs;
    blockPaths = oldPublicKeys;
    return result;
  } as D;
}

/**
 * Mocks dependency injection for testing factory functions by replacing units with test doubles.
 *
 * @param unit - The factory function to be tested that returns a function using dependency injection
 * @param units - Mock units to replace the real dependencies during test execution
 * @returns The result of calling the factory function with mocked dependencies
 */
export function mockFactory<D extends Func, L extends Hashmap>(
  unit: D,
  units: L,
): ReturnType<D> {
  return function (...args: unknown[]) {
    const oldPublicKeys = blockPaths;
    blockPaths = getBlockPaths(units);
    const oldMainCache = unitCache;
    const oldMainDefs = unitDefinitions;
    unitDefinitions = units;
    const result = (unit() as Func)(...args);
    unitCache = oldMainCache;
    unitDefinitions = oldMainDefs;
    blockPaths = oldPublicKeys;
    return result;
  } as ReturnType<D>;
}
