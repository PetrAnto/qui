import { badRequest, json, readJson, requireString } from '../../../lib/responses';
import {
  clearedSessionCookieHeader,
  isKnownPersona,
  sessionCookieHeader,
} from '../../../lib/session';

export const dynamic = 'force-dynamic';

/** Switches the active demo persona. Only the fixed synthetic cast is accepted. */
export async function POST(request: Request): Promise<Response> {
  const body = await readJson(request);
  if (body === null) return badRequest();
  const userId = requireString(body, 'userId');
  if (userId === null || !isKnownPersona(userId)) return badRequest('unknown_persona');

  return json({ userId }, 200, { 'set-cookie': sessionCookieHeader(userId) });
}

export async function DELETE(): Promise<Response> {
  return json({ ended: true }, 200, { 'set-cookie': clearedSessionCookieHeader() });
}
