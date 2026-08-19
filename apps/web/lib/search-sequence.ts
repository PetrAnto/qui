/**
 * Last-write-wins sequencing for incremental search.
 *
 * City search fires one request per keystroke, and network latency is not
 * ordered: a slow answer to an older query must never overwrite the results
 * for the query that is actually visible. Every search takes a token from
 * `begin()`; only the newest token may apply its response. Selecting a result
 * or clearing the field calls `cancel()`, so a response already in flight is
 * ignored instead of reopening a results list the user has moved on from.
 *
 * Pure and React-free so the rule is unit-tested without a browser.
 */
export interface SearchSequence {
  /** Start a new search. Invalidates every earlier token. */
  begin(): number;
  /** Invalidate all outstanding tokens without starting a new search. */
  cancel(): void;
  /** True only for the token of the most recent `begin()`, until cancelled. */
  isCurrent(token: number): boolean;
}

export function createSearchSequence(): SearchSequence {
  let latest = 0;
  return {
    begin() {
      latest += 1;
      return latest;
    },
    cancel() {
      latest += 1;
    },
    isCurrent(token: number) {
      return token === latest;
    },
  };
}
