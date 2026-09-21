import {
  LANDING_DISCLAIMER,
  LANDING_HERO_PHOTOS,
  requiredAttributions,
} from '../../lib/landing-hero';

/**
 * Landing hero — the dark cinematic marketing mode (canon 03 §4).
 *
 * The dark surface is scoped to `.marketing` and never leaks into the app
 * chrome (canon 01 §8.3/§0). The photography stays editorial: separate
 * attributed assets, never wired to a persona, a city or an endorsement.
 * The concept labels are the restrained subset canon 03 §4.5 asks for.
 */
const HERO_LABELS = ['Verified human', 'Equal standing', 'Share skills', 'Local-first'] as const;

export function LandingHero() {
  const credits = requiredAttributions();

  return (
    <section className="marketing hero" aria-labelledby="landing-title">
      <div className="hero__copy">
        <h1 id="landing-title">
          Social network for <em>everyone</em>.
        </h1>
        <p className="hero__sub">
          Verified real people. Equal standing. Share what you do, your skills and your projects.
          Find people around you and build things together — online and offline.
        </p>
        <p className="hero__trust">Built for people, not bots, fake accounts or troll farms.</p>
        <div className="hero__cta">
          <a className="btn btn--primary" href="#get-access">
            Get early access
          </a>
          <a className="btn btn--on-dark" href="#how-it-works">
            See how it works
          </a>
        </div>
        <ul className="hero__labels" aria-label="What QUI stands for">
          {HERO_LABELS.map((label) => (
            <li key={label}>{label}</li>
          ))}
        </ul>
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

      <p className="landing__credits">
        Photography by{' '}
        {credits.map((photo, index) => (
          <span key={photo.id}>
            {index > 0 ? ', ' : null}
            <a href={photo.sourcePage} rel="noreferrer">
              {photo.attribution}
            </a>
          </span>
        ))}
        . Editorial only — not members.
      </p>
    </section>
  );
}
