import { respondToSignal } from '@indenoi/core';

import { guarded, settle } from '../../../../../lib/guard';
import { badRequest, readJson, requireString } from '../../../../../lib/responses';
import { ports } from '../../../../../lib/store';

export const dynamic = 'force-dynamic';

interface Context {
  params: Promise<{ id: string }>;
}

/**
 * Responding to a signal is the only way to reach somebody. The host still has
 * to accept before anything private opens.
 */
export const POST = guarded<Context>(async (actorId, request, context) => {
  const { id } = await context.params;
  const body = await readJson(request);
  if (body === null) return badRequest();
  const message = requireString(body, 'message');
  if (message === null) return badRequest();

  return settle(await respondToSignal(ports(), { actorId, signalId: id, message }), 201);
});
