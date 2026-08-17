import { getProfile } from '@indenoi/core';

import { guarded } from '../../../../lib/guard';
import { json, notFound } from '../../../../lib/responses';
import { ports } from '../../../../lib/store';

export const dynamic = 'force-dynamic';

interface Context {
  params: Promise<{ handle: string }>;
}

/**
 * A profile the viewer is allowed to see, or a plain 404. A blocked or
 * suspended account is indistinguishable from one that never existed.
 */
export const GET = guarded<Context>(async (viewerId, _request, context) => {
  const { handle } = await context.params;
  const view = await getProfile(ports(), { viewerId, handle });
  return view === null ? notFound() : json(view);
});
