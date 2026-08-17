import type { Failure } from '@indenoi/core';

/**
 * INV-CACHE-1. Every API response here is personalised: it is projected through
 * the viewer's blocks, age band and capabilities. None of it may ever be stored
 * in a shared cache, so the headers are set in one helper rather than
 * remembered at forty call sites.
 */
const PRIVATE_HEADERS: Readonly<Record<string, string>> = {
  'content-type': 'application/json; charset=utf-8',
  'cache-control': 'private, no-store',
  vary: 'Cookie',
  'x-content-type-options': 'nosniff',
};

export function json(body: unknown, status = 200, extraHeaders: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...PRIVATE_HEADERS, ...extraHeaders },
  });
}

export function unauthorized(): Response {
  return json({ reason: 'unauthenticated' }, 401);
}

export function badRequest(reason = 'invalid_input'): Response {
  return json({ reason }, 400);
}

/**
 * Used for "you may not see this" as well as "this does not exist". A viewer
 * who is blocked must not be able to tell the two apart (INV-BLOCK-1).
 */
export function notFound(): Response {
  return json({ reason: 'not_found' }, 404);
}

/**
 * Maps a domain failure onto a status code. The policy reason is returned as-is
 * so the interface can explain *why* an action is unavailable instead of
 * showing a dead button — a denial the person understands is worth more than a
 * generic error.
 */
export function fromFailure(reason: Failure): Response {
  if (reason === 'not_found') return json({ reason }, 404);
  if (reason === 'invalid_input') return json({ reason }, 400);
  if (reason === 'conflict') return json({ reason }, 409);
  return json({ reason }, 403);
}

export async function readJson(request: Request): Promise<Record<string, unknown> | null> {
  try {
    const body: unknown = await request.json();
    if (typeof body !== 'object' || body === null || Array.isArray(body)) return null;
    return body as Record<string, unknown>;
  } catch {
    return null;
  }
}

export function requireString(body: Record<string, unknown>, key: string): string | null {
  const value = body[key];
  return typeof value === 'string' && value.trim().length > 0 ? value : null;
}

export function optionalString(body: Record<string, unknown>, key: string): string | null {
  const value = body[key];
  return typeof value === 'string' && value.trim().length > 0 ? value : null;
}

export function oneOf<T extends string>(
  body: Record<string, unknown>,
  key: string,
  allowed: readonly T[],
): T | null {
  const value = body[key];
  return typeof value === 'string' && (allowed as readonly string[]).includes(value) ? (value as T) : null;
}
