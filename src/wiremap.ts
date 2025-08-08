let mainDefs: List = {};
let mainCache: List = {};
let takenInjectors = new Set<string>();
let publicKeys: string[] = [];
let proxiesCache = new Map<string, unknown>();

export function createInjector<L extends List>() {
  return function <N extends BlockKeys<L>>(namespace: N): BlockInjector<L, N> {
    return generateInjector<L, N>(namespace);
  };
}

type WiredApp<Defs extends List> =
  HasAsync<Defs> extends true
    ? Promise<BlockInjector<Defs, "">>
    : BlockInjector<Defs, "">;

export function wireApp<Defs extends List>(defs: Defs): WiredApp<Defs> {
  mainDefs = defs;
  mainCache = {};
  proxiesCache = new Map();
  publicKeys = getPublicKeys(defs);
  takenInjectors = new Set<string>();
  const injector = generateInjector<Defs, "">("");

  const asyncKeys = listAsyncKeys(defs);
  if (asyncKeys.length) {
    return resolveAsync(asyncKeys).then(() => injector) as WiredApp<Defs>;
  }

  return injector as WiredApp<Defs>;
}

async function resolveAsync<L extends List>(
  asyncKeys: string[],
): Promise<void> {
  const defs = mainDefs as L;
  for await (const key of asyncKeys) {
    const unit = defs[key];
    if (unit.isFactory === true && isAsyncFactory(unit)) {
      const result = await unit();
      mainCache[key as keyof typeof mainCache] = result;
    }
  }
}

function generateInjector<Defs extends List, P extends string>(
  parent: P,
): BlockInjector<Defs, P> {
  if (takenInjectors.has(parent)) {
    throw new Error(`Injector for "${parent}" is already in use.`);
  }

  const localCache: Record<string, unknown> = {};
  takenInjectors.add(parent);

  function blockInjector(): BlockProxy<Defs, P, "">;
  function blockInjector<K extends "." | BlockKeys<Defs>>(
    blockKey: K,
  ): BlockProxy<Defs, P, K>;
  function blockInjector<K extends "." | BlockKeys<Defs>>(
    blockKey?: K,
  ): BlockProxy<Defs, P, K extends undefined ? "" : K> {
    const key = (blockKey ?? "") as K extends undefined ? "" : K;

    type ThisProxy = BlockProxy<Defs, P, K extends undefined ? "" : K>;

    if (key in localCache) {
      return localCache[key] as ThisProxy;
    }

    const k = String(key);
    if (k === ".") {
      const proxy = createBlockProxy(parent) as unknown as ThisProxy;
      localCache["."] = proxy;
      proxiesCache.set(parent, proxy);
      return proxy;
    }

    if (k === "") {
      const proxy = createBlockProxy("") as ThisProxy;
      localCache[""] = proxy;
      proxiesCache.set("", proxy);
      return proxy;
    }

    if (publicKeys.includes(k)) {
      const proxy = createBlockProxy(k) as ThisProxy;
      localCache[k] = proxy;
      proxiesCache.set(k, proxy);
      return proxy;
    }

    throw new Error(`Unit ${String(key)} not found from block "${parent}"`);
  }

  return blockInjector;
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
  const unitKeys =
    namespace === ""
      ? Object.keys(mainDefs).filter((key) => key.split(".").length === 1)
      : Object.keys(mainDefs).filter(
          (key) =>
            key.startsWith(`${namespace}.`) &&
            key.slice(namespace.length + 1).split(".").length === 1,
        );

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
          if (finalKey in mainCache) {
            const cachedValue = mainCache[finalKey];
            cachedblock[prop] = cachedValue;
            return cachedValue as ProxyValue;
          }

          const def = mainDefs[finalKey];

          if (isFactory(def)) {
            const value = def();
            cachedblock[prop] = value;
            mainCache[finalKey] = value;
            return value as ProxyValue;
          }

          cachedblock[prop] = def;
          mainCache[finalKey] = def;
          return def as ProxyValue;
        }

        throw new Error(
          `Key ${String(prop)} not found in block "${namespace}"`,
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
    typeof unit === "function" && "isFactory" in unit && unit.isFactory === true
  );
}

function isAsyncFactory<T>(fnOrValue: T): boolean {
  if (
    typeof fnOrValue === "function" &&
    "isFactory" in fnOrValue &&
    fnOrValue.isFactory === true &&
    "isAsync" in fnOrValue &&
    fnOrValue.isAsync === true
  ) {
    return true;
  }
  const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;

  return (
    fnOrValue instanceof Promise ||
    (typeof fnOrValue === "function" && fnOrValue instanceof AsyncFunction)
  );
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

// =======

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
  <K extends "." | BlockKeys<L>>(key?: K): BlockProxy<L, P, K>;
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

type BlockKey<K extends string> =
  K extends NoDots<K>
    ? never // unit in root
    : ParentKey<K>; // block name

type BlockKeys<L extends List> = {
  [K in keyof L]: BlockKey<Extract<K, string>>;
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
