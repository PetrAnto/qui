import { confirmHost, volunteerToHost } from '@indenoi/core';

import { guarded } from '../../../../../lib/guard';
import { badRequest, fromFailure, json, readJson, requireString } from '../../../../../lib/responses';
import { ports } from '../../../../../lib/store';

export const dynamic = 'force-dynamic';

interface Context {
  params: Promise<{ id: string }>;
}

/**
 * Host designation for an activity proposal (ADR-0016, INV-HOST-3). Two
 * separate acts by two different people:
 *
 * - POST — the signed-in person offers to host (their own explicit consent).
 *   201 the first time, 200 when that offer already exists.
 * - PUT `{ volunteerId }` — the signed-in proposer confirms that volunteer.
 *   201 when this installs the host, 200 when it already was this host.
 *
 * Neither lets anybody act for somebody else: the actor is always the session
 * user, and every rule is checked by the core service.
 */
export const POST = guarded<Context>(async (actorId, _request, context) => {
  const { id } = await context.params;
  const result = await volunteerToHost(ports(), { actorId, signalId: id });
  if (!result.ok) return fromFailure(result.reason);
  return json(result.value, result.value.offered ? 201 : 200);
});

export const PUT = guarded<Context>(async (actorId, request, context) => {
  const { id } = await context.params;
  const body = await readJson(request);
  if (body === null) return badRequest();
  const volunteerId = requireString(body, 'volunteerId');
  if (volunteerId === null) return badRequest();
  const result = await confirmHost(ports(), { proposerId: actorId, signalId: id, volunteerId });
  if (!result.ok) return fromFailure(result.reason);
  return json(result.value, result.value.designated ? 201 : 200);
});
