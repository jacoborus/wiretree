type Hashmap = Record<string, unknown>;
type RecordMap = Record<string, Hashmap>;

type Block<T extends Hashmap> = T & { [blockSymbol]: string };

const blockSymbol = Symbol("BlockSymbol");
let unitCache: Hashmap = {};
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
 * @example
 * // Define your units
 * const units = {
 *   config: { port: 3000, host: "localhost" },
 *   ...createBlock("database", {
 *     connection: () => ({ url: "mongodb://localhost" }),
 *     users: [],
 *   }),
 * };
 *
 * // Wire the application
 * const app = wireUp(units);
 *
 * // Access units at root level
 * const root = app();
 * console.log(root.config.port); // 3000
 *
 * // Access units inside a block
 * const db = app("database");
 * console.log(db.connection.url); // "mongodb://localhost"
 */
export function wireUp<Defs extends Hashmap>(defs: Defs): WiredApp<Defs> {
  const finalDefinitions = Object.assign(defs, { default: tagBlock("") });
  const blockDefinitions = mapBlocks(finalDefinitions);
  Object.assign(blockDefinitions, mapRoot(defs));
  unitCache = {};
  proxiesCache = new Map();
  feedBlockTags(blockDefinitions);
  console.log(JSON.stringify(""));
  const injector = generateInjector("", blockDefinitions);

  if (hasAsyncKeys(blockDefinitions)) {
    // This will cause wireUp to return a promise that resolves
    // when all async factories are resolved
    return resolveAsyncFactories(blockDefinitions).then(
      () => injector,
    ) as WiredApp<Defs>;
  }

  return injector as unknown as WiredApp<Defs>;
}

// type Unpack<T> = {
//   [K in keyof T]: Unpack<T[K]>;
// };

/** Extract keys with no dots in them */
type NoDots<T extends string> = T extends `${string}.${string}` ? never : T;

function mapBlocks<L extends Hashmap>(
  blocks: L,
  prefix?: string,
): Record<string, Hashmap> {
  const mapped: Record<string, Hashmap> = {};

  Object.keys(blocks).forEach((key) => {
    const block = blocks[key];

    if (itemIsBlock(block)) {
      const tagName = getBlockTagName(block.default as BlockTag<string>);

      // this is the key of the block given the path
      const finalKey = prefix ? `${prefix}.${key}` : key;

      // check if the tag name matches block path
      if (tagName !== finalKey) {
        throw new Error(
          `Block tag "${tagName}" does not match key "${finalKey}".`,
        );
      }

      // only blocks with units are injectable
      if (blockHasUnits(block)) {
        mapped[tagName] = block;
      }

      // loop through sub-blocks
      if (blockHasBlocks(block)) {
        const subBlocks = mapBlocks(block as Hashmap, finalKey);
        Object.assign(mapped, subBlocks);
      }
    }
  });

  return mapped;
}

function mapRoot<L extends Hashmap>(blocks: L): Record<string, Hashmap> {
  const mapped: Record<string, Hashmap> = {};

  const block = blocks;

  // only blocks with units are injectable
  if (blockHasUnits(block)) {
    mapped[""] = block;
  }

  return mapped;
}

function blockHasUnits(item: Block<any>): boolean {
  return Object.keys(item).some((key) => {
    if (isBlockTag(item[key])) return false;
    return !itemIsBlock(item[key as keyof typeof item]);
  });
}

function blockHasBlocks(item: unknown): boolean {
  if (item === null || typeof item !== "object") return false;
  return Object.keys(item).some((key) =>
    itemIsBlock(item[key as keyof typeof item]),
  );
}

/** Check if any of the definitions are async factories */
function hasAsyncKeys(blockDefs: RecordMap): boolean {
  return Object.keys(blockDefs).some((blockKey) => {
    const block = blockDefs[blockKey];

    return Object.keys(block).some((key) => {
      const item = block[key];
      return isAsyncFactory(item);
    });
  });
}

function feedBlockTags(defs: Hashmap): void {
  const blockPaths = Object.keys(defs);
  blockPaths.forEach((path) => {
    const block = defs[path];
    block.default.feed(defs);
  });
}

async function resolveAsyncFactories(defs: RecordMap): Promise<void> {
  const blockKeys = Object.keys(defs);

  for await (const blockKey of blockKeys) {
    const block = defs[blockKey];
    const keys = Object.keys(block);

    for await (const key of keys) {
      const item = block[key];
      if ((isFunction(item) || isPromise(item)) && isFactory(item)) {
        const finalKey = blockKey === "" ? key : `${blockKey}.${key}`;
        unitCache[finalKey] = await item();
      }
    }
  }
}

function itemIsBlock(item: unknown): item is Block<any> {
  return (
    item !== null &&
    typeof item === "object" &&
    "default" in item &&
    isBlockTag(item.default)
  );
}

interface BlockTag<N extends string> {
  <L extends RecordMap>(): Wire<L>;
  readonly [blockSymbol]: N;
  feed: (defs: RecordMap) => void;
}

export function tagBlock<N extends string>(namespace: N): BlockTag<N> {
  const blockDefs: RecordMap = {};

  function f() {
    console.log(JSON.stringify(namespace));
    return generateInjector(namespace, blockDefs);
  }

  const o = {
    get [blockSymbol]() {
      return namespace;
    },
    feed(defs: RecordMap) {
      Object.assign(blockDefs, defs);
    },
  };
  return Object.assign(f, o);
}

function getBlockTagName<N extends string, T extends BlockTag<N>>(tag: T): N {
  return tag[blockSymbol];
}

function isBlockTag(thing: unknown): thing is BlockTag<string> {
  return (
    typeof thing === "function" &&
    blockSymbol in thing &&
    typeof thing[blockSymbol] === "string"
  );
}

function generateInjector(localPath: string, blockDefs: RecordMap) {
  if (!blockDefs) console.trace();
  const localCache: Hashmap = {};

  function blockInjector(blockPath?: string) {
    const blockPaths = Object.keys(blockDefs);
    const key = blockPath ?? "";

    if (key in localCache) {
      return localCache[key] as any;
    }

    const k = String(key);

    let proxy;

    if (k === ".") {
      // local block resolution, exposes private units
      proxy = createBlockProxy(blockDefs[localPath], true) as unknown as any;
    } else if (k === "") {
      // root block resolution
      proxy = createBlockProxy(blockDefs[""], false) as any;
    } else if (blockPaths.includes(k)) {
      // external block resolution, uses absolute path of the block
      proxy = createBlockProxy(blockDefs[k], false) as unknown as any;
    } else {
      throw new Error(`Unit ${k} not found from block "${parent}"`);
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
    ? L[K] extends PrivateUnit
      ? never
      : UnitName //
    : never;
}[keyof L];

type BlockProxy<
  B extends Block<any>,
  Local extends boolean,
> = Local extends true
  ? {
      [K in keyof B]: InferAllUnitValue<B[K]>;
    }
  : {
      [K in keyof B]: InferPublicUnitValue<B[K]>;
    };

type InferAllUnitValue<D> =
  D extends Factory<infer T> ? (T extends Promise<infer V> ? V : T) : D;

type InferPublicUnitValue<D> = D extends PrivateUnit
  ? never
  : D extends Factory<infer T>
    ? T extends Promise<infer V>
      ? V
      : T
    : D;

function createBlockProxy<B extends Block<Hashmap>, Local extends boolean>(
  blockDef: B,
  local: Local,
) {
  const unitKeys = getBlockUnitPaths(blockDef, local);
  const blockPath = getBlockTagName(blockDef.default);

  return new Proxy(
    {}, // used as a cache for the block
    {
      get: <K extends string>(cachedblock: Hashmap, prop: K) => {
        if (prop in cachedblock) {
          return cachedblock[prop] as any;
        }

        const finalKey = `${blockPath}.${prop}`;
        if (finalKey in unitCache) {
          const unit = unitCache[finalKey];
          cachedblock[prop] = unit;
          return unit;
        }

        if (unitKeys.includes(prop)) {
          const def = blockDef[prop];

          const unit = isFactory(def) ? def() : def;

          cachedblock[prop] = unit;
          unitCache[finalKey] = unit;
          return def as any;
        }

        throw new Error(`Block '${blockPath}' has no unit named '${prop}'`);
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
  );
}

/**
 * Extracts the paths of the units of a block.
 */
function getBlockUnitPaths<B extends Hashmap, Local extends boolean>(
  blockDef: B,
  local: Local,
) {
  return Object.keys(blockDef).filter((key) => {
    const def = blockDef[key];
    if (isBlockTag(def)) return false;
    return local ? true : !isPrivate(def) ? true : false;
  });
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
    /* not empty anymore */
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
