import type { MediaAsset } from '@indenoi/core';

import { artworkForMedia } from '../lib/art';

/**
 * Generated artwork stands in for a photograph.
 *
 * There is no upload path in this build (ADR-0007), and a grid of grey boxes
 * would misrepresent what the product is meant to feel like. Each asset renders
 * as layered gradients derived from its seed: stable, offline, and obviously
 * not a photograph. The alt text is the caption the author wrote, and the
 * "generated" chip is on every one of them.
 */
export function Art({ media, className }: { media: MediaAsset; className?: string }) {
  const artwork = artworkForMedia(media);
  return (
    <div
      className={className ?? 'art'}
      role="img"
      aria-label={`${media.alt} — generated artwork, not a photograph`}
      style={{ background: artwork.background }}
    >
      <span className="chip chip--demo art__label">generated</span>
    </div>
  );
}
