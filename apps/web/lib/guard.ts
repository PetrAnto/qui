import type { ServiceResult } from '@indenoi/core';

import { fromFailure, json, unauthorized } from './responses';
import { sessionFromRequest } from './session';

/**
 * The one door into every route handler.
 *
 * Three things must be true of every API response in this app, and none of them
 * are worth remembering forty times:
 *
 *  - an anonymous caller gets 401 and nothing else (no probing for existence);
 *  - the response is private and uncacheable (INV-CACHE-1, in `responses.ts`);
 *  - an unexpected throw becomes an opaque 500 rather than a stack trace.
 *
 * Authorisation itself is *not* here. It lives in `@indenoi/core/policy`, is
 * enforced by the service the handler calls, and comes back as a typed reason.
 * This wrapper only guarantees that a handler cannot forget to ask.
 */
export type GuardedHandler<C> = (
  actorId: string,
  request: Request,
  context: C,
) => Promise<Response>;

/**
 * `context` is optional so a handler with no dynamic segment can be called with
 * a request alone — by a test, or by anything else that is not the router.
 * Next always supplies it for the routes that declare one.
 */
export function guarded<C = undefined>(
  handler: GuardedHandler<C>,
): (request: Request, context?: C) => Promise<Response> {
  return async (request: Request, context?: C): Promise<Response> => {
    const actorId = sessionFromRequest(request);
    if (actorId === null) return unauthorized();
    try {
      return await handler(actorId, request, context as C);
    } catch (error) {
      console.error('route_failed', error instanceof Error ? error.message : 'unknown');
      return json({ reason: 'internal_error' }, 500);
    }
  };
}

/** Turns a domain result into a response without re-deriving the mapping. */
export function settle<T>(result: ServiceResult<T>, status = 200): Response {
  return result.ok ? json(result.value, status) : fromFailure(result.reason);
}
