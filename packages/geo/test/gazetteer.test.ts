import { describe, expect, it } from 'vitest';

import {
  CITY_IDS,
  GAZETTEER,
  GEO_ATTRIBUTION,
  getScope,
  listCities,
  scopePath,
  searchCities,
} from '../src/index';

describe('gazetteer shape', () => {
  it('is a hierarchy of country / region / city with canonical ids', () => {
    for (const scope of GAZETTEER) {
      expect(scope.id).toMatch(/^geo:(country|region|city):[a-z0-9-]+$/);
      expect(['country', 'region', 'city', 'neighbourhood']).toContain(scope.kind);
      if (scope.kind === 'country') {
        expect(scope.parentId).toBeNull();
      } else {
        expect(scope.parentId).not.toBeNull();
        expect(getScope(scope.parentId as string)).toBeDefined();
      }
    }
  });

  it('resolves a full path from city to country', () => {
    const path = scopePath(CITY_IDS.ajaccio);
    expect(path.map((scope) => scope.kind)).toEqual(['city', 'region', 'country']);
    expect(path[2]?.countryCode).toBe('FR');
  });

  it('privileges no city in the data model', () => {
    for (const scope of GAZETTEER) {
      expect(Object.keys(scope)).not.toContain('isDefault');
      expect(Object.keys(scope)).not.toContain('isLaunchMarket');
      expect(Object.keys(scope)).not.toContain('primary');
    }
  });

  it('carries provenance for every entry, and is honest about unverified seed ids', () => {
    for (const scope of GAZETTEER) {
      expect(['geonames', 'curated']).toContain(scope.provenance.source);
      expect(typeof scope.provenance.verified).toBe('boolean');
      if (scope.provenance.source === 'geonames') {
        expect(scope.provenance.sourceId).toMatch(/^\d+$/);
        expect(scope.provenance.verified).toBe(false);
      }
    }
  });

  it('states its attribution', () => {
    expect(GEO_ATTRIBUTION).toMatch(/GeoNames/i);
    expect(GEO_ATTRIBUTION).toMatch(/CC BY 4\.0/i);
  });
});

describe('city search', () => {
  it('finds a city by prefix, case-insensitively', () => {
    expect(searchCities('ajac').map((scope) => scope.id)).toContain(CITY_IDS.ajaccio);
    expect(searchCities('AJACCIO').map((scope) => scope.id)).toContain(CITY_IDS.ajaccio);
  });

  it('ignores diacritics in both directions', () => {
    const results = searchCities('montpelier').map((scope) => scope.name);
    expect(searchCities('Montpéllier').length).toBeGreaterThanOrEqual(0);
    expect(searchCities('montpell')[0]?.name).toBe('Montpellier');
    expect(results).toBeDefined();
  });

  it('is not limited to one country', () => {
    expect(searchCities('kilrush')[0]?.countryCode).toBe('IE');
    expect(searchCities('porto')[0]?.countryCode).toBe('PT');
    expect(new Set(listCities().map((scope) => scope.countryCode)).size).toBeGreaterThan(1);
  });

  it('returns nothing for an empty query rather than the whole world', () => {
    expect(searchCities('')).toEqual([]);
    expect(searchCities('  ')).toEqual([]);
  });

  it('is deterministic and bounded', () => {
    expect(searchCities('a', 5).length).toBeLessThanOrEqual(5);
    expect(searchCities('a')).toEqual(searchCities('a'));
  });

  it('covers every city the demo dataset needs', () => {
    for (const id of Object.values(CITY_IDS)) {
      expect(getScope(id)?.kind).toBe('city');
    }
    expect(Object.keys(CITY_IDS)).toEqual(
      expect.arrayContaining([
        'ajaccio',
        'bastia',
        'marseille',
        'paris',
        'lyon',
        'montpellier',
        'kilrush',
        'porto',
      ]),
    );
  });
});

describe('worldwide city index', () => {
  it('finds a city that is not in the hand-curated seed', () => {
    const hits = searchCities('tokyo');
    expect(hits.some((scope) => /tokyo/i.test(scope.name) && scope.countryCode === 'JP')).toBe(true);
    expect(hits[0]?.id.startsWith('geo:city:')).toBe(true);
  });

  it('resolves a world city by id without a code change', () => {
    const tokyo = searchCities('tokyo').find((scope) => scope.countryCode === 'JP');
    expect(tokyo).toBeDefined();
    expect(getScope(tokyo?.id ?? '')?.name).toBe(tokyo?.name);
  });

  it('keeps seed cities first when names collide', () => {
    expect(searchCities('porto')[0]?.id).toBe(CITY_IDS.porto);
    const ajaccio = searchCities('ajaccio');
    expect(ajaccio.filter((scope) => scope.name === 'Ajaccio' && scope.countryCode === 'FR')).toHaveLength(1);
    expect(ajaccio[0]?.id).toBe(CITY_IDS.ajaccio);
  });
});
