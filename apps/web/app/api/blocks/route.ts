import { blockUser, unblockUser } from '@indenoi/core';

import { guarded, settle } from '../../../lib/guard';
import { badRequest, readJson, requireString } from '../../../lib/responses';
import { ports } from '../../../lib/store';

export const dynamic = 'force-dynamic';

/**
 * Blocking is structural, not cosmetic: the domain layer closes shared threads
 * and every read path projects around the edge.
 */
export const POST = guarded(async (actorId, request) => {
  const body = await readJson(request);
  if (body === null) return badRequest();
  const targetId = requireString(body, 'targetId');
  if (targetId === null) return badRequest();

  return settle(await blockUser(ports(), { actorId, targetId }), 201);
});

export const DELETE = guarded(async (actorId, request) => {
  const body = await readJson(request);
  if (body === null) return badRequest();
  const targetId = requireString(body, 'targetId');
  if (targetId === null) return badRequest();

  return settle(await unblockUser(ports(), { actorId, targetId }));
});
