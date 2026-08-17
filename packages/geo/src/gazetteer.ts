import type { GeoScope } from '@indenoi/core';

/**
 * A small, hand-curated seed used by the demo cast.
 *
 * Worldwide search lives in `generated/world-cities.json` (GeoNames
 * cities15000). This file is not the product boundary.
 *
 * Provenance: docs/geo/PROVENANCE.md. Identifier authority is GeoNames
 * (CC BY 4.0). Seed rows stay `verified: false` until checked one by one.
 */
export const GEO_ATTRIBUTION =
  'City and administrative data derived from GeoNames (geonames.org), licensed under CC BY 4.0.';

function country(slug: string, name: string, code: string): GeoScope {
  return {
    id: `geo:country:${slug}`,
    kind: 'country',
    name,
    parentId: null,
    countryCode: code,
    timezone: null,
    centroid: null,
    provenance: { source: 'curated', sourceId: null, verified: false },
  };
}

function region(slug: string, name: string, countrySlug: string, code: string): GeoScope {
  return {
    id: `geo:region:${slug}`,
    kind: 'region',
    name,
    parentId: `geo:country:${countrySlug}`,
    countryCode: code,
    timezone: null,
    centroid: null,
    provenance: { source: 'curated', sourceId: null, verified: false },
  };
}

function city(
  slug: string,
  name: string,
  regionSlug: string,
  code: string,
  geonameId: string,
  timezone: string,
  centroid: { lat: number; lng: number },
): GeoScope {
  return {
    id: `geo:city:${slug}`,
    kind: 'city',
    name,
    parentId: `geo:region:${regionSlug}`,
    countryCode: code,
    timezone,
    centroid,
    provenance: { source: 'geonames', sourceId: geonameId, verified: false },
  };
}

const COUNTRIES: readonly GeoScope[] = [
  country('fr', 'France', 'FR'),
  country('ie', 'Ireland', 'IE'),
  country('pt', 'Portugal', 'PT'),
  country('es', 'Spain', 'ES'),
  country('it', 'Italy', 'IT'),
  country('be', 'Belgium', 'BE'),
];

const REGIONS: readonly GeoScope[] = [
  region('corse', 'Corse', 'fr', 'FR'),
  region('provence-alpes-cote-dazur', "Provence-Alpes-Côte d'Azur", 'fr', 'FR'),
  region('ile-de-france', 'Île-de-France', 'fr', 'FR'),
  region('auvergne-rhone-alpes', 'Auvergne-Rhône-Alpes', 'fr', 'FR'),
  region('occitanie', 'Occitanie', 'fr', 'FR'),
  region('nouvelle-aquitaine', 'Nouvelle-Aquitaine', 'fr', 'FR'),
  region('bretagne', 'Bretagne', 'fr', 'FR'),
  region('munster', 'Munster', 'ie', 'IE'),
  region('leinster', 'Leinster', 'ie', 'IE'),
  region('norte', 'Norte', 'pt', 'PT'),
  region('lisboa', 'Área Metropolitana de Lisboa', 'pt', 'PT'),
  region('catalunya', 'Catalunya', 'es', 'ES'),
  region('andalucia', 'Andalucía', 'es', 'ES'),
  region('lazio', 'Lazio', 'it', 'IT'),
  region('sicilia', 'Sicilia', 'it', 'IT'),
  region('sardegna', 'Sardegna', 'it', 'IT'),
  region('bruxelles', 'Bruxelles-Capitale', 'be', 'BE'),
];

const CITIES: readonly GeoScope[] = [
  // France
  city('ajaccio', 'Ajaccio', 'corse', 'FR', '3037656', 'Europe/Paris', { lat: 41.9192, lng: 8.7386 }),
  city('bastia', 'Bastia', 'corse', 'FR', '3032597', 'Europe/Paris', { lat: 42.7028, lng: 9.4508 }),
  city('porto-vecchio', 'Porto-Vecchio', 'corse', 'FR', '2988358', 'Europe/Paris', { lat: 41.5911, lng: 9.2794 }),
  city('corte', 'Corte', 'corse', 'FR', '3021999', 'Europe/Paris', { lat: 42.3061, lng: 9.15 }),
  city('marseille', 'Marseille', 'provence-alpes-cote-dazur', 'FR', '2995469', 'Europe/Paris', { lat: 43.2965, lng: 5.3698 }),
  city('nice', 'Nice', 'provence-alpes-cote-dazur', 'FR', '2990440', 'Europe/Paris', { lat: 43.7031, lng: 7.2661 }),
  city('aix-en-provence', 'Aix-en-Provence', 'provence-alpes-cote-dazur', 'FR', '3038049', 'Europe/Paris', { lat: 43.5297, lng: 5.4474 }),
  city('toulon', 'Toulon', 'provence-alpes-cote-dazur', 'FR', '2972328', 'Europe/Paris', { lat: 43.1258, lng: 5.9306 }),
  city('paris', 'Paris', 'ile-de-france', 'FR', '2988507', 'Europe/Paris', { lat: 48.8566, lng: 2.3522 }),
  city('saint-denis', 'Saint-Denis', 'ile-de-france', 'FR', '2980916', 'Europe/Paris', { lat: 48.9362, lng: 2.3574 }),
  city('lyon', 'Lyon', 'auvergne-rhone-alpes', 'FR', '2996944', 'Europe/Paris', { lat: 45.7485, lng: 4.8467 }),
  city('grenoble', 'Grenoble', 'auvergne-rhone-alpes', 'FR', '3014728', 'Europe/Paris', { lat: 45.1667, lng: 5.7167 }),
  city('montpellier', 'Montpellier', 'occitanie', 'FR', '2992166', 'Europe/Paris', { lat: 43.6109, lng: 3.8763 }),
  city('toulouse', 'Toulouse', 'occitanie', 'FR', '2972315', 'Europe/Paris', { lat: 43.6045, lng: 1.4442 }),
  city('perpignan', 'Perpignan', 'occitanie', 'FR', '2987759', 'Europe/Paris', { lat: 42.6986, lng: 2.8956 }),
  city('bordeaux', 'Bordeaux', 'nouvelle-aquitaine', 'FR', '3031582', 'Europe/Paris', { lat: 44.8404, lng: -0.5805 }),
  city('biarritz', 'Biarritz', 'nouvelle-aquitaine', 'FR', '3033123', 'Europe/Paris', { lat: 43.4832, lng: -1.5586 }),
  city('rennes', 'Rennes', 'bretagne', 'FR', '2983990', 'Europe/Paris', { lat: 48.1119, lng: -1.6743 }),
  city('brest', 'Brest', 'bretagne', 'FR', '3030300', 'Europe/Paris', { lat: 48.39, lng: -4.4861 }),
  // Ireland
  city('kilrush', 'Kilrush', 'munster', 'IE', '2963208', 'Europe/Dublin', { lat: 52.6389, lng: -9.4833 }),
  city('ennis', 'Ennis', 'munster', 'IE', '2965654', 'Europe/Dublin', { lat: 52.8436, lng: -8.9864 }),
  city('galway', 'Galway', 'munster', 'IE', '2964180', 'Europe/Dublin', { lat: 53.2707, lng: -9.0568 }),
  city('cork', 'Cork', 'munster', 'IE', '2965140', 'Europe/Dublin', { lat: 51.8985, lng: -8.4756 }),
  city('dublin', 'Dublin', 'leinster', 'IE', '2964574', 'Europe/Dublin', { lat: 53.3498, lng: -6.2603 }),
  // Portugal
  city('porto', 'Porto', 'norte', 'PT', '2735943', 'Europe/Lisbon', { lat: 41.1495, lng: -8.6108 }),
  city('braga', 'Braga', 'norte', 'PT', '2742032', 'Europe/Lisbon', { lat: 41.5503, lng: -8.42 }),
  city('lisboa', 'Lisboa', 'lisboa', 'PT', '2267057', 'Europe/Lisbon', { lat: 38.7167, lng: -9.1333 }),
  // Spain
  city('barcelona', 'Barcelona', 'catalunya', 'ES', '3128760', 'Europe/Madrid', { lat: 41.3888, lng: 2.159 }),
  city('girona', 'Girona', 'catalunya', 'ES', '3121456', 'Europe/Madrid', { lat: 41.9831, lng: 2.8249 }),
  city('sevilla', 'Sevilla', 'andalucia', 'ES', '2510911', 'Europe/Madrid', { lat: 37.3891, lng: -5.9845 }),
  // Italy
  city('roma', 'Roma', 'lazio', 'IT', '3169070', 'Europe/Rome', { lat: 41.8933, lng: 12.4829 }),
  city('palermo', 'Palermo', 'sicilia', 'IT', '2523920', 'Europe/Rome', { lat: 38.1157, lng: 13.3615 }),
  city('cagliari', 'Cagliari', 'sardegna', 'IT', '2525473', 'Europe/Rome', { lat: 39.2167, lng: 9.1167 }),
  // Belgium
  city('bruxelles', 'Bruxelles', 'bruxelles', 'BE', '2800866', 'Europe/Brussels', { lat: 50.8504, lng: 4.3488 }),
];

export const GAZETTEER: readonly GeoScope[] = [...COUNTRIES, ...REGIONS, ...CITIES];

/**
 * Named handles for the cities the demo dataset uses. These exist so the seed
 * and the tests can refer to a place without hard-coding a string; they carry no
 * product meaning and grant no city any special behaviour.
 */
export const CITY_IDS = {
  ajaccio: 'geo:city:ajaccio',
  bastia: 'geo:city:bastia',
  marseille: 'geo:city:marseille',
  paris: 'geo:city:paris',
  lyon: 'geo:city:lyon',
  montpellier: 'geo:city:montpellier',
  kilrush: 'geo:city:kilrush',
  porto: 'geo:city:porto',
} as const satisfies Record<string, string>;
