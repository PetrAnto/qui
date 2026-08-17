import type { GeoAttachmentKind, ReportReason, ReportTargetType } from '@indenoi/core';

/**
 * Wire vocabularies.
 *
 * These mirror unions that TypeScript erases at runtime, so the validators in
 * the route handlers have something to check against. Kept in one file so a new
 * member of a union cannot be accepted on one endpoint and rejected on another.
 */
export const ATTACHMENT_KINDS: readonly GeoAttachmentKind[] = [
  'exploring',
  'visitor',
  'recent_presence',
  'repeated_presence',
  'resident',
  'work_study',
  'second_home',
  'origin_family',
  'other',
];

/** Ties strong enough to be worth claiming during onboarding. */
export const ONBOARDING_KINDS: readonly GeoAttachmentKind[] = [
  'resident',
  'work_study',
  'second_home',
  'origin_family',
  'repeated_presence',
  'visitor',
  'exploring',
];

export const REPORT_REASONS: readonly ReportReason[] = [
  'harassment',
  'doxxing',
  'minor_safety',
  'sexual_content',
  'spam',
  'impersonation',
  'violence',
  'other',
];

export const REPORT_TARGETS: readonly ReportTargetType[] = ['post', 'signal', 'user', 'message'];

export const REPORT_REASON_LABELS: Readonly<Record<ReportReason, string>> = {
  harassment: 'Harassment or bullying',
  doxxing: 'Sharing private information',
  minor_safety: 'A young person is at risk',
  sexual_content: 'Sexual content',
  spam: 'Spam or a scam',
  impersonation: 'Pretending to be someone else',
  violence: 'Violence or a threat',
  other: 'Something else',
};
