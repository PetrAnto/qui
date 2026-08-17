import type { AgeBand } from '@indenoi/core';
import { sameAgeBand } from '@indenoi/core';

import { ports } from './store';

/**
 * The demo cast, offered at the end of onboarding.
 *
 * Onboarding is real where it matters — the declared age goes through the same
 * policy every other surface uses — but this build cannot create an account
 * (ADR-0005). So the last step hands the session to one of the synthetic
 * people, and says so plainly.
 *
 * The band the person just declared is used to filter the list *on the server*.
 * It never travels back out: a `PersonaChoice` carries no age information, so
 * the onboarding screen cannot become a way to read somebody's age band.
 */
export interface PersonaChoice {
  readonly id: string;
  readonly handle: string;
  readonly displayName: string;
  readonly bio: string;
  readonly motif: string;
}

export async function personaChoices(ageBand: AgeBand): Promise<readonly PersonaChoice[]> {
  const people = await ports().repo.listPeople();
  return people
    .filter(
      (person) =>
        sameAgeBand(person, { ageBand }) &&
        person.accountState === 'active' &&
        person.role === 'member',
    )
    .map((person) => ({
      id: person.id,
      handle: person.handle,
      displayName: person.displayName,
      bio: person.bio,
      motif: person.avatar.motif,
    }))
    .sort((a, b) => (a.displayName < b.displayName ? -1 : 1));
}
