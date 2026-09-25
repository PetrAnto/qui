import {
  DAY_PARTS,
  MAX_SEARCH_SLOTS,
  searchActivities,
  type DayPart,
  type DaySlot,
  type Level,
} from '@indenoi/core';

import { isKnownCity } from '../../../../lib/city';
import { guarded, settle } from '../../../../lib/guard';
import { badRequest, readJson, requireString } from '../../../../lib/responses';
import { ports } from '../../../../lib/store';

export const dynamic = 'force-dynamic';

const LEVELS: readonly Level[] = ['any', 'beginner', 'intermediate', 'advanced'];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseSlots(value: unknown): DaySlot[] | null {
  if (!Array.isArray(value) || value.length === 0 || value.length > MAX_SEARCH_SLOTS) return null;
  const slots: DaySlot[] = [];
  for (const entry of value) {
    if (!isRecord(entry)) return null;
    const { date, part, preferred } = entry;
    if (typeof date !== 'string' || typeof part !== 'string') return null;
    if (!(DAY_PARTS as readonly string[]).includes(part)) return null;
    slots.push({ date, part: part as DayPart, preferred: preferred === true });
  }
  return slots;
}

/**
 * Activity search. POST, so what somebody typed never lands in a URL, a log
 * line or a browser history entry. Authenticated like every read here: the
 * results are projected through the viewer's blocks, age band and audience
 * (INV-CACHE-1 headers come from `json`). It reads only — nothing is
 * published, joined or recorded.
 */
export const POST = guarded(async (actorId, request) => {
  const body = await readJson(request);
  if (body === null) return badRequest();

  const practice = requireString(body, 'practice');
  const geoScopeId = requireString(body, 'geoScopeId');
  const slots = parseSlots(body['slots']);
  const duration = body['durationMinutes'];
  if (practice === null || geoScopeId === null || slots === null || typeof duration !== 'number') {
    return badRequest();
  }
  if (!isKnownCity(geoScopeId)) return badRequest('unknown_city');

  const level = body['level'];
  const freeOnly = body['freeOnly'];
  if (level !== undefined && !(isRecord(level) && LEVELS.includes(level['value'] as Level))) return badRequest();
  if (freeOnly !== undefined && !isRecord(freeOnly)) return badRequest();

  return settle(
    await searchActivities(ports(), {
      viewerId: actorId,
      input: {
        practice,
        geoScopeId,
        slots,
        durationMinutes: duration,
        ...(isRecord(level) ? { level: { value: level['value'] as Level, mandatory: level['mandatory'] === true } } : {}),
        ...(isRecord(freeOnly) ? { freeOnly: { value: true as const, mandatory: freeOnly['mandatory'] === true } } : {}),
      },
    }),
  );
});
