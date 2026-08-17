import { listThreadsFor } from '@indenoi/core';

import { guarded } from '../../../lib/guard';
import { json, notFound } from '../../../lib/responses';
import { ports } from '../../../lib/store';

export const dynamic = 'force-dynamic';

/** Every conversation this person is part of. There are no others to list. */
export const GET = guarded(async (viewerId) => {
  const threads = await listThreadsFor(ports(), viewerId);
  return threads === null ? notFound() : json({ threads });
});
