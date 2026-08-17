import { cookies } from 'next/headers';

import { DEMO_USERS } from '@indenoi/db/demo';

import { clearCookie, readCookie, serializeCookie } from './cookies';

/**
 * Demo session handling.
 *
 * This build has no authentication: it ships a persona switcher over a fixed
 * synthetic cast, which is enough to exercise every product and safety rule and
 * is honest about being a demo. The real decision — passkeys first, OIDC
 * second, email fallback — is recorded in ADR-0005, is behind the
 * `productionAuth` capability flag, and is deliberately not half-implemented
 * here.
 *
 * The cookie is still hardened (HttpOnly, SameSite=Lax, Path=/) because the
 * shape of the session boundary is what the rest of the code is written
 * against.
 */
export const SESSION_COOKIE = 'indenoi_demo_session';

const KNOWN_IDS: ReadonlySet<string> = new Set(Object.values(DEMO_USERS));

export function isKnownPersona(userId: string): boolean {
  return KNOWN_IDS.has(userId);
}

/** Reads the session from a raw request; used by route handlers and tests. */
export function sessionFromRequest(request: Request): string | null {
  const value = readCookie(request, SESSION_COOKIE);
  return value !== null && isKnownPersona(value) ? value : null;
}

/** Reads the session inside a server component. */
export async function currentUserId(): Promise<string | null> {
  const store = await cookies();
  const value = store.get(SESSION_COOKIE)?.value;
  return value !== undefined && isKnownPersona(value) ? value : null;
}

export function sessionCookieHeader(userId: string, maxAgeSeconds = 60 * 60 * 24 * 7): string {
  return serializeCookie(SESSION_COOKIE, userId, { maxAgeSeconds });
}

export function clearedSessionCookieHeader(): string {
  return clearCookie(SESSION_COOKIE);
}
