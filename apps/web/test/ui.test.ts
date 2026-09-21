import { describe, expect, it } from 'vitest';

import { DEMO_USERS } from '@indenoi/db/demo';
import { createVouch } from '@indenoi/core';
import { CITY_IDS } from '@indenoi/geo';

import { artworkFor, initials } from '../lib/art';
import {
  ACTIVE_CITY_COOKIE,
  activeCityCookieHeader,
  activeCityFrom,
  resolveCityAccess,
} from '../lib/city';
import { REASON_LABELS, explain, relativeTime, untilTime } from '../lib/format';
import { TABS } from '../lib/nav';
import { personaChoices } from '../lib/personas';
import { resetStore } from '../lib/store';

const NOW = '2026-08-16T12:00:00.000Z';

describe('relative time reads like a person wrote it', () => {
  it('never shows a raw timestamp', () => {
    expect(relativeTime('2026-08-16T11:59:40.000Z', NOW)).toBe('just now');
    expect(relativeTime('2026-08-16T09:00:00.000Z', NOW)).toBe('3 h ago');
    expect(relativeTime('2026-08-10T12:00:00.000Z', NOW)).toBe('6 d ago');
    expect(untilTime('2026-08-16T15:00:00.000Z', NOW)).toBe('in 3 h');
    expect(untilTime('2026-08-16T12:10:00.000Z', NOW)).toBe('starting now');
  });
});

describe('denials are explained, never dumped', () => {
  it('has a human sentence for every policy reason', () => {
    const codes = Object.keys(REASON_LABELS);
    expect(codes.length).toBeGreaterThan(15);
    for (const code of codes) {
      const label = REASON_LABELS[code as keyof typeof REASON_LABELS];
      expect(label.length).toBeGreaterThan(3);
      // The interface must not leak the machine code at the person.
      expect(label).not.toContain(code);
      expect(label).not.toMatch(/_/);
    }
  });

  it('says nothing about who blocked whom', () => {
    expect(explain('blocked')).toBe('Unavailable.');
    expect(explain('minor_not_discoverable')).toBe('Unavailable.');
  });
});

describe('generated artwork', () => {
  it('is deterministic for a seed and different across seeds', () => {
    expect(artworkFor('post-a', 'sea')).toEqual(artworkFor('post-a', 'sea'));
    expect(artworkFor('post-a', 'sea')).not.toEqual(artworkFor('post-b', 'sea'));
  });

  it('falls back rather than throwing on an unknown motif', () => {
    expect(artworkFor('post-a', 'not-a-motif').background).toContain('linear-gradient');
  });

  it('builds initials from a display name', () => {
    expect(initials('Léa')).toBe('L');
    expect(initials('Marc Antoine')).toBe('MA');
  });
});

describe('navigation', () => {
  it('is a small, stable mobile tab bar', () => {
    expect(TABS.length).toBeGreaterThanOrEqual(4);
    expect(TABS.length).toBeLessThanOrEqual(5);
    expect(new Set(TABS.map((tab) => tab.href)).size).toBe(TABS.length);
    expect(TABS.map((tab) => tab.href)).toContain('/');
    for (const tab of TABS) {
      expect(tab.label.length).toBeGreaterThan(0);
      expect(tab.href.startsWith('/')).toBe(true);
    }
  });
});

describe('accessibility surface contracts', () => {
  it('keeps tab labels human-readable for assistive tech', () => {
    for (const tab of TABS) {
      expect(tab.label.trim().length).toBeGreaterThan(1);
      expect(tab.glyph.length).toBeGreaterThan(0);
    }
  });
});

describe('active city cookie', () => {
  it('round-trips a scope id', () => {
    const header = activeCityCookieHeader(CITY_IDS.kilrush);
    expect(header).toContain(ACTIVE_CITY_COOKIE);
    expect(header).toContain('SameSite=Lax');
    expect(
      activeCityFrom(
        new Request('http://localhost/', {
          headers: { cookie: `${ACTIVE_CITY_COOKIE}=${encodeURIComponent(CITY_IDS.kilrush)}` },
        }),
      ),
    ).toBe(CITY_IDS.kilrush);
  });

  it('ignores a city that is not in the gazetteer', () => {
    expect(
      activeCityFrom(
        new Request('http://localhost/', {
          headers: { cookie: `${ACTIVE_CITY_COOKIE}=geo%3Acity%3Aatlantis` },
        }),
      ),
    ).toBeNull();
    expect(activeCityFrom(new Request('http://localhost/'))).toBeNull();
  });
});

describe('demo persona choices', () => {
  it('offers only personas in the band the person just declared', async () => {
    resetStore();
    const minors = await personaChoices('minor_15_17');
    expect(minors.length).toBeGreaterThan(0);
    expect(minors.map((choice) => choice.id)).toContain(DEMO_USERS.ines);
    expect(minors.map((choice) => choice.id)).not.toContain(DEMO_USERS.lea);
  });

  it('puts no age band on the wire, only the choice itself', async () => {
    resetStore();
    const adults = await personaChoices('adult_18_plus');
    expect(adults.length).toBeGreaterThan(0);
    for (const choice of adults) {
      expect(Object.keys(choice).sort()).toEqual(['bio', 'displayName', 'handle', 'id', 'motif']);
    }
    expect(JSON.stringify(adults)).not.toContain('adult_18_plus');
  });
});


describe('city access wording (canon 04 \u00a72.3)', () => {
  it('maps ties to consumer language, never to raw evidence', async () => {
    const store = resetStore();
    // L\u00e9a lives in Ajaccio: publishing access.
    await expect(resolveCityAccess(store.ports, DEMO_USERS.lea, CITY_IDS.ajaccio)).resolves.toBe(
      'local',
    );
    // Tom follows Porto with no tie: exploring claims nothing.
    await expect(resolveCityAccess(store.ports, DEMO_USERS.tom, CITY_IDS.porto)).resolves.toBe(
      'exploring',
    );
    // Maya declared a visitor tie to Ajaccio: present, but not local.
    await expect(resolveCityAccess(store.ports, DEMO_USERS.maya, CITY_IDS.ajaccio)).resolves.toBe(
      'visitor',
    );
    // No attachment at all is still just exploring.
    await expect(resolveCityAccess(store.ports, DEMO_USERS.lea, CITY_IDS.kilrush)).resolves.toBe(
      'exploring',
    );
  });

  it('a vouched exploring tie reads as local access, never a contradiction', async () => {
    const store = resetStore();
    // Tom's Porto tie is declared 'exploring', which alone grants nothing.
    await expect(resolveCityAccess(store.ports, DEMO_USERS.tom, CITY_IDS.porto)).resolves.toBe(
      'exploring',
    );
    // Two independent vouches stand in for an attested presence
    // (canPublishInGeo): the wording must follow the derived capability,
    // not the originally declared kind.
    const first = await createVouch(store.ports, {
      actorId: DEMO_USERS.rita,
      subjectId: DEMO_USERS.tom,
      geoScopeId: CITY_IDS.porto,
      statement: 'Climbed with him here all spring.',
    });
    const second = await createVouch(store.ports, {
      actorId: DEMO_USERS.lea,
      subjectId: DEMO_USERS.tom,
      geoScopeId: CITY_IDS.porto,
      statement: 'He knows the granite routes by heart.',
    });
    expect(first.ok).toBe(true);
    expect(second.ok).toBe(true);
    await expect(resolveCityAccess(store.ports, DEMO_USERS.tom, CITY_IDS.porto)).resolves.toBe(
      'local',
    );
  });
});
