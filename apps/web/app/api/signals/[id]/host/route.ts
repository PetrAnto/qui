import { closeSignal, decideResponse, removeParticipant } from '@indenoi/core';

import { guarded, settle } from '../../../../../lib/guard';
import {
  badRequest,
  oneOf,
  optionalString,
  readJson,
  requireString,
} from '../../../../../lib/responses';
import { ports } from '../../../../../lib/store';

export const dynamic = 'force-dynamic';

interface Context {
  params: Promise<{ id: string }>;
}

const ACTIONS = ['accept', 'decline', 'remove', 'exclude', 'close'] as const;

/**
 * Host controls, scoped to one hosted object. The domain layer checks ownership
 * for each one; this handler only translates the wire format.
 */
export const POST = guarded<Context>(async (hostId, request, context) => {
  const { id } = await context.params;
  const body = await readJson(request);
  if (body === null) return badRequest();
  const action = oneOf(body, 'action', ACTIONS);
  if (action === null) return badRequest();

  if (action === 'accept' || action === 'decline') {
    const responseId = requireString(body, 'responseId');
    if (responseId === null) return badRequest();
    return settle(
      await decideResponse(ports(), {
        hostId,
        responseId,
        decision: action === 'accept' ? 'accepted' : 'declined',
      }),
    );
  }

  if (action === 'close') {
    return settle(await closeSignal(ports(), { hostId, signalId: id }));
  }

  const userId = requireString(body, 'userId');
  if (userId === null) return badRequest();
  return settle(
    await removeParticipant(ports(), {
      hostId,
      signalId: id,
      userId,
      exclude: action === 'exclude',
      reason: optionalString(body, 'reason') ?? '',
    }),
  );
});
