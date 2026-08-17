import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import * as path from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  LANDING_DISCLAIMER,
  LANDING_HERO_PHOTOS,
  contemporaryHeroPhotos,
  requiredAttributions,
} from '../lib/landing-hero';

const FORBIDDEN = [
  /member/i,
  /lives in your/i,
  /looking to meet/i,
  /endorses/i,
  /qui user/i,
  /year-old/i,
  /attractive/i,
];

describe('landing hero photography', () => {
  it('uses a small contemporary set plus at most two textures', () => {
    expect(contemporaryHeroPhotos().length).toBeGreaterThanOrEqual(4);
    expect(contemporaryHeroPhotos().length).toBeLessThanOrEqual(6);
    expect(LANDING_HERO_PHOTOS.filter((photo) => photo.layer === 'historical').length).toBeLessThanOrEqual(
      2,
    );
    expect(LANDING_HERO_PHOTOS.some((photo) => photo.role === 'dominant')).toBe(true);
  });

  it('never attaches invented identities or endorsement language', () => {
    const blob = LANDING_HERO_PHOTOS.map((photo) => `${photo.alt}\n${photo.attribution}`).join('\n');
    for (const pattern of FORBIDDEN) {
      expect(blob).not.toMatch(pattern);
    }
    expect(LANDING_DISCLAIMER.toLowerCase()).toContain('not members');
  });

  it('gives every visible person an activity-first alt, and textures stay decorative', () => {
    for (const photo of LANDING_HERO_PHOTOS) {
      if (photo.decorative) {
        expect(photo.alt).toBe('');
        continue;
      }
      expect(photo.alt.length).toBeGreaterThan(20);
      expect(photo.alt).not.toMatch(/\d{2}-year-old/);
    }
  });

  it('records a licence and a source page for every asset', () => {
    for (const photo of LANDING_HERO_PHOTOS) {
      expect(photo.license.length).toBeGreaterThan(2);
      expect(photo.sourcePage.startsWith('https://')).toBe(true);
      expect(photo.src.startsWith('/landing-hero/')).toBe(true);
    }
    expect(requiredAttributions().length).toBeGreaterThan(0);
  });

  it('ships optimized local copies rather than remote URLs', () => {
    const candidates = [
      path.join(process.cwd(), 'apps/web/public'),
      path.join(process.cwd(), 'public'),
    ];
    const dir = candidates.find((entry) => existsSync(entry));
    expect(dir).toBeDefined();
    for (const photo of LANDING_HERO_PHOTOS) {
      const file = path.join(dir ?? '', photo.src.replace(/^\//, ''));
      expect(existsSync(file), file).toBe(true);
      expect(statSync(file).size).toBeGreaterThan(8_000);
      expect(statSync(file).size).toBeLessThan(400_000);
    }
  });

  it('is imported only from the welcome route', () => {
    const root = path.join(process.cwd(), 'apps/web');
    const webRoot = existsSync(root) ? root : process.cwd();
    const sources: string[] = [];
    const walk = (dir: string): void => {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        if (entry.name === 'node_modules' || entry.name === '.next') continue;
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) walk(full);
        else if (/\.(tsx|ts)$/.test(entry.name)) sources.push(full);
      }
    };
    walk(webRoot);
    const importers = sources.filter((file) => {
      if (file.endsWith(`${path.sep}LandingHero.tsx`)) return false;
      return /from ['"][^'"]*LandingHero['"]/.test(readFileSync(file, 'utf8'));
    });
    expect(importers.map((file) => path.relative(webRoot, file))).toEqual([
      path.join('app', 'welcome', 'page.tsx'),
    ]);
  });
});
