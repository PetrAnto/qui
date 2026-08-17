import {
  LANDING_DISCLAIMER,
  LANDING_HERO_PHOTOS,
  requiredAttributions,
} from '../lib/landing-hero';

/**
 * Welcome hero.
 *
 * Separate assets, not a flattened collage: each photograph can be cropped,
 * replaced, or lazy-loaded on its own. Copy stays the product's own voice.
 * Faces never carry invented names, cities, or profile chrome.
 */
export function LandingHero() {
  const credits = requiredAttributions();

  return (
    <section className="landing" aria-labelledby="landing-title">
      <div className="landing__copy">
        <p className="landing__wordmark">QUI</p>
        <h1 id="landing-title">The people around you</h1>
        <p className="landing__lede">
          Not another global feed. A local-first way to see who is actually here — and turn some of
          that attention into real life.
        </p>
        <p className="landing__disclaimer">{LANDING_DISCLAIMER}</p>
      </div>

      <div className="landing__stage">
        {LANDING_HERO_PHOTOS.map((photo) => {
          const className = `landing__frame landing__frame--${photo.id}`;
          if (photo.decorative) {
            return (
              <div key={photo.id} className={className} aria-hidden="true">
                <img
                  src={photo.src}
                  alt=""
                  width={photo.width}
                  height={photo.height}
                  decoding="async"
                  loading="lazy"
                />
              </div>
            );
          }
          const eager = photo.role === 'dominant';
          return (
            <figure key={photo.id} className={className}>
              <img
                src={photo.src}
                alt={photo.alt}
                width={photo.width}
                height={photo.height}
                decoding="async"
                loading={eager ? 'eager' : 'lazy'}
                {...(eager ? { fetchPriority: 'high' as const } : {})}
                sizes={
                  photo.role === 'dominant'
                    ? '(max-width: 720px) 92vw, 28vw'
                    : '(max-width: 720px) 44vw, 16vw'
                }
              />
            </figure>
          );
        })}
      </div>

      <p className="landing__credits faint">
        Photography (editorial, not members):{' '}
        {credits.map((photo, index) => (
          <span key={photo.id}>
            {index > 0 ? '; ' : null}
            <a href={photo.sourcePage} rel="noreferrer">
              {photo.attribution}
            </a>
            {` (${photo.license})`}
          </span>
        ))}
        . Full provenance in the repository.
      </p>
    </section>
  );
}
