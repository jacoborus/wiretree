type Hashmap = Record<string, unknown>;
type Block<T extends Hashmap> = T & {
  $: BlockTag<string>;
};
type BlocksMap = Record<string, Block<Hashmap>>;

const blockSymbol = Symbol("BlockSymbol");
let unitCache: Hashmap = {};
let proxiesCache = new Map<string, unknown>();

type WiredUp<Defs extends Hashmap> =
  AnyItemContainsAnyAsyncFactory<Defs> extends true
    ? Promise<Wire<Defs, "">>
    : Wire<Defs, "">;

type AnyItemContainsAnyAsyncFactory<R extends Hashmap> =
  R[keyof R] extends Hashmap ? ContainsAsyncFactory<R[keyof R]> : false;

type ContainsAsyncFactory<T extends Hashmap> = {
  [K in keyof T]: IsAsyncFactory<T[K]>;
}[keyof T] extends true
  ? true
  : false;

interface Wire<D extends Hashmap, N extends string> {
  // root block resolution
  (): BlockProxy<ExtractUnitValues<D, "">, false>;
  // local and absolute block resolution
  <K extends "." | keyof D>(
    blockPath?: K,
  ): BlockProxy<
    ExtractUnitValues<D, K extends "." ? N : K>,
    K extends `.${string}` ? true : false
  >;
}

type ExtractUnitValues<H extends Hashmap, K extends keyof H> = Omit<
  H[K],
  "$" | ExtractBlockKeys<H[K]>
>;

/** From an object, extract the keys that contain blocks */
type ExtractBlockKeys<T> = {
  [K in keyof T]: T[K] extends Block<Hashmap> ? K : never;
}[keyof T];

/**
 * Wires up a set of unit definitions and blocks for dependency injection.
 *
 * To create a block, export a `$` variable from your module using `tagBlock("blockName")`.
 * All exported properties (except `$`) become units of the block.
 *
 * @param defs - Object containing unit definitions and imported blocks. Each block should export a `$` tag via `tagBlock`.
 * @returns Promise<Wire> if any async factory units exist, otherwise Wire for synchronous resolution.
 * @example
 * ```ts
 * // In app.ts:
 * import * as userMod from "./userMod.ts";
 * const defs = {
 *   config: { port: 3000 },
 *   userService: userMod
 * };
 * const app = wireUp(defs);
 *
 * // Access root units
 * console.log(app().config.port); // 3000
 *
 * // Access block units
 * app("user.service").addUser("name", "email");
 * ```
 */
export function wireUp<Defs extends Hashmap>(
  defs: Defs,
): WiredUp<InferBlocks<Defs>> {
  const finalDefinitions = Object.assign(defs, { $: tagBlock("") });
  const blockDefinitions = mapBlocks(finalDefinitions);
  blockDefinitions[""] = finalDefinitions;

  unitCache = {};
  proxiesCache = new Map();
  feedBlockTags(blockDefinitions);
  const wire = prepareWire("", blockDefinitions);

  if (hasAsyncKeys(blockDefinitions)) {
    // This will cause wireUp to return a promise that resolves
    // when all async factories are resolved
    return resolveAsyncFactories(blockDefinitions).then(() => wire) as WiredUp<
      InferBlocks<Defs>
    >;
  }

  return wire as WiredUp<InferBlocks<Defs>>;
}

/**
 * Infers the structure of all blocks and units from a definitions object.
 *
 * Use this type to get the correct typings for your wired app.
 *
 * @example
 * const defs = { user: userMod, config: { port: 3000 } };
 * export type Defs = InferBlocks<typeof defs>;
 */
export type InferBlocks<R extends Hashmap> = {
  [K in BlockPaths<R>]: K extends "" ? R : PathValue<R, K>;
};

// Access type by a dot notated path
type PathValue<T, P extends string> = P extends `${infer K}.${infer Rest}`
  ? K extends keyof T
    ? PathValue<T[K], Rest>
    : never
  : P extends keyof T
    ? T[P] extends Block<Hashmap>
      ? T[P]
      : never
    : never;

/**
 * Extracts the dot composed paths of the blocks that contain units
 *
 * BlockPaths<{
 *   a: 1,
 *   "b.c": 2,
 *   "b.d": 3,
 *   "b.e.f.other": 3,
 * }> // "b" | "b.e.f":
 */
type BlockPaths<T extends Hashmap, P extends string = ""> =
  | ""
  | {
      [K in keyof T]: T[K] extends Hashmap
        ?
            | (HasUnits<T[K]> extends true
                ? P extends ""
                  ? `${Extract<K, string>}`
                  : `${P}.${Extract<K, string>}`
                : never)
            | (T[K] extends Block<T[K]>
                ? HasBlocks<T[K]> extends true
                  ? BlockPaths<
                      T[K],
                      P extends ""
                        ? Extract<K, string>
                        : `${P}.${Extract<K, string>}`
                    >
                  : never
                : never)
        : never;
    }[keyof T];

function mapBlocks<L extends Hashmap>(blocks: L, prefix?: string): BlocksMap {
  const mapped: BlocksMap = {};

  Object.keys(blocks).forEach((key) => {
    const block = blocks[key];

    if (itemIsBlock(block)) {
      const tagName = getBlockTagName(block.$);

      // this is the key of the block given the path
      const finalKey = prefix ? `${prefix}.${key}` : key;

      // check if the tag name matches block path
      if (tagName !== finalKey) {
        throw new Error(
          `Block tag "${tagName}" does not match key "${finalKey}".`,
        );
      }

      // only blocks with units are wireable
      if (hasUnits(block)) {
        mapped[finalKey] = block;
      }

      // loop through sub-blocks
      if (hasBlocks(block)) {
        const subBlocks = mapBlocks(block, finalKey);
        Object.assign(mapped, subBlocks);
      }
    }
  });

  return mapped;
}

/** Whether an object contains items that are neither blocks nor blockTags */
type HasUnits<T extends Hashmap> = true extends {
  [K in keyof T]: IsBlock<T[K]> extends true
    ? false
    : K extends "$"
      ? false
      : true;
}[keyof T]
  ? true
  : false;

function hasUnits(item: Block<Hashmap>): boolean {
  return Object.keys(item).some((key) => {
    if (isBlockTag(item[key])) return false;
    return !itemIsBlock(item[key]);
  });
}

/** Whether an object contains items that are blocks */
type HasBlocks<T extends Hashmap> = true extends {
  [K in keyof T]: T[K] extends Block<Hashmap> ? true : false;
}[keyof T]
  ? true
  : false;

function hasBlocks(item: Hashmap): boolean {
  if (item === null || typeof item !== "object") return false;
  return Object.keys(item).some((key) => itemIsBlock(item[key]));
}

/** Check if any of the definitions are async factories */
function hasAsyncKeys(blockDefs: BlocksMap): boolean {
  return Object.keys(blockDefs).some((blockKey) => {
    const block = blockDefs[blockKey];

    return Object.keys(block).some((key) => {
      const item = block[key];
      return isAsyncFactory(item);
    });
  });
}

function feedBlockTags(defs: BlocksMap): void {
  const blockPaths = Object.keys(defs);
  blockPaths.forEach((path) => {
    const block = defs[path];
    block.$.feed(defs);
  });
}

async function resolveAsyncFactories(defs: BlocksMap): Promise<void> {
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

interface BlockTag<N extends string> {
  <L extends Hashmap>(): Wire<L, N>;
  readonly [blockSymbol]: N;
  feed: (defs: Hashmap) => void;
}

/**
 * Creates a block tag for a module, enabling it to be wired as a block.
 *
 * Export the result as `$` from your module to mark it as a block.
 * All other exports become units of the block.
 *
 * @param namespace - The name/path of the block (should match the key used in wireUp).
 * @returns BlockTag object to be exported as `$`.
 * @example
 * ```ts
 * // In userMod.ts:
 * import * as userService from "./userService.ts"
 * export const $ = tagBlock("user");
 * export const service = userService
 *
 * // In userService.ts:
 * export const $ = tagBlock("user.service");
 * export function addUser () {...}
 * export function getUsers () {...}
 *
 * // In app.ts:
 * import * as userMod from "./userMod.ts";
 * const defs = { user: userMod };
 * const app = wireUp(defs);
 * app("user.service").addUser(...);
 * ```
 */
export function tagBlock<N extends string>(namespace: N): BlockTag<N> {
  const blockDefs: BlocksMap = {};

  return Object.assign(
    function f<Defs extends Hashmap>(): Wire<Defs, N> {
      return prepareWire(namespace, blockDefs) as Wire<Defs, N>;
    },
    {
      get [blockSymbol]() {
        return namespace;
      },
      feed(defs: Hashmap) {
        Object.assign(blockDefs, defs);
      },
    },
  ) as BlockTag<N>;
}

type IsBlock<T> = T extends { $: { [blockSymbol]: string } } ? true : false;

function itemIsBlock(item: unknown): item is Block<Hashmap> {
  return (
    item !== null &&
    typeof item === "object" &&
    "$" in item &&
    isBlockTag(item.$)
  );
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

function prepareWire<Defs extends BlocksMap, P extends keyof Defs>(
  localPath: P,
  blockDefs: Defs,
) {
  const localCache: Hashmap = {};

  return function createWire(blockPath?: string) {
    const blockPaths = Object.keys(blockDefs);
    const key = blockPath ?? "";

    if (key in localCache) {
      return localCache[key];
    }

    const k = String(key);

    let proxy;

    if (k === ".") {
      // local block resolution, exposes private units

      proxy = createBlockProxy(blockDefs[localPath], true);
    } else if (k === "") {
      // root block resolution

      proxy = createBlockProxy(blockDefs[""], false);
    } else if (blockPaths.includes(k)) {
      // external block resolution, uses absolute path of the block

      proxy = createBlockProxy(blockDefs[k], false);
    } else {
      throw new Error(`Unit ${k} not found from block "${parent}"`);
    }

    localCache[k] = proxy;
    proxiesCache.set(k, proxy);
    return proxy;
  };
}

type BlockProxy<B extends Hashmap, Local extends boolean> = Local extends true
  ? { [K in keyof B]: InferUnitValue<B[K]> }
  : { [K in keyof B]: InferPublicUnitValue<B[K]> };

type InferUnitValue<D> =
  D extends Factory<infer T> ? (T extends Promise<infer V> ? V : T) : D;

type InferPublicUnitValue<D> = D extends PrivateUnit
  ? never
  : InferUnitValue<D>;

function createBlockProxy<B extends Block<Hashmap>, Local extends boolean>(
  blockDef: B,
  local: Local,
) {
  const unitKeys = getBlockUnitPaths(blockDef, local);
  const blockPath = getBlockTagName(blockDef.$);

  return new Proxy(
    {}, // used as a cache for the block
    {
      get: <K extends string>(cachedblock: Hashmap, prop: K) => {
        if (prop in cachedblock) {
          return cachedblock[prop];
        }

        if (prop === "$") {
          throw new Error(`Block '${blockPath}' has no unit named '${prop}'`);
        }

        const finalKey = `${blockPath}.${prop}`;
        if (finalKey in unitCache) {
          const unit = unitCache[finalKey];
          cachedblock[prop] = unit;
          return unit;
        }

        if (unitKeys.includes(prop)) {
          const def = blockDef[prop];

          const d = def;
          if (itemIsBlock(d)) {
            throw new Error(`Block '${blockPath}' has no unit named '${prop}'`);
          }

          const unit = isFactory(def) ? def() : def;

          cachedblock[prop] = unit;
          unitCache[finalKey] = unit;
          return def;
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

/** Extracts the paths of the units of a block. */
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
  (...args: unknown[]): Promise<T>;
  isFactory: true;
}

function isFactory<T>(unit: unknown): unit is Factory<T> {
  if (!isFunction(unit) && !isPromise(unit)) {
    return false;
  }
  return "isFactory" in unit && unit.isFactory === true;
}

type IsAsyncFactory<T> =
  T extends Factory<unknown>
    ? T extends { isAsync: true }
      ? true
      : false
    : false;

function isAsyncFactory<T>(unit: T): boolean {
  if (!isFactory(unit)) return false;
  if (isPromise(unit)) return true;
  if (!isFunction(unit)) return false;
  if ("isAsync" in unit && unit.isAsync === true) return true;

  const AsyncFunction = Object.getPrototypeOf(async function () {
    // not empty anymore
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
