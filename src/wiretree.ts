let mainDefs: List = {};
let mainCache: List = {};
let takenInjectors = new Set<string>();
let publicKeys: string[] = [];
let proxiesCache: Map<string, any> = new Map();

export function getInjector<L extends List>() {
  return function <N extends string>(namespace: N) {
    return createInjector<L, N>(namespace);
  };
}

export function createApp<Defs extends List>(defs: Defs) {
  mainDefs = defs;
  mainCache = {};
  proxiesCache = new Map();
  publicKeys = getPublicKeys(defs);
  takenInjectors = new Set<string>();
  return createInjector<Defs, "#">("#");
}

function createInjector<Defs extends List, P extends string>(parent: P) {
  if (takenInjectors.has(parent)) {
    throw new Error(`Injector for "${parent}" is already in use.`);
  }

  const localCache: Record<string, any> = {};
  takenInjectors.add(parent);

  return function <K extends "." | "#" | BlockKeys<Defs>>(
    key = "#" as K,
  ): BlockProxy<Defs, P, K> {
    type ThisProxy = BlockProxy<Defs, P, K>;
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

    if (k === "#") {
      const proxy = createBlockProxy("#") as ThisProxy;
      localCache["#"] = proxy;
      proxiesCache.set("#", proxy);
      return proxy;
    }

    if (publicKeys.includes(k)) {
      const proxy = createBlockProxy(k) as ThisProxy;
      localCache[k] = proxy;
      proxiesCache.set(k, proxy);
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
  const unitKeys =
    namespace === "#"
      ? Object.keys(mainDefs).filter((key) => key.split(".").length === 1)
      : Object.keys(mainDefs).filter(
          (key) =>
            key.startsWith(`${namespace}.`) &&
            key.slice(namespace.length + 1).split(".").length === 1,
        );

  return new Proxy(
    {}, // used as a cache for the block
    {
      get: <K extends string>(cachedblock: Record<string, any>, prop: K) => {
        type ProxyValue = InferUnitValue<N extends "#" ? L[K] : L[`${N}.${K}`]>;

        if (prop in cachedblock) {
          return cachedblock[prop] as ProxyValue;
        }

        const finalKey = namespace === "#" ? prop : `${namespace}.${prop}`;

        if (unitKeys.includes(finalKey)) {
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
    },
  ) as BlockProxy<L, P, N>;
}

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

// type BlockInjector<L extends List, P extends string> = <
//   K extends BlockKeys<List> | "." | "#",
// >(
//   key: K,
// ) => BlockProxy<L, P, K>;

type BlockProxy<
  L extends List,
  P extends string,
  N extends string,
> = N extends "."
  ? {
      [K in UnitKeys<L, P>]: InferUnitValue<L[`${P}.${K}`]>;
    } //
  : N extends "#"
    ? {
        [K in UnitKeys<L, "#">]: InferUnitValue<L[K]>;
      }
    : {
        [K in UnitKeys<L, N>]: InferUnitValue<L[`${N}.${K}`]>;
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
