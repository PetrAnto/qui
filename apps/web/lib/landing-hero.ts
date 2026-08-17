/**
 * Editorial landing photography.
 *
 * These images illustrate a concept. They must never be wired to a demo
 * persona, a city, a practice card, or any sentence that would make a visitor
 * think the depicted people use, live near, or endorse this product.
 *
 * Provenance: docs/assets/LANDING_HERO_PHOTOGRAPHY.md
 */

export type HeroLayer = 'contemporary' | 'historical';

export interface LandingHeroPhoto {
  readonly id: string;
  readonly src: string;
  readonly width: number;
  readonly height: number;
  readonly alt: string;
  readonly layer: HeroLayer;
  readonly role: 'dominant' | 'support' | 'texture';
  readonly attribution: string;
  readonly license: string;
  readonly sourcePage: string;
  readonly decorative: boolean;
}

export const LANDING_DISCLAIMER =
  'Photographs are editorial illustrations of real human practices. They are not members, not endorsements, and not people in your city.';

export const LANDING_HERO_PHOTOS: readonly LandingHeroPhoto[] = [
  {
    id: 'photographer-street',
    src: '/landing-hero/photographer-street.webp',
    width: 1400,
    height: 1887,
    alt: 'A young adult photographing in a city square, camera raised to their eye.',
    layer: 'contemporary',
    role: 'dominant',
    attribution: 'Pedro Ribeiro Simões',
    license: 'CC BY 2.0',
    sourcePage: 'https://commons.wikimedia.org/wiki/File:Street_woman_photographer_(49205775828).jpg',
    decorative: false,
  },
  {
    id: 'carpenter-workshop',
    src: '/landing-hero/carpenter-workshop.webp',
    width: 960,
    height: 1440,
    alt: 'A carpenter measuring a board at a workshop bench.',
    layer: 'contemporary',
    role: 'support',
    attribution: 'Rwebogora',
    license: 'CC BY-SA 4.0',
    sourcePage: 'https://commons.wikimedia.org/wiki/File:A_carpenter_creating_measurements.jpg',
    decorative: false,
  },
  {
    id: 'street-accordion',
    src: '/landing-hero/street-accordion.webp',
    width: 563,
    height: 648,
    alt: 'A mature street musician seated on a folding stool playing an accordion.',
    layer: 'contemporary',
    role: 'support',
    attribution: 'Sergey Ivanov',
    license: 'CC BY-SA 3.0',
    sourcePage: 'https://commons.wikimedia.org/wiki/File:A_Street_Musician_(25517139).jpeg',
    decorative: false,
  },
  {
    id: 'skate-park',
    src: '/landing-hero/skate-park.webp',
    width: 900,
    height: 1350,
    alt: 'Two young people skateboarding in a public concrete skate park.',
    layer: 'contemporary',
    role: 'support',
    attribution: 'Wallace Chuck',
    license: 'Pexels License',
    sourcePage: 'https://www.pexels.com/photo/teenage-boys-skateboarding-in-skate-park-at-sunset-17024829/',
    decorative: false,
  },
  {
    id: 'history-fisherman',
    src: '/landing-hero/history-fisherman.webp',
    width: 840,
    height: 1264,
    alt: '',
    layer: 'historical',
    role: 'texture',
    attribution: 'Unknown photographer, Library of Congress photochrome (public domain)',
    license: 'Public domain',
    sourcePage: 'https://commons.wikimedia.org/wiki/File:Eiland_Marken_-_Visser_1900.jpg',
    decorative: true,
  },
];

export function contemporaryHeroPhotos(): readonly LandingHeroPhoto[] {
  return LANDING_HERO_PHOTOS.filter((photo) => photo.layer === 'contemporary');
}

export function requiredAttributions(): readonly LandingHeroPhoto[] {
  return LANDING_HERO_PHOTOS.filter((photo) => photo.license !== 'CC0' && photo.license !== 'Public domain');
}
