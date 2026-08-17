import { toggleAppreciation } from '@indenoi/core';

import { guarded, settle } from '../../../lib/guard';
import { badRequest, readJson, requireString } from '../../../lib/responses';
import { ports } from '../../../lib/store';

export const dynamic = 'force-dynamic';

/** Appreciation is a toggle on a piece of content. It is never a rating of a person. */
export const POST = guarded(async (actorId, request) => {
  const body = await readJson(request);
  if (body === null) return badRequest();
  const postId = requireString(body, 'postId');
  if (postId === null) return badRequest();

  return settle(await toggleAppreciation(ports(), { actorId, postId }));
});
