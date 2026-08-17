/**
 * Editorial landing photography.
 *
 * These images illustrate a concept. They must never be wired to a demo
 * persona, a city, a practice card, or any sentence that would make a visitor
 * think the depicted people use, live near, or endorse this product.
 *
 * Provenance: docs/assets/LANDING_HERO_PHOTOGRAPHY.md
 */

export type HeroLayer = 'contemporary' | 'historical' | 'practice';

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
    id: 'guitarist-field',
    src: '/landing-hero/guitarist-field.webp',
    width: 1200,
    height: 1800,
    alt: 'A musician standing outdoors with an electric guitar.',
    layer: 'contemporary',
    role: 'support',
    attribution: 'Mostafameraji',
    license: 'CC BY 4.0',
    sourcePage:
      'https://commons.wikimedia.org/wiki/File:*_A_young_electronic_guitar_player_playing_in_nature_*_07.jpg',
    decorative: false,
  },
  {
    id: 'photographer-mature',
    src: '/landing-hero/photographer-mature.webp',
    width: 1200,
    height: 971,
    alt: 'A mature adult looking through a camera viewfinder outdoors.',
    layer: 'contemporary',
    role: 'support',
    attribution: 'Wilfredor',
    license: 'CC0',
    sourcePage: 'https://commons.wikimedia.org/wiki/File:Chinese_woman_photographer_in_Maracaibo.jpg',
    decorative: false,
  },
  {
    id: 'street-accordion',
    src: '/landing-hero/street-accordion.webp',
    width: 1000,
    height: 743,
    alt: 'A bearded street musician playing an accordion beside a painted door.',
    layer: 'contemporary',
    role: 'support',
    attribution: 'Alan Veale',
    license: 'CC BY-SA 2.0',
    sourcePage: 'https://commons.wikimedia.org/wiki/File:2017-07-17_Notes_for_Notes.jpg',
    decorative: false,
  },
  {
    id: 'craft-tongs',
    src: '/landing-hero/craft-tongs.webp',
    width: 1100,
    height: 916,
    alt: '',
    layer: 'practice',
    role: 'texture',
    attribution: 'Kritzolina',
    license: 'CC BY-SA 4.0',
    sourcePage:
      'https://commons.wikimedia.org/wiki/File:Blacksmith_at_the_Chokhi_Dhani_Resort_Panchkula_07.jpg',
    decorative: true,
  },
  {
    id: 'history-fisherman',
    src: '/landing-hero/history-fisherman.webp',
    width: 1400,
    height: 1685,
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
