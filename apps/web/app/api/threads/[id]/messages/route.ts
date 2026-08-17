import { sendMessage } from '@indenoi/core';

import { guarded, settle } from '../../../../../lib/guard';
import { badRequest, readJson, requireString } from '../../../../../lib/responses';
import { ports } from '../../../../../lib/store';

export const dynamic = 'force-dynamic';

interface Context {
  params: Promise<{ id: string }>;
}

export const POST = guarded<Context>(async (actorId, request, context) => {
  const { id } = await context.params;
  const body = await readJson(request);
  if (body === null) return badRequest();
  const text = requireString(body, 'body');
  if (text === null) return badRequest();

  return settle(await sendMessage(ports(), { actorId, threadId: id, body: text }), 201);
});
