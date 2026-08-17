import { getSignalDetail } from '@indenoi/core';

import { guarded } from '../../../../lib/guard';
import { json, notFound } from '../../../../lib/responses';
import { ports } from '../../../../lib/store';

export const dynamic = 'force-dynamic';

interface Context {
  params: Promise<{ id: string }>;
}

/**
 * One signal, projected for this viewer. Responses and host powers are only
 * ever populated for the person who hosts it (INV-HOST-2).
 */
export const GET = guarded<Context>(async (viewerId, _request, context) => {
  const { id } = await context.params;
  const detail = await getSignalDetail(ports(), { viewerId, signalId: id });
  return detail === null ? notFound() : json(detail);
});
