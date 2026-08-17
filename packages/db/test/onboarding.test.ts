import { beforeEach, describe, expect, it } from 'vitest';

import { completeOnboarding, setProfileFacets, type Ports } from '@indenoi/core';
import { CITY_IDS, searchCities } from '@indenoi/geo';

import { DEMO_USERS, createDemoPorts } from '../src/demo/index';

let ports: Ports;

beforeEach(() => {
  ports = createDemoPorts();
});

describe('onboarding', () => {
  it('refuses an age below the baseline and writes nothing at all', async () => {
    const result = await completeOnboarding(ports, {
      actorId: DEMO_USERS.lea,
      declaredAge: 14,
      geoScopeId: CITY_IDS.kilrush,
      kind: 'exploring',
    });
    expect(result).toEqual({ ok: false, reason: 'age_below_minimum' });

    const attachments = await ports.repo.listAttachments(DEMO_USERS.lea);
    expect(attachments.some((entry) => entry.geoScopeId === CITY_IDS.kilrush)).toBe(false);
    expect(await ports.repo.listAudit()).toEqual([]);
  });

  it('keeps only the band, never the declared age', async () => {
    const seeded = (await ports.repo.listAnalytics()).length;
    const result = await completeOnboarding(ports, {
      actorId: DEMO_USERS.lea,
      declaredAge: 34,
      geoScopeId: CITY_IDS.kilrush,
      kind: 'visitor',
    });
    expect(result).toEqual({ ok: true, value: { ageBand: 'adult_18_plus', geoScopeId: CITY_IDS.kilrush } });

    const written = JSON.stringify([
      await ports.repo.listAudit(),
      (await ports.repo.listAnalytics()).slice(seeded),
      await ports.repo.evidenceFor(DEMO_USERS.lea),
    ]);
    expect(written).not.toContain('34');
    expect(written).not.toContain('declaredAge');
    // The threshold that was checked is kept; the age that was typed is not.
    expect(written).toContain('"ageThreshold":18');
  });

  it('refuses a declared age that contradicts the account age band', async () => {
    // Inès is a minor account. Declaring an adult age must not silently promote her.
    const result = await completeOnboarding(ports, {
      actorId: DEMO_USERS.ines,
      declaredAge: 41,
      geoScopeId: CITY_IDS.ajaccio,
      kind: 'resident',
    });
    expect(result).toEqual({ ok: false, reason: 'age_band_mismatch' });
  });

  it('attaches the chosen city and records what the person does', async () => {
    const result = await completeOnboarding(ports, {
      actorId: DEMO_USERS.tom,
      declaredAge: 29,
      geoScopeId: CITY_IDS.kilrush,
      kind: 'visitor',
      practices: ['  climbing  ', 'climbing', 'sea swimming'],
      interests: ['bouldering'],
    });
    expect(result.ok).toBe(true);

    const attachments = await ports.repo.listAttachments(DEMO_USERS.tom);
    expect(attachments.find((entry) => entry.geoScopeId === CITY_IDS.kilrush)?.kind).toBe('visitor');

    const person = await ports.repo.getPerson(DEMO_USERS.tom);
    expect(person?.practices).toEqual(['climbing', 'sea swimming']);
    expect(person?.interests).toEqual(['bouldering']);
  });

  it('activates a worldwide city that is not in the seed', async () => {
    const tokyo = searchCities('tokyo').find((scope) => scope.countryCode === 'JP');
    expect(tokyo).toBeDefined();
    const result = await completeOnboarding(ports, {
      actorId: DEMO_USERS.tom,
      declaredAge: 29,
      geoScopeId: tokyo?.id ?? '',
      kind: 'exploring',
    });
    expect(result.ok).toBe(true);
    const stored = await ports.repo.getGeoScope(tokyo?.id ?? '');
    expect(stored?.name).toBe(tokyo?.name);
    expect(stored?.countryCode).toBe('JP');
  });
});

describe('profile facets', () => {
  it('trims, de-duplicates and bounds what a person says about themselves', async () => {
    const result = await setProfileFacets(ports, {
      actorId: DEMO_USERS.tom,
      practices: ['  Climbing ', 'climbing', '', 'x'.repeat(200)],
      interests: Array.from({ length: 40 }, (_, index) => `interest-${index}`),
    });
    expect(result.ok).toBe(true);

    const person = await ports.repo.getPerson(DEMO_USERS.tom);
    expect(person?.practices).toEqual(['Climbing', 'x'.repeat(40)]);
    expect(person?.interests).toHaveLength(12);
  });

  it('leaves untouched facets alone', async () => {
    const before = await ports.repo.getPerson(DEMO_USERS.lea);
    await setProfileFacets(ports, { actorId: DEMO_USERS.lea, interests: ['sea'] });
    const after = await ports.repo.getPerson(DEMO_USERS.lea);
    expect(after?.practices).toEqual(before?.practices);
    expect(after?.interests).toEqual(['sea']);
  });

  it('does not exist as a way to change somebody else', async () => {
    const result = await setProfileFacets(ports, { actorId: 'usr-nobody', interests: ['x'] });
    expect(result).toEqual({ ok: false, reason: 'not_found' });
  });
});
