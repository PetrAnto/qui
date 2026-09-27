import {
  DAY_PARTS,
  MAX_SEARCH_SLOTS,
  type ActivitySearchInput,
  type DayPart,
  type DaySlot,
  type Level,
} from '@indenoi/core';

import { isKnownCity } from './city';
import { requireString } from './responses';

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
 * The activity inputs shared by search and publication, read from a JSON body.
 * One parser, so what a search matched and what a proposal publishes cannot
 * be read differently. Returns a transport reason on failure; policy and
 * deeper validation stay in the core service.
 */
export function parseActivityInput(
  body: Record<string, unknown>,
): { readonly ok: true; readonly input: ActivitySearchInput } | { readonly ok: false; readonly reason: string } {
  const practice = requireString(body, 'practice');
  const geoScopeId = requireString(body, 'geoScopeId');
  const slots = parseSlots(body['slots']);
  const duration = body['durationMinutes'];
  if (practice === null || geoScopeId === null || slots === null || typeof duration !== 'number') {
    return { ok: false, reason: 'invalid_input' };
  }
  if (!isKnownCity(geoScopeId)) return { ok: false, reason: 'unknown_city' };

  const level = body['level'];
  const freeOnly = body['freeOnly'];
  if (level !== undefined && !(isRecord(level) && LEVELS.includes(level['value'] as Level))) {
    return { ok: false, reason: 'invalid_input' };
  }
  if (freeOnly !== undefined && !isRecord(freeOnly)) return { ok: false, reason: 'invalid_input' };

  return {
    ok: true,
    input: {
      practice,
      geoScopeId,
      slots,
      durationMinutes: duration,
      ...(isRecord(level) ? { level: { value: level['value'] as Level, mandatory: level['mandatory'] === true } } : {}),
      ...(isRecord(freeOnly) ? { freeOnly: { value: true as const, mandatory: freeOnly['mandatory'] === true } } : {}),
    },
  };
}
