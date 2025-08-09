let unitDefinitions: List = {};
let unitCache: List = {};
let takenInjectorsKeys = new Set<string>();
let blockPaths: string[] = [];
let proxiesCache = new Map<string, unknown>();

export function createInjector<L extends List>() {
  return function <N extends BlockPaths<L>>(namespace: N): BlockInjector<L, N> {
    return generateInjector<L, N>(namespace);
  };
}

type WiredApp<Defs extends List> =
  HasAsync<Defs> extends true
    ? Promise<BlockInjector<Defs, "">>
    : BlockInjector<Defs, "">;

export function wireApp<Defs extends List>(defs: Defs): WiredApp<Defs> {
  unitDefinitions = defs;
  unitCache = {};
  proxiesCache = new Map();
  blockPaths = getBlockPaths(defs);
  takenInjectorsKeys = new Set<string>();
  const injector = generateInjector<Defs, "">("");

  const asyncKeys = listAsyncKeys(defs);
  if (!asyncKeys.length) {
    return injector as WiredApp<Defs>;
  }

  return resolveAsyncFactories(asyncKeys).then(
    () => injector,
  ) as WiredApp<Defs>;
}

async function resolveAsyncFactories<L extends List>(
  asyncKeys: string[],
): Promise<void> {
  const defs = unitDefinitions as L;

  for await (const key of asyncKeys) {
    const unitDef = defs[key];
    unitCache[key] = await unitDef();
  }
}

function generateInjector<Defs extends List, P extends string>(
  parent: P,
): BlockInjector<Defs, P> {
  if (takenInjectorsKeys.has(parent)) {
    throw new Error(`Injector for "${parent}" is already in use.`);
  }

  const localCache: Record<string, unknown> = {};
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
      proxy = createBlockProxy(parent, k) as ThisProxy;
    } else {
      throw new Error(`Unit ${String(key)} not found from block "${parent}"`);
    }

    localCache[k] = proxy;
    proxiesCache.set(k, proxy);
    return proxy;
  }

  return blockInjector;
}

function getBlockPaths<L extends List>(defs: L): BlockPaths<L>[] {
  return Object.keys(defs)
    .filter((key) => key.split(".").length > 1)
    .map((key) => {
      const parts = key.split(".");
      return parts
        .slice(0, parts.length - 1)
        .join(".") as BlockPaths<L>[][number];
    });
}

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
      unitDefinitions[key].isPrivate !== true,
  );
}

function createBlockProxy<L extends List, P extends string, N extends string>(
  parent: P,
  namespace: N,
): BlockProxy<L, P, N> {
  const unitKeys = getBlockUnitPaths(parent, namespace);

  return new Proxy(
    {}, // used as a cache for the block
    {
      get: <K extends string>(
        cachedblock: Record<string, unknown>,
        prop: K,
      ) => {
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

          let value;

          if (isFactory(def)) {
            value = def();
          } else {
            value = def;
          }

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
          enumerable: true,
          configurable: true,
          writable: false,
        };
      },
    },
  ) as BlockProxy<L, P, N>;
}

type Namespaced<N extends string, L extends List> = {
  [K in keyof L as `${N}.${Extract<K, string>}`]: L[K];
};

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
    const oldPublicKeys = blockPaths;
    blockPaths = getBlockPaths(units);
    const oldMainCache = unitCache;
    const oldMainDefs = unitDefinitions;
    unitDefinitions = units;
    const result = unit(...arguments);
    unitCache = oldMainCache;
    unitDefinitions = oldMainDefs;
    blockPaths = oldPublicKeys;
    return result;
  } as D;
}

export function mockFactory<D extends Func, L extends List>(
  unit: D,
  units: L,
): ReturnType<D> {
  return function () {
    const oldPublicKeys = blockPaths;
    blockPaths = getBlockPaths(units);
    const oldMainCache = unitCache;
    const oldMainDefs = unitDefinitions;
    unitDefinitions = units;
    const result = unit()(...arguments);
    unitCache = oldMainCache;
    unitDefinitions = oldMainDefs;
    blockPaths = oldPublicKeys;
    return result;
  } as ReturnType<D>;
}

function listAsyncKeys(list: List): string[] {
  const result: string[] = [];

  for (const key in list) {
    if (Object.prototype.hasOwnProperty.call(list, key)) {
      const value = list[key];
      if (isAsyncFactory(value)) {
        result.push(key);
      }
    }
  }
  return result;
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

function isFunction<T>(unit: unknown): unit is () => T {
  return typeof unit === "function";
}

function isFactory<T>(unit: unknown): unit is Factory<T> {
  if (!isFunction(unit) && !isPromise(unit)) {
    return false;
  }

  return "isFactory" in unit && unit.isFactory === true;
}

function isAsyncFactory<T>(unit: T): boolean {
  if (!isFactory(unit)) return false;
  if (isPromise(unit)) return true;
  if (!isFunction(unit)) return false;
  if ("isAsync" in unit && unit.isAsync === true) return true;

  const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
  return unit instanceof AsyncFunction;
}

function isPrivate(unit: unknown): unit is PrivateUnit {
  if (unit === null) return false;
  if (typeof unit === "object" || isFunction(unit) || isPromise(unit)) {
    return "isPrivate" in unit && unit.isPrivate === true;
  }
  return false;
}

// =======

interface PrivateUnit {
  isPrivate: true;
}

type List = Record<string, any>;

interface Factory<T> {
  (...args: unknown[]): T;
  isFactory: true;
}

type InferUnitValue<D> =
  D extends Factory<infer T> ? (T extends Promise<infer V> ? V : T) : D;

type Func = (...args: any[]) => any;

interface BlockInjector<L extends List, P extends string> {
  (): BlockProxy<L, P, "">;
  <K extends "." | BlockPaths<L>>(key?: K): BlockProxy<L, P, K>;
}

type BlockProxy<
  L extends List,
  P extends string,
  N extends string,
> = N extends "."
  ? {
      [K in UnitKeys<L, P>]: InferUnitValue<L[`${P}.${K}`]>;
    }
  : N extends ""
    ? {
        [K in UnitKeys<L, "">]: InferUnitValue<L[K]>;
      }
    : {
        [K in UnitKeys<L, N>]: InferUnitValue<L[`${N}.${K}`]>;
      };

type NoDots<T extends string> = T extends `${string}.${string}` ? never : T;

type UnitKeys<L extends List, N extends string> = {
  [K in keyof L]: N extends ""
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

type ExtractBlockPath<K extends string> =
  K extends NoDots<K>
    ? never // unit in root
    : ParentKey<K>; // block name

type BlockPaths<L extends List> = {
  [K in keyof L]: ExtractBlockPath<Extract<K, string>>;
}[keyof L];

type IsAsyncFactory<T> = T extends { isFactory: true }
  ? T extends (...args: unknown[]) => Promise<unknown>
    ? true
    : T extends Promise<unknown>
      ? true
      : false
  : false;

type HasAsync<T extends Record<string, unknown>> = true extends {
  [K in keyof T]: IsAsyncFactory<T[K]>;
}[keyof T]
  ? true
  : false;
