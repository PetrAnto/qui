/**
 * Cookie plumbing, in one place.
 *
 * Two cookies exist in this build (the demo session and the active city) and
 * both are written with the same hardening. Having one writer means a future
 * third cookie cannot quietly ship without `HttpOnly` because somebody copied
 * the wrong line.
 */
export interface CookieOptions {
  readonly maxAgeSeconds?: number;
  readonly httpOnly?: boolean;
}

export function serializeCookie(name: string, value: string, options: CookieOptions = {}): string {
  return [
    `${name}=${encodeURIComponent(value)}`,
    'Path=/',
    ...(options.httpOnly === false ? [] : ['HttpOnly']),
    'SameSite=Lax',
    `Max-Age=${options.maxAgeSeconds ?? 60 * 60 * 24 * 7}`,
  ].join('; ');
}

export function clearCookie(name: string): string {
  return `${name}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}

export function readCookie(request: Request, name: string): string | null {
  const header = request.headers.get('cookie');
  if (header === null) return null;
  for (const part of header.split(';')) {
    const [key, ...rest] = part.trim().split('=');
    if (key === name) return decodeURIComponent(rest.join('='));
  }
  return null;
}
