const plainSymbol = Symbol("plain");
const factorySymbol = Symbol("factory");

/**
 * Creates a unit definition that stores a static value.
 *
 * Value definitions are perfect for functions that do not require injection,
 * or any singleton-like value that should be shared across the application.
 * The value is resolved once and cached for all subsequent requests.
 *
 * @template T - The type of the value to be stored
 *
 * @param unit - The static value or object to be injected
 *
 * @returns A value definition object
 *
 * @example
 * ```ts
 * const config = plain({
 *   apiUrl: "https://api.example.com",
 *   timeout: 5000,
 *   retries: 3
 * });
 *
 *
 * const database = plain(createDatabaseConnection());
 * ```
 */
export function plain<T>(unit: T): PlainDef<T> {
  return {
    type: plainSymbol,
    value: unit,
  } as const;
}

/**
 * Creates a unit definition that will generate a new instance of the unit.
 * It will be cached and reused.
 *
 * Factory units are useful for creating instances that require dependencies or
 * require some computation that only has to run once.
 * The factory function bets bound to the injector, allowing it to access other
 * units during instantiation.
 *
 * @template T - The type returned by the factory function
 *
 * @param unit - A factory function that creates instances of type T
 *
 * @returns A factory definition object
 *
 * @example
 * ```ts
 * const httpClient = factory((this: Injector) => {
 *   const config = this("config");
 *   return new HttpClient(config.apiUrl);
 * });
 *
 * const logger = factory(() => new Logger());
 * ```
 */
export function factory<T>(unit: T) {
  return {
    type: factorySymbol,
    value: unit,
  } as const;
}

let currentNamespace = "";
const mainCache: List = {};
const injectors = new Map<string, BulkInjector>();
let mainDefs: List = {};

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
  const appInjector = createInjector<Defs, "">("");
  injectors.set("", appInjector as BulkInjector);
  return appInjector;
}

function createInjector<Defs extends List, P extends string>(
  parent: P,
): BlockInjector<BuildMap<Defs>, P> {
  type AppObj = BuildMap<Defs>;
  if (injectors.has(parent)) {
    return injectors.get(parent) as BlockInjector<AppObj, P>;
  }

  const appCache = mainCache as Partial<AppObj>;
  const localCache: Partial<AppObj> = {};

  const injector = function <K extends keyof AppObj>(key: K): AppObj[K] {
    if (key in localCache) {
      return localCache[key] as AppObj[K];
    }

    if (typeof key !== "string") {
      throw new Error(`Key must be a string, received: ${typeof key}`);
    }

    const finalKey = key.startsWith(".") ? `${parent}${String(key)}` : key;

    if (finalKey in appCache) {
      const unit = appCache[
        finalKey as keyof typeof appCache
      ] as InferUnitValue<Defs[K]>;
      localCache[key] = unit;
      return unit;
    }

    const def = mainDefs[finalKey];

    if (!def) {
      throw new Error(
        `Key ${String(finalKey)} not found from block "${parent}"`,
      );
    }

    if (isPlain(def)) {
      const value = def.value as InferUnitValue<Defs[K]>;
      appCache[finalKey as keyof AppObj] = value;
      return value;
    }

    const finalParent = finalKey.includes(".")
      ? finalKey.split(".").slice(0, -1).join(".")
      : parent;

    if (isFactory(def)) {
      const value = def.value(createInjector(finalParent)) as InferUnitValue<
        Defs[K]
      >;
      localCache[finalKey as keyof AppObj] = value;
      appCache[finalKey as keyof AppObj] = value;
      return value;
    }

    if (isPlain(def)) {
      if (typeof def.value === "function") {
        const f = function () {
          const fun = def.value as Func;
          const prevNamespace = currentNamespace;
          currentNamespace = finalParent;
          const result = fun(arguments);
          currentNamespace = prevNamespace;
          return result;
        };

        localCache[finalKey as keyof AppObj] = f;
        appCache[finalKey as keyof AppObj] = f;
        return f as typeof def;
      }

      localCache[finalKey as keyof AppObj] = def.value;
      appCache[finalKey as keyof AppObj] = def.value;
      return def.value as typeof def;
    }

    if (typeof def.value === "function") {
      const f = function () {
        const prevNamespace = currentNamespace;
        currentNamespace = finalParent;
        const result = def.call(arguments);
        currentNamespace = prevNamespace;
        return result;
      };

      localCache[finalKey as keyof AppObj] = f;
      appCache[finalKey as keyof AppObj] = f;
      return f as typeof def;
    }

    return def;
  };

  injectors.set(parent, injector as BulkInjector);

  return injector as BlockInjector<AppObj, P>;
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
) {
  return Object.fromEntries(
    Object.entries(units).map(([key, value]) => {
      const def = isFactory(value)
        ? value
        : isPlain(value)
          ? value
          : plain(value);

      return [
        `${name}.${key}`,
        {
          type: def.type,
          value: def.value,
        },
      ];
    }),
  ) as Namespaced<Prefix, L>;
}

function isPlain<T>(unit: Definition): unit is PlainDef<T> {
  return unit.type === plainSymbol;
}
function isFactory<T extends Func>(unit: Definition): unit is FactoryDef<T> {
  return unit.type === factorySymbol;
}

// =======

type List = Record<string, any>;

interface FactoryDef<T> {
  type: typeof factorySymbol;
  value: (...args: any[]) => T;
  parent?: string;
}

interface PlainDef<T> {
  type: typeof plainSymbol;
  value: T;
  parent?: string;
}

type Definition = FactoryDef<any> | PlainDef<any>;

type BulkInjector = <K extends keyof U, U extends List>(key: K) => U[K];

type InferUnitValue<D> =
  D extends FactoryDef<infer T>
    ? T //
    : D extends PlainDef<infer V>
      ? V
      : D;

type Func = (...args: any[]) => any;

type Namespaced<N extends string, L extends List> = {
  [K in keyof L as `${N}.${Extract<K, string>}`]: L[K];
};

type KeyOf<K extends string, E extends Definition> = E["parent"] extends string
  ? `${E["parent"]}.${K}`
  : K;

type BuildMap<T extends List> = {
  [K in keyof T as KeyOf<Extract<K, string>, T[K]>]: InferUnitValue<T[K]>;
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

export type InjectFrom<L extends List, B extends string> = BlockInjector<
  BuildMap<L>,
  B
>;
