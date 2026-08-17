import { createVouch } from '@indenoi/core';

import { isKnownCity } from '../../../lib/city';
import { guarded, settle } from '../../../lib/guard';
import { badRequest, optionalString, readJson, requireString } from '../../../lib/responses';
import { ports } from '../../../lib/store';

export const dynamic = 'force-dynamic';

/**
 * A vouch is one trust input among several. It is not identity verification, it
 * is not proof of residence, and it gives the voucher no power over the person
 * they vouched for (ADR-0003).
 */
export const POST = guarded(async (actorId, request) => {
  const body = await readJson(request);
  if (body === null) return badRequest();
  const subjectId = requireString(body, 'subjectId');
  const geoScopeId = requireString(body, 'geoScopeId');
  if (subjectId === null) return badRequest();
  if (geoScopeId === null || !isKnownCity(geoScopeId)) return badRequest('unknown_city');

  return settle(
    await createVouch(ports(), {
      actorId,
      subjectId,
      geoScopeId,
      statement: optionalString(body, 'statement') ?? '',
    }),
    201,
  );
});
