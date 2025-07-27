export function plain<T>(unit: T) {
  return {
    type: "plain",
    value: unit,
  } as const;
}

export function factory<T>(unit: T) {
  return {
    type: "factory",
    value: unit,
  } as const;
}

export function bound<T>(unit: T) {
  return {
    type: "bound",
    value: unit,
  } as const;
}

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
  return unit.type === "bound";
}
function isFactory<T extends Func>(unit: Definition): unit is FactoryDef<T> {
  return unit.type === "factory";
}
function isPlain<T>(unit: Definition): unit is PlainDef<T> {
  return unit.type === "plain";
}

// =======

type DefList = Record<string, Definition>;
type List = Record<string, any>;

interface BoundDef<T> {
  type: "bound";
  value: T & ThisType<BulkInjector>;
  parent?: string;
}

interface FactoryDef<T> {
  type: "factory";
  value: (...args: any[]) => T;
  parent?: string;
}

interface PlainDef<T> {
  type: "plain";
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
