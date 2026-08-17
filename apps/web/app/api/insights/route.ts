import { getInsights } from '@indenoi/core';

import { guarded } from '../../../lib/guard';
import { json } from '../../../lib/responses';
import { ports } from '../../../lib/store';

export const dynamic = 'force-dynamic';

/**
 * Internal cluster analytics: where is this starting to work?
 *
 * Everything here is aggregate and comes from the closed analytics shape
 * (INV-ANALYTICS-1), so there is no personal data to leak — no names, no
 * handles, no free-form payload, and no time-spent. A production deployment
 * must additionally place this behind the internal role; that is a release
 * checklist item, not something the demo can fake.
 */
export const GET = guarded(async () => json(await getInsights(ports())));
