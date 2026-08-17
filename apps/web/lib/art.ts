import type { MediaAsset } from '@indenoi/core';

/**
 * Deterministic generated artwork.
 *
 * This build has no upload path (ADR-0007 defers Cloudflare Images/Stream until
 * an account can be provisioned), and a grid of grey placeholder boxes would
 * misrepresent what the product is meant to feel like. So each media asset is
 * rendered as layered gradients derived from its seed: stable, offline, and
 * obviously not a photograph — the demo badge says so on every card.
 */

interface Palette {
  readonly base: string;
  readonly glow: string;
  readonly accent: string;
}

const PALETTES: Readonly<Record<string, Palette>> = {
  sea: { base: '190 72% 16%', glow: '178 84% 52%', accent: '204 92% 62%' },
  workshop: { base: '24 48% 14%', glow: '32 88% 56%', accent: '14 82% 58%' },
  street: { base: '268 40% 16%', glow: '292 82% 62%', accent: '330 84% 62%' },
  stage: { base: '250 52% 15%', glow: '262 88% 66%', accent: '198 90% 60%' },
  garden: { base: '150 44% 13%', glow: '128 72% 50%', accent: '82 78% 56%' },
  court: { base: '210 54% 14%', glow: '208 88% 58%', accent: '160 78% 52%' },
  trail: { base: '96 34% 13%', glow: '68 68% 52%', accent: '36 84% 58%' },
  studio: { base: '340 42% 15%', glow: '18 86% 62%', accent: '46 92% 62%' },
  market: { base: '18 44% 15%', glow: '44 90% 60%', accent: '8 84% 60%' },
  wave: { base: '200 60% 16%', glow: '186 82% 54%', accent: '224 86% 66%' },
};

const FALLBACK: Palette = { base: '220 30% 14%', glow: '210 80% 58%', accent: '270 80% 64%' };

/** FNV-1a: small, stable, and identical on every runtime we target. */
function hash(seed: string): number {
  let value = 0x811c9dc5;
  for (let index = 0; index < seed.length; index += 1) {
    value ^= seed.charCodeAt(index);
    value = Math.imul(value, 0x01000193) >>> 0;
  }
  return value;
}

export interface Artwork {
  readonly background: string;
  readonly tint: string;
  readonly angle: number;
}

export function artworkFor(seed: string, motif: string): Artwork {
  const palette = PALETTES[motif] ?? FALLBACK;
  const value = hash(`${seed}:${motif}`);
  const angle = value % 360;
  const x1 = 12 + (value % 60);
  const y1 = 18 + ((value >> 4) % 55);
  const x2 = 30 + ((value >> 8) % 62);
  const y2 = 22 + ((value >> 12) % 60);

  return {
    angle,
    tint: `hsl(${palette.glow})`,
    background: [
      `radial-gradient(120% 90% at ${x1}% ${y1}%, hsl(${palette.glow} / 0.85), transparent 62%)`,
      `radial-gradient(90% 80% at ${x2}% ${y2}%, hsl(${palette.accent} / 0.7), transparent 58%)`,
      `linear-gradient(${angle}deg, hsl(${palette.base}), hsl(${palette.base} / 0.4))`,
    ].join(', '),
  };
}

export function artworkForMedia(media: MediaAsset): Artwork {
  return artworkFor(media.seed, media.motif);
}

export function initials(displayName: string): string {
  const parts = displayName.trim().split(/\s+/);
  return parts
    .slice(0, 2)
    .map((part) => [...part][0] ?? '')
    .join('')
    .toUpperCase();
}
