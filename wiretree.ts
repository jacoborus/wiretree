const plainSymbol = Symbol("plain");
const factorySymbol = Symbol("factory");
const boundSymbol = Symbol("bound");

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
export function plain<T>(unit: T) {
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

/**
 * Creates a bound definition where the unit is a function that is bound to the
 * dependency injection context. It will be cached and reused
 *
 * Bound definitions are ideal for functions that need access to other units
 * through the `this` context. The function will be bound to an injector, allowing
 * it to call `this("dependencyKey")` to resolve other units.
 *
 * @template T - The type of the function to be bound
 *
 * @param unit - A function that will be bound to the injection context
 *
 * @returns A bound definition object with type metadata
 *
 * @example
 * ```ts
 * const userService = bound(function(this: Injector, id: string) {
 *   const db = this("db");
 *   const log = this("logger.log");
 *   log('Fetching user:', id);
 *   return db.users.find(user => user.id === id);
 * });
 * ```
 */
export function bound<T>(unit: T) {
  return {
    type: boundSymbol,
    value: unit,
  } as const;
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
export function createApp<Defs extends DefList>(defs: Defs) {
  type AppObj = BuildMap<Defs>;
  const appCache: Partial<AppObj> = {};
  const injectors: Map<string, BulkInjector> = new Map();
  const appInjector = getInjector("");
  injectors.set("", appInjector as BulkInjector);
  return appInjector;

  function getInjector<P extends string>(parent: P): BlockInjector<AppObj, P> {
    if (injectors.has(parent)) {
      return injectors.get(parent) as BlockInjector<AppObj, P>;
    }

    const localCache: Partial<AppObj> = {};

    const injector = function app<K extends keyof AppObj>(key: K): AppObj[K] {
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

      const unit = Object.entries(defs).find(
        ([name, def]) =>
          (def.parent ? `${def.parent}.${name}` : name) === finalKey,
      )?.[1];

      if (!unit) {
        throw new Error(`Key ${String(finalKey)} not found in block`);
      }

      if (isPlain(unit)) {
        const value = unit.value as InferUnitValue<Defs[K]>;
        appCache[finalKey as keyof AppObj] = value;
        return value;
      }

      const finalParent = finalKey.includes(".")
        ? finalKey.split(".").slice(0, -1).join(".")
        : parent;

      if (isBound(unit)) {
        const value = unit.value.bind(
          getInjector(finalParent),
        ) as InferUnitValue<Defs[K]>;
        localCache[finalKey as keyof AppObj] = value;
        appCache[finalKey as keyof AppObj] = value;
        return value;
      }

      if (isFactory(unit)) {
        const value = unit.value.bind(
          getInjector(finalParent),
        )() as InferUnitValue<Defs[K]>;
        localCache[finalKey as keyof AppObj] = value;
        appCache[finalKey as keyof AppObj] = value;
        return value;
      }

      throw new Error(`Wrong format in "${String(finalKey)}"`);
    };

    injectors.set(parent, injector as BulkInjector);

    return injector as BlockInjector<AppObj, P>;
  }
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
 *   repository: bound(userRepository),
 *   validator: plain(new UserValidator()),
 * });
 *
 * // Results in units accessible as:
 * // "@user.service", "@user.repository", "@user.validator"
 * // Or from the same block:
 * // ".service", ".repository", ".validator"
 * ```
 */
export function block<D extends DefList, Prefix extends string>(
  name: Prefix,
  units: D,
) {
  return Object.fromEntries(
    Object.entries(units).map(([key, value]) => [
      key,
      {
        type: value.type,
        value: value.value,
        parent: value.parent ? `${name}.${value.parent}` : name,
      },
    ]),
  ) as {
    [K in keyof D]: ParentedDefinition<Prefix, D[K]>;
  };
}

function isBound<T extends Func>(unit: Definition): unit is BoundDef<T> {
  return unit.type === boundSymbol;
}
function isFactory<T extends Func>(unit: Definition): unit is FactoryDef<T> {
  return unit.type === factorySymbol;
}
function isPlain<T>(unit: Definition): unit is PlainDef<T> {
  return unit.type === plainSymbol;
}

// =======

type DefList = Record<string, Definition>;
type List = Record<string, any>;

interface BoundDef<T> {
  type: typeof boundSymbol;
  value: T & ThisType<BulkInjector>;
  parent?: string;
}

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

type Definition = BoundDef<any> | FactoryDef<any> | PlainDef<any>;

type BulkInjector = <K extends keyof U, U extends List>(key: K) => U[K];

type InferUnitValue<D> =
  D extends FactoryDef<infer T>
    ? T
    : D extends BoundDef<infer B>
      ? OmitThisParameter<B>
      : D extends PlainDef<infer V>
        ? V
        : never;

type Func = (...args: any[]) => any;

interface ParentedDefinition<P extends string, D extends Definition> {
  type: D["type"];
  value: D["value"];
  parent: D["parent"] extends string ? `${P}.${D["parent"]}` : P;
}

type KeyOf<K extends string, E extends Definition> = E["parent"] extends string
  ? `${E["parent"]}.${K}`
  : K;

type BuildMap<T extends Record<string, Definition>> = {
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

// Testing utility
export function getFakeInjector<L extends List, P extends string>(
  list: L,
): BlockInjector<L, P> {
  return function (key: string) {
    if (key in list) {
      return list[key as keyof L];
    }
    throw new Error(`Unit "${key}" not found in fake block`);
  } as BlockInjector<L, P>;
}
