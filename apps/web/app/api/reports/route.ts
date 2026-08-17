import { reportContent } from '@indenoi/core';

import { guarded } from '../../../lib/guard';
import { REPORT_REASONS, REPORT_TARGETS } from '../../../lib/kinds';
import {
  badRequest,
  fromFailure,
  json,
  oneOf,
  optionalString,
  readJson,
  requireString,
} from '../../../lib/responses';
import { ports } from '../../../lib/store';

export const dynamic = 'force-dynamic';

/**
 * The response deliberately confirms receipt and nothing else: no case id, no
 * state, no echo of the note (INV-MOD-1). Whatever the reporter wrote is for
 * moderation, and the reported person must not be able to learn it.
 */
export const POST = guarded(async (reporterId, request) => {
  const body = await readJson(request);
  if (body === null) return badRequest();

  const targetType = oneOf(body, 'targetType', REPORT_TARGETS);
  const targetId = requireString(body, 'targetId');
  const reason = oneOf(body, 'reason', REPORT_REASONS);
  if (targetType === null || targetId === null || reason === null) return badRequest();

  const result = await reportContent(ports(), {
    reporterId,
    targetType,
    targetId,
    reason,
    note: optionalString(body, 'note') ?? '',
  });
  return result.ok ? json({ received: true }, 201) : fromFailure(result.reason);
});
