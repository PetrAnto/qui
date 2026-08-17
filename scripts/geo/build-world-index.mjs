#!/usr/bin/env node
/**
 * Build a compact worldwide city search index from a GeoNames cities15000 dump.
 *
 * Input:  /tmp/geonames/cities15000.txt  (tab-separated official dump)
 * Output: packages/geo/src/generated/world-cities.json
 *
 * Each row is [geonameId, name, asciiName, countryCode, admin1, lat, lng, tz, pop]
 * so search stays data, not a per-city code path (ADR-0004).
 */
import { createReadStream, mkdirSync, writeFileSync } from 'node:fs';
import { createInterface } from 'node:readline';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const INPUT = process.argv[2] ?? '/tmp/geonames/cities15000.txt';
const OUTPUT = join(ROOT, 'packages/geo/src/generated/world-cities.json');

const rows = [];
const stream = createInterface({ input: createReadStream(INPUT, { encoding: 'utf8' }) });

for await (const line of stream) {
  if (line.length === 0) continue;
  const cols = line.split('\t');
  const geonameId = cols[0];
  const name = cols[1];
  const asciiName = cols[2];
  const featureClass = cols[6];
  const countryCode = cols[8];
  const admin1 = cols[10] ?? '';
  const population = Number.parseInt(cols[14] ?? '0', 10);
  const lat = Number.parseFloat(cols[4] ?? '');
  const lng = Number.parseFloat(cols[5] ?? '');
  const tz = cols[17] ?? '';
  if (featureClass !== 'P') continue;
  if (!geonameId || !name || !countryCode || !Number.isFinite(lat) || !Number.isFinite(lng)) continue;
  rows.push([
    Number.parseInt(geonameId, 10),
    name,
    asciiName && asciiName !== name ? asciiName : '',
    countryCode,
    admin1,
    Number(lat.toFixed(4)),
    Number(lng.toFixed(4)),
    tz,
    Number.isFinite(population) ? population : 0,
  ]);
}

rows.sort((a, b) => b[8] - a[8] || String(a[1]).localeCompare(String(b[1])));

const payload = {
  source: 'GeoNames cities15000',
  license: 'CC BY 4.0',
  attribution: 'City and administrative data derived from GeoNames (geonames.org), licensed under CC BY 4.0.',
  dumpPath: 'https://download.geonames.org/export/dump/cities15000.zip',
  builtAt: new Date().toISOString().slice(0, 10),
  count: rows.length,
  columns: ['geonameId', 'name', 'asciiName', 'countryCode', 'admin1', 'lat', 'lng', 'tz', 'population'],
  cities: rows,
};

mkdirSync(dirname(OUTPUT), { recursive: true });
writeFileSync(OUTPUT, `${JSON.stringify(payload)}\n`);
process.stdout.write(`wrote ${rows.length} cities to ${OUTPUT}\n`);
