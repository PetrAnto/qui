import { redirect } from 'next/navigation';

import { LandingHero } from '../../components/LandingHero';
import { Onboarding } from '../../components/Onboarding';
import { currentUserId } from '../../lib/session';

export const dynamic = 'force-dynamic';

/**
 * First run.
 *
 * The hero is visual only. The questions that follow are unchanged: how old
 * are you, where are you, what do you do. City is a search, not a privileged
 * dropdown. The age answer goes through the same policy as everything else.
 */
export default async function WelcomePage() {
  if ((await currentUserId()) !== null) redirect('/');

  return (
    <div className="welcome">
      <LandingHero />
      <Onboarding />
    </div>
  );
}
