import { describe, expect, it } from 'vitest';

import { CITY_IDS } from '@indenoi/geo';

import { DEMO_HANDLES, buildDemoDataset, createDemoPorts } from '../src/demo/index';

describe('deterministic demo dataset', () => {
  it('produces byte-identical data on every build', () => {
    expect(JSON.stringify(buildDemoDataset())).toEqual(JSON.stringify(buildDemoDataset()));
  });

  it('labels every synthetic record as demo data', () => {
    const data = buildDemoDataset();
    for (const person of data.people) expect(person.demo).toBe(true);
    for (const post of data.posts) expect(post.demo).toBe(true);
    for (const signal of data.signals) expect(signal.demo).toBe(true);
  });

  it('covers eight cities across three countries', () => {
    const data = buildDemoDataset();
    const cityIds = new Set(data.attachments.map((attachment) => attachment.geoScopeId));
    for (const id of Object.values(CITY_IDS)) {
      expect(cityIds.has(id)).toBe(true);
    }
    const countries = new Set(
      data.scopes.filter((scope) => scope.kind === 'city').map((scope) => scope.countryCode),
    );
    expect(countries.size).toBeGreaterThanOrEqual(3);
  });

  it('has content and signals in every demo city, so nothing is city-specific', () => {
    const data = buildDemoDataset();
    for (const id of Object.values(CITY_IDS)) {
      expect(data.posts.some((post) => post.geoScopeId === id)).toBe(true);
      expect(data.signals.some((signal) => signal.geoScopeId === id)).toBe(true);
    }
  });

  it('varies age bands, attachments, trust evidence and relationships', () => {
    const data = buildDemoDataset();
    const bands = new Set(data.people.map((person) => person.ageBand));
    expect(bands).toEqual(new Set(['minor_15_17', 'adult_18_plus']));

    const attachmentKinds = new Set(data.attachments.map((attachment) => attachment.kind));
    expect(attachmentKinds.size).toBeGreaterThanOrEqual(4);
    expect(attachmentKinds.has('exploring')).toBe(true);
    expect(attachmentKinds.has('resident')).toBe(true);

    expect(new Set(data.signals.map((signal) => signal.type))).toEqual(
      new Set(['ask', 'offer', 'join', 'event']),
    );
    expect(data.blocks.length).toBeGreaterThanOrEqual(1);
    expect(data.vouches.length).toBeGreaterThanOrEqual(2);
    expect(data.participants.length).toBeGreaterThanOrEqual(2);
    expect(data.threads.length).toBeGreaterThanOrEqual(1);
    expect(data.invites.length).toBeGreaterThanOrEqual(1);
  });

  it('names nobody real: every handle is from the demo namespace', () => {
    const data = buildDemoDataset();
    expect(data.people.map((person) => person.handle).sort()).toEqual([...DEMO_HANDLES].sort());
    for (const person of data.people) {
      expect(person.handle).toMatch(/^demo-[a-z-]+$/);
    }
  });

  it('holds no coordinate against a person', () => {
    const data = buildDemoDataset();
    const serialized = JSON.stringify({
      people: data.people,
      attachments: data.attachments,
    });
    expect(serialized).not.toMatch(/"lat"|"lng"|"latitude"|"longitude"/);
  });

  it('seeds analytics history so the insights view is not empty', () => {
    const data = buildDemoDataset();
    expect(data.analytics.length).toBeGreaterThan(20);
    const days = new Set(data.analytics.map((event) => event.at.slice(0, 10)));
    expect(days.size).toBeGreaterThan(1);
  });
});

describe('demo ports', () => {
  it('gives a fixed clock and sequential ids', async () => {
    const first = createDemoPorts();
    const second = createDemoPorts();
    expect(first.now()).toBe(second.now());
    expect(first.newId('x')).toBe(second.newId('x'));
    expect(first.newId('x')).not.toBe(first.newId('x'));
    expect((await first.repo.listPeople()).length).toBeGreaterThan(0);
  });
});
