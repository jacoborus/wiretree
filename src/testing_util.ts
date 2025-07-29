/**
 * A utility function designed for testing purposes. It creates a mock injector
 * that maps keys to values defined in a provided list. This enables simulating
 * dependency injection without needing a full implementation.
 *
 * @template L - The type of the object containing key-value pairs for the mock injector
 *
 * @param list - An object mapping keys to mock values
 *
 * @returns A mock injector function that retrieves predefined values based on keys
 *
 * @example
 * ```ts
 * const fakeInjector = getFakeInjector({ key: "value" });
 * const value = fakeInjector("key"); // Returns "value"
 * ```
 */
export function getFakeInjector<L extends Record<string, unknown>>(
  list: L,
): <K extends keyof L>(key: K) => L[K] {
  return function <K extends keyof L>(key: K) {
    if (key in list) {
      return list[key];
    }
    throw new Error(`Unit "${String(key)}" not found in fake block`);
  };
}

/**
 * Binds a function to a given context (`thisArg`) while preserving the function's type signature.
 *
 * @template T - The type of the `this` context
 * @template A - An array representing the types of the function's arguments
 * @template R - The return type of the function
 *
 * @param fn - The function to be bound
 * @param thisArg - The object to bind as `this` context for the function
 *
 * @returns A new function with `thisArg` context bound
 *
 * @example
 * ```ts
 * const context = { value: 42 };
 * function getValue(this: { value: number }) {
 *   return this.value;
 * }
 *
 * const boundGetValue = bindThis(getValue, context);
 * console.log(boundGetValue()); // Outputs: 42
 * ```
 */
export function bindThis<T, A extends any[], R>(
  fn: (this: T, ...args: A) => R,
  thisArg: T,
): (...args: A) => R {
  return fn.bind(thisArg);
}
