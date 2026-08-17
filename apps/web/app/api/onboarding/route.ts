import { ageBandFromAge, completeOnboarding, type GeoAttachmentKind } from '@indenoi/core';

import { activeCityCookieHeader, isKnownCity } from '../../../lib/city';
import { ATTACHMENT_KINDS } from '../../../lib/kinds';
import { personaChoices } from '../../../lib/personas';
import {
  badRequest,
  fromFailure,
  json,
  oneOf,
  optionalString,
  readJson,
  requireString,
} from '../../../lib/responses';
import { isKnownPersona, sessionCookieHeader } from '../../../lib/session';
import { ports } from '../../../lib/store';

export const dynamic = 'force-dynamic';

function stringList(body: Record<string, unknown>, key: string): readonly string[] | undefined {
  const value = body[key];
  if (!Array.isArray(value)) return undefined;
  return value.filter((entry): entry is string => typeof entry === 'string');
}

/**
 * First run.
 *
 * Unauthenticated by definition — this is the request that opens a session. The
 * age gate is nonetheless real: the declared age goes straight into
 * `completeOnboarding`, which converts it to a band through the same policy the
 * rest of the product uses and refuses anything below the baseline (ADR-0002).
 * Nothing is written and no cookie is issued when it refuses.
 *
 * The last step binds the session to one of the synthetic personas, because
 * this build cannot create an account (ADR-0005, `productionAuth` flag). The
 * screen says so; so does README.md.
 */
export async function POST(request: Request): Promise<Response> {
  const body = await readJson(request);
  if (body === null) return badRequest();

  const requested = optionalString(body, 'personaId');
  const geoScopeId = requireString(body, 'geoScopeId');
  const kind = oneOf<GeoAttachmentKind>(body, 'kind', ATTACHMENT_KINDS);
  const age = body['age'];
  if (requested !== null && !isKnownPersona(requested)) return badRequest('unknown_persona');
  if (geoScopeId === null || !isKnownCity(geoScopeId)) return badRequest('unknown_city');
  if (kind === null || typeof age !== 'number') return badRequest();

  // The age gate runs before anything else is even looked up, so an ineligible
  // answer never reaches a persona, a city or a write.
  const ageBand = ageBandFromAge(age);
  if (ageBand === null) return fromFailure('age_below_minimum');

  // With no explicit choice the server picks a persona in the band the person
  // just declared. The band itself never travels back out (see lib/personas.ts).
  const personaId = requested ?? (await personaChoices(ageBand))[0]?.id ?? null;
  if (personaId === null) return badRequest('unknown_persona');

  const result = await completeOnboarding(ports(), {
    actorId: personaId,
    declaredAge: age,
    geoScopeId,
    kind,
    practices: stringList(body, 'practices'),
    interests: stringList(body, 'interests'),
    canHelpWith: stringList(body, 'canHelpWith'),
    wantsToLearn: stringList(body, 'wantsToLearn'),
  });
  if (!result.ok) return fromFailure(result.reason);

  // Deliberately not echoing the band back: the client asked a question about
  // itself and does not need the answer stored anywhere it can read.
  const person = await ports().repo.getPerson(personaId);
  const response = json({ userId: personaId, handle: person?.handle ?? null }, 201, {
    'set-cookie': sessionCookieHeader(personaId),
  });
  response.headers.append('set-cookie', activeCityCookieHeader(geoScopeId));
  return response;
}
