import { redirect } from 'next/navigation';

import { Onboarding } from '../../components/Onboarding';
import { LandingHeader } from '../../components/landing/LandingHeader';
import { LandingHero } from '../../components/landing/LandingHero';
import { LandingSections } from '../../components/landing/LandingSections';
import { currentUserId } from '../../lib/session';

export const dynamic = 'force-dynamic';

/**
 * The public landing page and the door in (canon 03_LANDING_PAGE_SPEC.md).
 *
 * The narrative does the explaining — dark cinematic hero, then light
 * product-proof sections — and the onboarding stays a distinct logical flow
 * at the end of it (`#get-access`). The questions are unchanged: how old are
 * you, where are you, what do you do. City is a search, not a privileged
 * dropdown; the age answer goes through the same policy as everything else.
 */
export default async function WelcomePage() {
  if ((await currentUserId()) !== null) redirect('/');

  return (
    <div className="welcome">
      <LandingHeader />
      <LandingHero />
      <LandingSections />

      <section className="section stack" id="get-access" aria-labelledby="get-access-title">
        <header className="section__head">
          <h2 id="get-access-title">Get early access</h2>
          <p className="muted">
            Three honest questions — your age band, a place you have a real tie to, and what you
            actually do. No location permission, no document upload, no follower import.
          </p>
        </header>
        <Onboarding />
      </section>
    </div>
  );
}
