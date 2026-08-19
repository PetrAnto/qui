import { describe, expect, it } from 'vitest';

import { createSearchSequence } from '../lib/search-sequence';

/**
 * The regression behind these tests: city search applied whichever response
 * arrived last, so a slow answer to an older query rendered results that did
 * not match the visible text — and a response in flight at selection time
 * reopened the results list after the user had already chosen.
 */
describe('createSearchSequence', () => {
  it('the only current token is the one just issued', () => {
    const sequence = createSearchSequence();
    const first = sequence.begin();
    expect(sequence.isCurrent(first)).toBe(true);
  });

  it('a newer search invalidates every older token', () => {
    const sequence = createSearchSequence();
    const stale = sequence.begin();
    const fresh = sequence.begin();
    expect(sequence.isCurrent(stale)).toBe(false);
    expect(sequence.isCurrent(fresh)).toBe(true);
  });

  it('cancel() invalidates an in-flight search without issuing a new token', () => {
    const sequence = createSearchSequence();
    const pending = sequence.begin();
    sequence.cancel();
    expect(sequence.isCurrent(pending)).toBe(false);
  });

  it('a search started after a cancel is current again', () => {
    const sequence = createSearchSequence();
    const cancelled = sequence.begin();
    sequence.cancel();
    const next = sequence.begin();
    expect(sequence.isCurrent(cancelled)).toBe(false);
    expect(sequence.isCurrent(next)).toBe(true);
  });

  it('tokens increase monotonically so equality is a safe test', () => {
    const sequence = createSearchSequence();
    const a = sequence.begin();
    const b = sequence.begin();
    expect(b).toBeGreaterThan(a);
  });
});
