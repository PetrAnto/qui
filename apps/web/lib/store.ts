import type { Ports } from '@indenoi/core';
import { createDemoPorts } from '@indenoi/db/demo';

/**
 * The development/demo store (ADR-0011).
 *
 * State lives in the isolate. That is a real limitation, stated plainly:
 * mutations are visible for the life of the process and are lost on restart or
 * on a different Worker isolate. It is the right trade for a build whose goal
 * is to exercise the product loop and the safety rules without a provisioned
 * D1 instance, and every call goes through the same `Repository` interface the
 * D1/Drizzle adapter implements, so nothing above this file changes when it
 * lands.
 */
export interface Store {
  readonly ports: Ports;
}

const GLOBAL_KEY = Symbol.for('indenoi.demo.store');

type GlobalWithStore = typeof globalThis & { [GLOBAL_KEY]?: Store };

export function getStore(): Store {
  const scope = globalThis as GlobalWithStore;
  let store = scope[GLOBAL_KEY];
  if (store === undefined) {
    store = { ports: createDemoPorts() };
    scope[GLOBAL_KEY] = store;
  }
  return store;
}

/** Used by tests to start from the pristine deterministic dataset. */
export function resetStore(): Store {
  const scope = globalThis as GlobalWithStore;
  const store = { ports: createDemoPorts() };
  scope[GLOBAL_KEY] = store;
  return store;
}

export function ports(): Ports {
  return getStore().ports;
}
