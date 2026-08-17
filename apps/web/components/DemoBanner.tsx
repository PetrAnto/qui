import Link from 'next/link';

import { IS_DEMO_BUILD } from '../lib/features';

/**
 * The banner is not decoration and not dismissible.
 *
 * Every account, post, message and number in this build is synthetic. Editorial
 * photographs on the welcome hero are licensed illustrations, not members — the
 * banner must not pretend those photographs are invented people. It disappears
 * only when the build stops being a demo (INV-DEMO-1).
 */
export function DemoBanner() {
  if (!IS_DEMO_BUILD) return null;
  return (
    <div className="banner" role="note">
      <span className="banner__dot" aria-hidden="true" />
      <span>Demo build — every account and post here is invented</span>
      <Link href="/about">What is real?</Link>
    </div>
  );
}
