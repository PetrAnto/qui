import type { TrustSignals } from '@indenoi/core';

/**
 * Trust, shown as separate facts rather than a score.
 *
 * There is no level, no percentage and no badge that ranks one person above
 * another. Each of these is an independent piece of evidence, and somebody can
 * be strong in one and absent in another without that meaning anything about
 * their worth (ADR-0003). A single number invites "level 3 users can do X",
 * which is the social-credit shape this product refuses.
 */
const LABELS: Readonly<Record<keyof TrustSignals, string>> = {
  emailVerified: 'email confirmed',
  identityVerified: 'identity checked',
  localPresence: 'tie to this place',
  communityVouched: 'vouched for locally',
  organizationRole: 'role in an organisation',
};

export function TrustBadges({ trust }: { trust: TrustSignals }) {
  const held = (Object.keys(LABELS) as (keyof TrustSignals)[]).filter((key) => trust[key]);
  if (held.length === 0) return <p className="faint">No evidence recorded yet.</p>;
  return (
    <div className="row row--wrap">
      {held.map((key) => (
        <span key={key} className="chip">
          ✓ {LABELS[key]}
        </span>
      ))}
    </div>
  );
}
