'use client';

import { useEffect } from 'react';

import { api } from '../lib/client';

type ViewEvent = 'discover_impression' | 'content_open' | 'profile_open';

/**
 * The only instrumentation the browser is allowed to send.
 *
 * Three event names, and only fields the closed analytics shape already has
 * (INV-ANALYTICS-1). There is no time-spent timer here and there is nowhere to
 * put one: the question this product needs answered is "where is it starting to
 * work", not "how long did they stare at it".
 */
export function TrackView({
  name,
  geoScopeId = null,
  targetId = null,
  practice = null,
}: {
  name: ViewEvent;
  geoScopeId?: string | null;
  targetId?: string | null;
  practice?: string | null;
}) {
  useEffect(() => {
    void api.post('/api/track', { name, geoScopeId, targetId, practice });
  }, [name, geoScopeId, targetId, practice]);
  return null;
}
