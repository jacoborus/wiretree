let mainDefs: List = {};
let mainCache: List = {};
let takenInjectors = new Set<string>();
let publicKeys: string[] = [];
let proxiesCache: Record<string, any> = {};

export function getInjector<L extends List>() {
  return function <N extends string>(
    namespace = "#" as N,
  ): BlockInjector<BuildMap<L>, N> {
    return createInjector<L, N>(namespace);
  };
}

/**
 * Creates the main application injector that manages all units and their resolution.
 *
 * This is the core function that creates a dependency injection container. It provides
 * automatic dependency resolution, caching, and hierarchical dependency management.
 * The returned injector function can resolve any unit defined in the application.
 *
 * @template Defs - The type of the unit definitions object
 *
 * @param defs - Object containing all unit definitions for the application
 *
 * @returns The root injector function that can resolve any unit by key
 *
 * @example
 * ```ts
 * const app = createApp({
 *   db: plain(database),
 *   logger: factory(() => new Logger()),
 *   ...userModule,
 * });
 *
 * // Use the injector to get units
 * const db = app("db");
 * const logger = app("logger");
 * const getUser = app("@user.service.getUSer");
 * ```
 */
export function createApp<Defs extends List>(defs: Defs) {
  mainDefs = defs;
  mainCache = {};
  proxiesCache = {};
  publicKeys = getPublicKeys(defs);
  takenInjectors = new Set<string>();
  return createInjector<Defs, "#">("#");
}

function createInjector<Defs extends List, P extends string>(
  parent = "#" as P,
): BlockInjector<BuildMap<Defs>, P> {
  if (takenInjectors.has(parent)) {
    throw new Error(`Injector for "${parent}" is already in use.`);
  }

  type AppObj = BuildMap<Defs>;
  const localCache: Record<string, any> = {};
  takenInjectors.add(parent);

  return function <K extends "." | "#" | BlockKeys<AppObj>>(
    key = "#" as K,
  ): BlockProxy<AppObj, P, K> {
    type ThisProxy = BlockProxy<AppObj, P, K>;
    if (key in localCache) {
      return localCache[key] as ThisProxy;
    }

    const k = String(key);
    if (k === ".") {
      const proxy = createBlockProxy(parent) as unknown as ThisProxy;
      localCache["."] = proxy;
      proxiesCache[parent] = proxy;
      return proxy;
    }

    if (k === "#") {
      const proxy = createBlockProxy("#") as ThisProxy;
      localCache["#"] = proxy;
      proxiesCache["#"] = proxy;
      return proxy;
    }

    if (publicKeys.includes(k)) {
      const proxy = createBlockProxy(k) as ThisProxy;
      localCache[k] = proxy;
      proxiesCache[k] = proxy;
      return proxy;
    }

    throw new Error(`Unit ${String(key)} not found from block "${parent}"`);
  };
}

function getPublicKeys<L extends List>(defs: L): BlockKeys<L>[] {
  return Object.keys(defs)
    .filter((key) => key.split(".").length > 1)
    .map((key) => {
      const parts = key.split(".");
      return parts
        .slice(0, parts.length - 1)
        .join(".") as BlockKeys<L>[][number];
    });
}

function createBlockProxy<L extends List, P extends string, N extends string>(
  namespace: N,
): BlockProxy<L, P, N> {
  const cachedblock: Record<string, any> = {};
  const unitKeys =
    namespace === "#"
      ? Object.keys(mainDefs).filter((key) => key.split(".").length === 1)
      : Object.keys(mainDefs).filter(
          (key) =>
            key.startsWith(`${namespace}.`) &&
            key.slice(namespace.length + 1).split(".").length === 1,
        );

  return new Proxy(
    {},
    {
      get: (_, prop: string) => {
        if (prop in cachedblock) {
          return cachedblock[prop];
        }

        const finalKey = namespace === "#" ? prop : `${namespace}.${prop}`;

        if (unitKeys.includes(finalKey)) {
          const def = mainDefs[finalKey];

          if (isFactory(def)) {
            const value = def();
            cachedblock[prop] = value;
            mainCache[finalKey] = value;
            return value;
          }

          cachedblock[prop] = def;
          mainCache[finalKey] = def;
          return def;
        }

        throw new Error(
          `Key ${String(prop)} not found in block "${namespace}"`,
        );
      },
    },
  ) as BlockProxy<L, P, N>;
}

/**
 * Creates a namespaced block of units.
 *
 * This function takes a collection of unit definitions and organizes them
 * under a common namespace. Each definition in the block will have its parent
 * property augmented to set to the block's name as its antecessor, enabling
 * hierarchical dependency resolution.
 *
 * @template D - The type of the dependency definitions object
 * @template Prefix - The string literal type of the namespace prefix
 *
 * @param name - The namespace prefix for the block (e.g., "@user", "@api")
 * @param units - Object containing unit definitions to be grouped
 *
 * @returns A block object with prefixed parent properties
 *
 * @example
 * ```ts
 * const userBlock = block("@user", {
 *   ...userService, // another block
 *   repository: userRepository,
 *   validator: plain(new UserValidator()),
 * });
 *
 * // Results in units accessible as:
 * // "@user.service", "@user.repository", "@user.validator"
 * // Or from the same block:
 * // ".service", ".repository", ".validator"
 * ```
 */
export function createBlock<L extends List, Prefix extends string>(
  name: Prefix,
  units: L,
): Namespaced<Prefix, L> {
  const result: Record<string, unknown> = {};
  for (const key in units) {
    if (Object.prototype.hasOwnProperty.call(units, key)) {
      result[`${name}.${key}`] = units[key];
    }
  }
  return result as Namespaced<Prefix, L>;
}

export function mockInjection<D extends Func, L extends List>(
  unit: D,
  units: L,
): D {
  return function () {
    const oldPublicKeys = publicKeys;
    publicKeys = getPublicKeys(units);
    const oldMainCache = mainCache;
    const oldMainDefs = mainDefs;
    mainDefs = units;
    const result = unit(...arguments);
    mainCache = oldMainCache;
    mainDefs = oldMainDefs;
    publicKeys = oldPublicKeys;
    return result;
  } as D;
}

export function mockFactory<D extends Func, L extends List>(
  unit: D,
  units: L,
): ReturnType<D> {
  return function () {
    const oldPublicKeys = publicKeys;
    publicKeys = getPublicKeys(units);
    const oldMainCache = mainCache;
    const oldMainDefs = mainDefs;
    mainDefs = units;
    const result = unit()(...arguments);
    mainCache = oldMainCache;
    mainDefs = oldMainDefs;
    publicKeys = oldPublicKeys;
    return result;
  } as ReturnType<D>;
}

function isFactory<T>(unit: () => T): unit is Factory<T> {
  return (
    typeof unit === "function" && "factory" in unit && unit.factory === true
  );
}
type IsFactory<F> = F extends { (): any; factory: true } ? true : false;

// =======

type List = Record<string, any>;

interface Factory<T> {
  (...args: any[]): T;
  factory: true;
}

type InferUnitValue<D> =
  D extends Factory<infer T>
    ? T //
    : D;

type Func = (...args: any[]) => any;

type Namespaced<N extends string, L extends List> = {
  [K in keyof L as `${N}.${Extract<K, string>}`]: L[K];
};

type BuildMap<T extends List> = {
  [K in keyof T as Extract<K, string>]: InferUnitValue<T[K]>;
};

type BlockInjector<L extends List, P extends string> = <
  K extends BlockKeys<List> | "." | "#",
>(
  key: K,
) => BlockProxy<L, P, K>;

type BlockProxy<
  L extends List,
  P extends string,
  N extends string,
> = N extends "."
  ? {
      [K in UnitKeys<L, P>]: L[`${P}.${K}`];
    } //
  : N extends "#"
    ? {
        [K in UnitKeys<L, "#">]: L["#"];
      }
    : {
        [K in UnitKeys<L, N>]: L[`${N}.${K}`];
      };

type NoDots<T extends string> = T extends `${string}.${string}` ? never : T;

type UnitKeys<L extends List, N extends string> = {
  [K in keyof L]: N extends "#"
    ? K extends NoDots<infer UnitName>
      ? UnitName
      : never
    : K extends `${N}.${NoDots<infer UnitName>}`
      ? UnitName
      : never;
}[keyof L];

type ParentKey<T extends string> = T extends `${infer S}.${infer C}`
  ? C extends NoDots<C>
    ? S
    : `${S}.${ParentKey<C>}`
  : never;

type BlockKey<K extends string> =
  K extends NoDots<K>
    ? never // unit in root
    : ParentKey<K>; // block name

type BlockKeys<L extends List> = {
  [K in keyof L]: BlockKey<Extract<K, string>>;
}[keyof L];

const o = {
  a: 1,
  "b.c": 2,
  "b.c.otro": 2,
  otro: 3,
};

export type X = BlockKeys<typeof o>;
