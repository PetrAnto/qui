import { joinSignal, recordLocalOutcome } from '@indenoi/core';

import { guarded, settle } from '../../../../../lib/guard';
import { ports } from '../../../../../lib/store';

export const dynamic = 'force-dynamic';

interface Context {
  params: Promise<{ id: string }>;
}

export const POST = guarded<Context>(async (actorId, _request, context) => {
  const { id } = await context.params;
  return settle(await joinSignal(ports(), { actorId, signalId: id }), 201);
});

/**
 * "It actually happened." Self-reported, and the single most important number
 * in the whole product: it is the only event that says a digital signal became
 * a real-world one.
 */
export const PUT = guarded<Context>(async (actorId, _request, context) => {
  const { id } = await context.params;
  return settle(await recordLocalOutcome(ports(), { actorId, signalId: id }));
});
