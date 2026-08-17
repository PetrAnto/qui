import { getThreadView } from '@indenoi/core';

import { guarded } from '../../../../lib/guard';
import { json, notFound } from '../../../../lib/responses';
import { ports } from '../../../../lib/store';

export const dynamic = 'force-dynamic';

interface Context {
  params: Promise<{ id: string }>;
}

/**
 * A thread, for a participant. Anybody else gets a 404 — not a 403, which would
 * confirm the conversation exists.
 */
export const GET = guarded<Context>(async (viewerId, _request, context) => {
  const { id } = await context.params;
  const view = await getThreadView(ports(), { viewerId, threadId: id });
  return view === null ? notFound() : json(view);
});
