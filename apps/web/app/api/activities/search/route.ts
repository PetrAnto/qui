import { searchActivities } from '@indenoi/core';

import { parseActivityInput } from '../../../../lib/activity-input';
import { guarded, settle } from '../../../../lib/guard';
import { badRequest, readJson } from '../../../../lib/responses';
import { ports } from '../../../../lib/store';

export const dynamic = 'force-dynamic';

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
  const parsed = parseActivityInput(body);
  if (!parsed.ok) return badRequest(parsed.reason);
  return settle(await searchActivities(ports(), { viewerId: actorId, input: parsed.input }));
});
