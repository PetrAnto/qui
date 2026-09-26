import { publishProposal } from '@indenoi/core';

import { parseActivityInput } from '../../../../lib/activity-input';
import { guarded } from '../../../../lib/guard';
import { badRequest, fromFailure, json, readJson, requireString } from '../../../../lib/responses';
import { ports } from '../../../../lib/store';

export const dynamic = 'force-dynamic';

/**
 * Publishes the proposal a search became, from the same inputs (ADR-0016).
 *
 * The one explicit action on the preview. It is idempotent on `proposalKey`,
 * which the browser keeps with the draft: a retry or a double click answers
 * 200 with the activity already created instead of making a second one. A
 * first publication answers 201. Eligibility — active adult, `publish`, an
 * existing tie of any kind to the city — is checked by the core service
 * before anything is written; a refusal writes nothing.
 */
export const POST = guarded(async (actorId, request) => {
  const body = await readJson(request);
  if (body === null) return badRequest();
  const parsed = parseActivityInput(body);
  if (!parsed.ok) return badRequest(parsed.reason);
  const proposalKey = requireString(body, 'proposalKey');
  if (proposalKey === null) return badRequest();

  const result = await publishProposal(ports(), { actorId, input: parsed.input, proposalKey });
  if (!result.ok) return fromFailure(result.reason);
  return json(result.value, result.value.created ? 201 : 200);
});
