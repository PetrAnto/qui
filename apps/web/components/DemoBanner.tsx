import Link from 'next/link';

import { IS_DEMO_BUILD } from '../lib/features';

/**
 * The banner is not decoration and not dismissible.
 *
 * Every person, photograph, message and number in this build is synthetic, and
 * anybody looking at it deserves to know that without reading a README. It
 * disappears only when the build stops being a demo — that is, when one of the
 * production capability flags is switched on (INV-DEMO-1).
 */
export function DemoBanner() {
  if (!IS_DEMO_BUILD) return null;
  return (
    <div className="banner" role="note">
      <span className="banner__dot" aria-hidden="true" />
      <span>Demo build — every person and post here is invented</span>
      <Link href="/about">What is real?</Link>
    </div>
  );
}
