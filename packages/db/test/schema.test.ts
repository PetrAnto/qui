import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import * as schema from '../src/schema';

const MIGRATIONS_DIR = join(import.meta.dirname, '..', 'migrations');

describe('drizzle schema', () => {
  it('declares the tables the domain needs', () => {
    const tables = Object.keys(schema);
    for (const expected of [
      'people',
      'attestations',
      'geoScopes',
      'geoAttachments',
      'posts',
      'appreciations',
      'signals',
      'signalResponses',
      'participants',
      'hostExclusions',
      'threads',
      'messages',
      'blocks',
      'reports',
      'moderationCases',
      'moderationActions',
      'communityInvites',
      'vouchEvidence',
      'auditEvents',
      'analyticsEvents',
    ]) {
      expect(tables).toContain(expected);
    }
  });
});

describe('committed migrations', () => {
  const files = readdirSync(MIGRATIONS_DIR).filter((file) => file.endsWith('.sql'));
  const sql = files.map((file) => readFileSync(join(MIGRATIONS_DIR, file), 'utf8')).join('\n');

  it('exists and is committed', () => {
    expect(files.length).toBeGreaterThan(0);
  });

  it('INV-GEO-1: has no coordinate column on any person-scoped table', () => {
    const personTables = /create table[^;]*?(people|geo_attachments|attestations)[^;]*?;/gis;
    for (const statement of sql.match(personTables) ?? []) {
      expect(statement).not.toMatch(/\b(lat|lng|latitude|longitude|geohash|h3_index)\b/i);
    }
  });

  it('INV-KYC-1: has no column able to hold document material', () => {
    expect(sql).not.toMatch(/\b(document_number|document_image|selfie|date_of_birth|home_address|mrz)\b/i);
  });

  it('INV-SOCIAL-1: has no column able to hold a third-party credential', () => {
    expect(sql).not.toMatch(/\b(password|access_token|refresh_token|session_cookie)\b/i);
  });

  it('stores age as a band rather than a birth date', () => {
    expect(sql).toMatch(/age_band/i);
    expect(sql).not.toMatch(/\bbirth\b/i);
  });

  it('is additive: no destructive statement in the initial migration set', () => {
    expect(sql).not.toMatch(/\bDROP TABLE\b/i);
    expect(sql).not.toMatch(/\bDELETE FROM\b/i);
  });
});
