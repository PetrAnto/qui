import { redirect } from 'next/navigation';

import { listCities } from '@indenoi/geo';

import { Onboarding } from '../../components/Onboarding';
import { currentUserId } from '../../lib/session';

export const dynamic = 'force-dynamic';

/**
 * First run.
 *
 * Three questions, in this order: how old are you, where are you, what do you
 * do. The first one is a real gate — the answer goes through the same age
 * policy as everything else, is turned into a band, and the number itself is
 * never stored (ADR-0002). The third is what makes Discover worth opening.
 */
export default async function WelcomePage() {
  if ((await currentUserId()) !== null) redirect('/');

  const cities = listCities().map((scope) => ({
    id: scope.id,
    name: scope.name,
    countryCode: scope.countryCode,
  }));

  return <Onboarding cities={cities} />;
}
