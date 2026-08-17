import type { GeoAttachmentKind, PolicyReason, SignalType } from '@indenoi/core';

export function relativeTime(instant: string, now: string): string {
  const minutes = Math.round((Date.parse(now) - Date.parse(instant)) / 60_000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days} d ago`;
  return `${Math.round(days / 7)} w ago`;
}

export function untilTime(instant: string, now: string): string {
  const hours = Math.round((Date.parse(instant) - Date.parse(now)) / 3_600_000);
  if (hours < 1) return 'starting now';
  if (hours < 24) return `in ${hours} h`;
  return `in ${Math.round(hours / 24)} d`;
}

export const SIGNAL_LABELS: Readonly<Record<SignalType, string>> = {
  ask: 'Ask',
  offer: 'Offer',
  join: 'Join',
  event: 'Event',
};

export const SIGNAL_VERBS: Readonly<Record<SignalType, string>> = {
  ask: 'Answer this',
  offer: 'Take them up on it',
  join: 'Ask to join',
  event: 'Join the event',
};

export const ATTACHMENT_LABELS: Readonly<Record<GeoAttachmentKind, string>> = {
  exploring: 'Exploring',
  visitor: 'Visiting',
  recent_presence: 'Recently here',
  repeated_presence: 'Here often',
  resident: 'I live here',
  work_study: 'I work or study here',
  second_home: 'Second home',
  origin_family: 'Family roots',
  other: 'Other tie',
};

/**
 * Denials are explained rather than hidden. A person who understands why a
 * control is unavailable is far less likely to look for a way around it.
 */
export const REASON_LABELS: Readonly<Record<PolicyReason, string>> = {
  self: 'This is your own post.',
  blocked: 'Unavailable.',
  account_suspended: 'Your account is suspended.',
  author_suspended: 'This account is unavailable.',
  distribution_restricted: 'This content is not being distributed.',
  missing_capability: 'You need to confirm your email or your tie to this place first.',
  age_below_minimum: 'You are below the minimum age for this product.',
  age_band_mismatch: 'Private conversations are only between people of the same age group.',
  adults_only_content: 'This content is for adults only.',
  minor_not_discoverable: 'Unavailable.',
  no_signal_context: 'You can reply to what someone posts — there are no cold messages here.',
  signal_not_open: 'This signal is closed.',
  signal_full: 'This one is full.',
  wrong_signal_type: 'That action does not apply here.',
  host_excluded: 'The host has removed you from this one.',
  not_host: 'Only the host can do that.',
  not_participant: 'You are not part of this conversation.',
  thread_closed: 'This conversation is closed.',
  content_removed: 'This content has been removed.',
  no_local_attachment: 'Add a real tie to this place before publishing here.',
  moderation_private: 'Moderation records are private.',
};

export function explain(reason: PolicyReason): string {
  return REASON_LABELS[reason];
}
