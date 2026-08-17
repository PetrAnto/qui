import type { MediaAsset } from '@indenoi/core';

import { artworkForMedia, initials } from '../lib/art';

export function Avatar({
  media,
  displayName,
  large = false,
}: {
  media: MediaAsset;
  displayName: string;
  large?: boolean;
}) {
  const artwork = artworkForMedia(media);
  return (
    <span
      className={large ? 'avatar avatar--lg' : 'avatar'}
      aria-hidden="true"
      style={{ background: artwork.background }}
    >
      {initials(displayName)}
    </span>
  );
}
