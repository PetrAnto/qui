import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

import { Miniflare } from 'miniflare';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import {
  addCity,
  blockUser,
  createSignal,
  decideResponse,
  getThreadView,
  respondToSignal,
  sendMessage,
  toPublicProfile,
  toggleAppreciation,
  type GeoScope,
  type Ports,
  type Repository,
} from '@indenoi/core';
import { CITY_IDS } from '@indenoi/geo';

import { buildDemoDataset, DEMO_NOW, DEMO_USERS } from '../src/demo/index';
import { createD1Repository, seedD1Database } from '../src/d1';
import { createInMemoryRepository } from '../src/memory';

/** A city that exists only in the worldwide GeoNames dump, not in the seed. */
const TOKYO = 'geo:city:gn-1850147';

/**
 * Store parity gate (ADR-0011).
 *
 * Enabling `persistentDatabase` requires proof that swapping the store cannot
 * change a policy outcome or the shape of what leaves the domain. This suite
 * runs the same demo dataset and the same operations through the in-memory
 * repository and through the D1 adapter — against a real local D1 (miniflare)
 * with the committed migrations applied, not a mock — and asserts the results
 * are identical. If this file is green, the store is a drop-in replacement;
 * if it is red, the flag stays off.
 */

let mf: Miniflare;
let d1: Repository;
let mem: Repository;

beforeAll(async () => {
  // Miniflare v5 takes a wrangler-manifest-shaped worker config; the README's
  // flat `script`/`d1Databases` keys predate this alpha and are rejected.
  mf = new Miniflare({
    workers: [
      {
        config: {
          name: 'parity',
          type: 'worker',
          compatibilityDate: '2026-08-01',
          manifest: {
            mainModule: 'worker.js',
            modules: {
              'worker.js': {
                type: 'esm',
                contents: 'export default { fetch() { return new Response("ok"); } }',
              },
            },
          },
          env: { DB: { type: 'd1', id: 'parity' } },
        },
      },
    ],
  } as never);
  const db = await mf.getD1Database('DB', 'parity');

  // The exact SQL a provisioned D1 would receive, in journal order. Statements
  // are split on drizzle's breakpoint marker and applied one at a time — the
  // same thing drizzle's own D1 migrator does.
  const dir = join(import.meta.dirname, '..', 'migrations');
  const files = readdirSync(dir)
    .filter((file) => file.endsWith('.sql'))
    .sort();
  for (const file of files) {
    const statements = readFileSync(join(dir, file), 'utf8')
      .split('--> statement-breakpoint')
      .map((statement) => statement.trim())
      .filter((statement) => statement.length > 0);
    for (const statement of statements) {
      // prepare().run(), not exec(): this miniflare alpha's exec mis-parses
      // multi-line statements ("incomplete input" on a valid CREATE TABLE).
      await db.prepare(statement).run();
    }
  }

  const seed = buildDemoDataset();
  await seedD1Database(db, seed);
  d1 = createD1Repository(db);
  mem = createInMemoryRepository(seed);
}, 120_000);

afterAll(async () => {
  await mf.dispose();
});

/**
 * Id sequences must be unique per store for the whole file: D1 enforces
 * PRIMARY KEY on analytics_events.id (the in-memory array tolerates duplicate
 * ids, which is a tolerance, not a contract). Both counters live at module
 * scope and advance in lockstep because every operation runs on both stores
 * in the same order — so cross-store results still compare equal.
 */
let d1Seq = 0;
let memSeq = 0;

/** Same fixed clock as createDemoPorts, over the D1 store. */
function d1Ports(): Ports {
  return {
    repo: d1,
    now: () => DEMO_NOW,
    newId: (prefix: string) => {
      d1Seq += 1;
      return `${prefix}-d${String(d1Seq).padStart(4, '0')}`;
    },
  };
}

/** Same fixed clock, over the in-memory store. */
function memPorts(): Ports {
  return {
    repo: mem,
    now: () => DEMO_NOW,
    newId: (prefix: string) => {
      memSeq += 1;
      return `${prefix}-d${String(memSeq).padStart(4, '0')}`;
    },
  };
}

describe('store parity: people and evidence', () => {
  it('round-trips the demo cast identically', async () => {
    expect(await d1.listPeople()).toEqual(await mem.listPeople());
    expect(await d1.getPerson(DEMO_USERS.hugo)).toEqual(await mem.getPerson(DEMO_USERS.hugo));
    expect(await d1.getPersonByHandle('demo-hugo')).toEqual(await mem.getPersonByHandle('demo-hugo'));
    expect(await d1.getPerson('usr-nobody')).toBeNull();
    expect(await mem.getPerson('usr-nobody')).toBeNull();
  });

  it('replaces facet lists on putPerson identically', async () => {
    const hugo = await mem.getPerson(DEMO_USERS.hugo);
    if (hugo === null) throw new Error('missing demo person');
    const updated = { ...hugo, practices: ['alpine knitting'], interests: [] };
    await d1.putPerson(updated);
    await mem.putPerson(updated);
    expect(await d1.getPerson(DEMO_USERS.hugo)).toEqual(await mem.getPerson(DEMO_USERS.hugo));
  });

  it('evidence bundles match, including after a new attestation', async () => {
    const attestation = {
      id: 'att-parity-1',
      subjectId: DEMO_USERS.hugo,
      kind: 'community_vouched' as const,
      geoScopeId: CITY_IDS.ajaccio,
      result: 'verified' as const,
      method: 'community' as const,
      providerRef: null,
      ageThreshold: null,
      country: null,
      issuedAt: DEMO_NOW,
      expiresAt: null,
    };
    await d1.putAttestation(attestation);
    await mem.putAttestation(attestation);
    expect(await d1.evidenceFor(DEMO_USERS.hugo)).toEqual(await mem.evidenceFor(DEMO_USERS.hugo));
  });
});

describe('store parity: geography', () => {
  it('lists the same scopes and resolves seed cities identically', async () => {
    expect(await d1.listGeoScopes()).toEqual(await mem.listGeoScopes());
    expect(await d1.getGeoScope(CITY_IDS.ajaccio)).toEqual(await mem.getGeoScope(CITY_IDS.ajaccio));
  });

  it('materialises a world-dump city on first touch, float centroid intact', async () => {
    const fromD1 = await d1.getGeoScope(TOKYO);
    const fromMem = await mem.getGeoScope(TOKYO);
    expect(fromD1).toEqual(fromMem);
    // The world dump carries real coordinates; a float must survive the store.
    expect(fromD1?.centroid?.lat).toBeCloseTo(35.6895, 3);
    // Second read comes back from the store itself in both implementations.
    expect(await d1.getGeoScope(TOKYO)).toEqual(await mem.getGeoScope(TOKYO));
    expect(await d1.listGeoScopes()).toEqual(await mem.listGeoScopes());
  });

  it('a world-city attach + signal round-trip satisfies D1 foreign keys', async () => {
    // The honest flow: addCity('exploring') is self-assertable, and it walks
    // repo.getGeoScope — the world-city materialization path — before
    // putAttachment writes a row whose FK references the new geo_scopes row.
    const attached = await addCity(d1Ports(), {
      actorId: DEMO_USERS.hugo,
      geoScopeId: TOKYO,
      kind: 'exploring',
    });
    expect(attached.ok).toBe(true);
    const attachedMem = await addCity(memPorts(), {
      actorId: DEMO_USERS.hugo,
      geoScopeId: TOKYO,
      kind: 'exploring',
    });
    expect(attachedMem.ok).toBe(true);
    expect(await d1.listAttachments(DEMO_USERS.hugo)).toEqual(
      await mem.listAttachments(DEMO_USERS.hugo),
    );

    // An 'ask' needs only a local attachment — which Hugo now has in Tokyo.
    const created = await createSignal(d1Ports(), {
      actorId: DEMO_USERS.hugo,
      type: 'ask',
      title: 'Best onsen near the station?',
      body: 'Arriving Friday.',
      geoScopeId: TOKYO,
      practice: 'onsen',
    });
    const createdMem = await createSignal(memPorts(), {
      actorId: DEMO_USERS.hugo,
      type: 'ask',
      title: 'Best onsen near the station?',
      body: 'Arriving Friday.',
      geoScopeId: TOKYO,
      practice: 'onsen',
    });
    expect(created).toEqual(createdMem);
    expect(created.ok).toBe(true);
  });
});

describe('store parity: content and the product loop', () => {
  it('lists and filters posts identically', async () => {
    expect(await d1.listPosts()).toEqual(await mem.listPosts());
    const filter = { geoScopeIds: [CITY_IDS.ajaccio] };
    expect(await d1.listPosts(filter)).toEqual(await mem.listPosts(filter));
    expect(await d1.listPosts({ geoScopeIds: [] })).toEqual([]);
    expect(await mem.listPosts({ geoScopeIds: [] })).toEqual([]);
  });

  it('appreciations toggle identically through the service', async () => {
    const [posts, appreciations] = await Promise.all([mem.listPosts(), mem.listAppreciations()]);
    const target = posts.find(
      (post) =>
        post.geoScopeId === CITY_IDS.ajaccio &&
        post.authorId !== DEMO_USERS.hugo &&
        !appreciations.some((a) => a.postId === post.id && a.actorId === DEMO_USERS.hugo),
    );
    if (target === undefined) throw new Error('no demo post');
    const on = await toggleAppreciation(d1Ports(), { actorId: DEMO_USERS.hugo, postId: target.id });
    expect(on.ok).toBe(true);
    const onMem = await toggleAppreciation(memPorts(), { actorId: DEMO_USERS.hugo, postId: target.id });
    expect(onMem.ok).toBe(true);
    expect(await d1.listAppreciations()).toEqual(await mem.listAppreciations());
    // And toggling back off removes it in both stores.
    await toggleAppreciation(d1Ports(), { actorId: DEMO_USERS.hugo, postId: target.id });
    await toggleAppreciation(memPorts(), { actorId: DEMO_USERS.hugo, postId: target.id });
    expect(await d1.listAppreciations()).toEqual(await mem.listAppreciations());
  });
});


describe('store parity: the product loop produces identical state', () => {
  it('signal → response → accept → thread → message, in both stores', async () => {
    const onD1 = d1Ports();
    const onMem = memPorts();

    const signalD1 = await createSignal(onD1, {
      actorId: DEMO_USERS.lea,
      type: 'ask',
      title: 'Who knows where to fix a wetsuit zip?',
      body: 'Mine gave up this morning.',
      geoScopeId: CITY_IDS.ajaccio,
      practice: 'freediving',
    });
    const signalMem = await createSignal(onMem, {
      actorId: DEMO_USERS.lea,
      type: 'ask',
      title: 'Who knows where to fix a wetsuit zip?',
      body: 'Mine gave up this morning.',
      geoScopeId: CITY_IDS.ajaccio,
      practice: 'freediving',
    });
    expect(signalD1).toEqual(signalMem);
    if (!signalD1.ok || !signalMem.ok) throw new Error('signal creation failed');

    const responseD1 = await respondToSignal(onD1, {
      actorId: DEMO_USERS.hugo,
      signalId: signalD1.value.signalId,
      message: 'The shop on rue Fesch does it in a day.',
    });
    const responseMem = await respondToSignal(onMem, {
      actorId: DEMO_USERS.hugo,
      signalId: signalMem.value.signalId,
      message: 'The shop on rue Fesch does it in a day.',
    });
    expect(responseD1).toEqual(responseMem);
    if (!responseD1.ok || !responseMem.ok) throw new Error('response failed');

    const acceptedD1 = await decideResponse(onD1, {
      hostId: DEMO_USERS.lea,
      responseId: responseD1.value.responseId,
      decision: 'accepted',
    });
    const acceptedMem = await decideResponse(onMem, {
      hostId: DEMO_USERS.lea,
      responseId: responseMem.value.responseId,
      decision: 'accepted',
    });
    expect(acceptedD1).toEqual(acceptedMem);
    if (!acceptedD1.ok || !acceptedMem.ok || acceptedD1.value.threadId === null || acceptedMem.value.threadId === null) {
      throw new Error('thread not opened');
    }

    await sendMessage(onD1, {
      actorId: DEMO_USERS.lea,
      threadId: acceptedD1.value.threadId,
      body: 'Perfect, thank you.',
    });
    await sendMessage(onMem, {
      actorId: DEMO_USERS.lea,
      threadId: acceptedMem.value.threadId,
      body: 'Perfect, thank you.',
    });

    const threadD1 = await getThreadView(onD1, {
      viewerId: DEMO_USERS.hugo,
      threadId: acceptedD1.value.threadId,
    });
    const threadMem = await getThreadView(onMem, {
      viewerId: DEMO_USERS.hugo,
      threadId: acceptedMem.value.threadId,
    });
    // The whole view — messages, participants, context — matches.
    expect(threadD1).toEqual(threadMem);
    expect(threadD1?.messages).toHaveLength(2);

    // And the raw store surfaces match too.
    expect(await d1.listThreads()).toEqual(await mem.listThreads());
    expect(await d1.listSignals()).toEqual(await mem.listSignals());
    expect(await d1.listResponses()).toEqual(await mem.listResponses());
    expect(await d1.listParticipants()).toEqual(await mem.listParticipants());
  });
});

describe('store parity: safety surfaces', () => {
  it('blocking is identical, and the block edge dedups on its natural key', async () => {
    const blockedD1 = await blockUser(d1Ports(), { actorId: DEMO_USERS.ines, targetId: DEMO_USERS.paul });
    const blockedMem = await blockUser(memPorts(), { actorId: DEMO_USERS.ines, targetId: DEMO_USERS.paul });
    expect(blockedD1).toEqual(blockedMem);
    expect(await d1.listBlocks()).toEqual(await mem.listBlocks());

    // putBlock is idempotent per (blocker, blocked) in both stores.
    const edge = (await d1.listBlocks()).find(
      (b) => b.blockerId === DEMO_USERS.ines && b.blockedId === DEMO_USERS.paul,
    );
    if (edge === undefined) throw new Error('missing block edge');
    await d1.putBlock({ ...edge, id: 'blk-duplicate' });
    await mem.putBlock({ ...edge, id: 'blk-duplicate' });
    expect(await d1.listBlocks()).toEqual(await mem.listBlocks());

    await d1.deleteBlock(DEMO_USERS.ines, DEMO_USERS.paul);
    await mem.deleteBlock(DEMO_USERS.ines, DEMO_USERS.paul);
    expect(await d1.listBlocks()).toEqual(await mem.listBlocks());
  });

  it('INV-GEO-1/INV-PROFILE-1: the public projection is identical from either store', async () => {
    const personD1 = await d1.getPerson(DEMO_USERS.hugo);
    const personMem = await mem.getPerson(DEMO_USERS.hugo);
    if (personD1 === null || personMem === null) throw new Error('missing demo person');
    const scopeMap = async (repo: Repository): Promise<ReadonlyMap<string, GeoScope>> =>
      new Map((await repo.listGeoScopes()).map((scope) => [scope.id, scope]));
    const viewD1 = toPublicProfile(
      personD1,
      await d1.evidenceFor(DEMO_USERS.hugo),
      await scopeMap(d1),
    );
    const viewMem = toPublicProfile(
      personMem,
      await mem.evidenceFor(DEMO_USERS.hugo),
      await scopeMap(mem),
    );
    expect(viewD1).toEqual(viewMem);
    // And the projection still cannot carry a coordinate or private evidence.
    // Key-based, not substring-based: 'translation' must not trip 'lat'.
    const keysOf = (value: unknown, into = new Set<string>()): Set<string> => {
      if (Array.isArray(value)) value.forEach((entry) => keysOf(entry, into));
      else if (typeof value === 'object' && value !== null) {
        for (const [key, entry] of Object.entries(value)) {
          into.add(key);
          keysOf(entry, into);
        }
      }
      return into;
    };
    const keys = keysOf(viewD1);
    for (const forbidden of [
      'lat',
      'lng',
      'latitude',
      'longitude',
      'centroid',
      'coordinates',
      'geohash',
      'evidence',
      'attestations',
      'vouches',
      'ageBand',
    ]) {
      expect(keys.has(forbidden), `projection leaked key ${forbidden}`).toBe(false);
    }
  });
});

