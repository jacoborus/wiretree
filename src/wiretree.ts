let mainDefs: List = {};
let mainCache: List = {};
let takenInjectors = new Set<string>();

export function getInjector<L extends List>() {
  return function <N extends string>(
    namespace: N,
  ): BlockInjector<BuildMap<L>, N> {
    return createInjector(namespace);
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
  takenInjectors = new Set<string>();
  return createInjector<Defs, "">();
}

function createInjector<Defs extends List, P extends string>(
  parent = "" as P,
): BlockInjector<BuildMap<Defs>, P> {
  if (takenInjectors.has(parent)) {
    throw new Error(`Injector for "${parent}" is already in use.`);
  }

  type AppObj = BuildMap<Defs>;
  const localCache: Partial<AppObj> = {};
  takenInjectors.add(parent);

  return function <K extends keyof AppObj>(key: K): AppObj[K] {
    if (key in localCache) {
      return localCache[key] as AppObj[K];
    }

    const k = String(key);
    const finalKey = k.startsWith(".") ? `${parent}${k}` : k;

    if (finalKey in mainCache) {
      const unit = mainCache[finalKey];
      localCache[key] = unit;
      return unit;
    }

    const def = mainDefs[finalKey];

    if (!def) {
      throw new Error(
        `Unit ${String(finalKey)} not found from block "${parent}"`,
      );
    }

    if (isFactory(def)) {
      const value = def() as AppObj[K];
      localCache[key] = value;
      mainCache[finalKey] = value;
      return value;
    }

    localCache[key] = def;
    mainCache[finalKey] = def;
    return def;
  } as BlockInjector<AppObj, P>;
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
export function block<L extends List, Prefix extends string>(
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
    const oldMainCache = mainCache;
    mainCache = units;
    const result = unit(...arguments);
    mainCache = oldMainCache;
    return result;
  } as D;
}

export function mockFactory<D extends Func, L extends List>(
  unit: D,
  units: L,
): ReturnType<D> {
  return function () {
    const oldMainCache = mainCache;
    mainCache = units;
    const result = unit()(...arguments);
    mainCache = oldMainCache;
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

type PrefixedKeys<L extends List, P extends string> = {
  [K in keyof L]: K extends `${P}.${infer S}` ? `.${S}` : never;
}[keyof L];

type BlockKeys<L extends List, P extends string> = keyof L | PrefixedKeys<L, P>;

type BlockInjector<L extends List, P extends string> = <
  K extends BlockKeys<L, P>,
>(
  key: K,
) => K extends keyof L
  ? L[K]
  : K extends `.${string}`
    ? `${P}${K}` extends keyof L
      ? L[`${P}${K}`]
      : never
    : never;
