import type { PolicyReason } from '@indenoi/core';

import { REASON_LABELS } from './format';

/**
 * The browser half of the API contract.
 *
 * A refusal comes back as a policy reason, and the interface turns it into a
 * sentence rather than hiding the control or showing "something went wrong".
 * Somebody who understands why an action is unavailable is far less likely to
 * go looking for a way around it.
 */
export interface ApiFailure {
  readonly ok: false;
  readonly status: number;
  readonly reason: string;
  readonly message: string;
}

export type ApiResult<T> = { readonly ok: true; readonly value: T } | ApiFailure;

/** Transport-level reasons. Policy reasons already have sentences in format.ts. */
const TRANSPORT_LABELS: Readonly<Record<string, string>> = {
  unauthenticated: 'Your session ended. Start again from the top.',
  not_found: 'That is not available.',
  unknown_city: 'That place was not recognised.',
  unknown_persona: 'That account was not recognised.',
  unsupported_event: 'This app does not record that.',
  invalid_input: 'Something in that form was not accepted.',
  conflict: 'You have already done that.',
  internal_error: 'Something broke on our side. Nothing was changed.',
};

function messageFor(reason: string): string {
  return (
    REASON_LABELS[reason as PolicyReason] ??
    TRANSPORT_LABELS[reason] ??
    'That did not work. Nothing was changed.'
  );
}

async function send<T>(url: string, method: string, body?: unknown): Promise<ApiResult<T>> {
  const response = await fetch(url, {
    method,
    headers: { 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const payload: unknown = await response.json().catch(() => ({}));
  if (response.ok) return { ok: true, value: payload as T };

  const reason =
    typeof payload === 'object' && payload !== null && 'reason' in payload
      ? String((payload as { reason: unknown }).reason)
      : 'invalid_input';
  return { ok: false, status: response.status, reason, message: messageFor(reason) };
}

export const api = {
  get: <T>(url: string): Promise<ApiResult<T>> => send<T>(url, 'GET'),
  post: <T>(url: string, body?: unknown): Promise<ApiResult<T>> => send<T>(url, 'POST', body),
  put: <T>(url: string, body?: unknown): Promise<ApiResult<T>> => send<T>(url, 'PUT', body),
  del: <T>(url: string, body?: unknown): Promise<ApiResult<T>> => send<T>(url, 'DELETE', body),
};
