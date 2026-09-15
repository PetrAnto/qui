import { artworkFor } from '../../lib/art';

/**
 * The light product-proof narrative (canon 03 §5–§14).
 *
 * Everything below the hero runs in the light product system. The product
 * preview is built from the same card/chip/button classes the application
 * uses — a screen, not a flattened illustration — and it is captioned as what
 * it is: the synthetic demo, in which every person is invented. Nothing here
 * claims members, traction, testimonials or live verification.
 */
export function LandingSections() {
  const previewAvatar = artworkFor('welcome-preview-lea', 'sea');

  return (
    <>
      {/* ------------------------------------------------ four pillars */}
      <section className="section" id="principles" aria-label="Real, equal, active, local">
        <div className="pillars">
          <article className="card card--pad pillar">
            <h3>Real humans</h3>
            <p className="muted">
              Identity or trusted verification paths designed to keep fake accounts out while
              storing as little sensitive data as possible.
            </p>
          </article>
          <article className="card card--pad pillar">
            <h3>Equal standing</h3>
            <p className="muted">
              No KOL boost. No purchased organic reach. No inherited privilege from follower counts
              elsewhere.
            </p>
          </article>
          <article className="card card--pad pillar">
            <h3>Built for doing</h3>
            <p className="muted">
              Share what you practice, teach, build or want to join — not only what you consume.
            </p>
          </article>
          <article className="card card--pad pillar">
            <h3>People around you</h3>
            <p className="muted">
              Discover people, projects, skills and activities through real geographic context,
              without exposing live people coordinates.
            </p>
          </article>
        </div>
      </section>

      {/* ------------------------------------------------ product loop */}
      <section className="section" id="how-it-works" aria-labelledby="loop-title">
        <header className="section__head">
          <h2 id="loop-title">From discovery to doing.</h2>
        </header>
        <ol className="loop">
          <li className="card card--pad">
            <span className="loop__step">1</span>
            <p>Discover someone or something interesting around you</p>
          </li>
          <li className="card card--pad">
            <span className="loop__step">2</span>
            <p>See what they do, know or are building</p>
          </li>
          <li className="card card--pad">
            <span className="loop__step">3</span>
            <p>Send or answer a Signal — the legitimate reason to talk</p>
          </li>
          <li className="card card--pad">
            <span className="loop__step">4</span>
            <p>Join, learn, teach, build, help or meet</p>
          </li>
        </ol>
        <p className="section__note">
          QUI is designed so closing the app can be a successful outcome.
        </p>
      </section>

      {/* ------------------------------------------------ discover preview */}
      <section className="section" aria-labelledby="discover-title">
        <div className="preview">
          <div className="stack stack--tight">
            <h2 id="discover-title">Discover people worth knowing because of what they do.</h2>
            <p className="muted">
              The feed can be entertaining, but you always know who made something, where it
              belongs, what that person does — and what you can do next. Follower counts are not
              the point; a way in is.
            </p>
            <p className="muted">
              Every card carries its own explanation: <em>Why am I seeing this?</em> is a question
              the product answers, not a setting you hunt for.
            </p>
          </div>
          <div>
            <article className="card" aria-label="Example Discover card from the demo">
              <div className="postcard__body">
                <div className="row">
                  <span
                    className="avatar"
                    style={{ background: previewAvatar.background }}
                    aria-hidden="true"
                  >
                    L
                  </span>
                  <div>
                    <span style={{ fontWeight: 650 }}>Léa</span>
                    <div className="faint">Ajaccio · 2 h ago</div>
                  </div>
                </div>
                <p>
                  Flat water at dawn. Took the film camera out before the wind picked up — two rolls
                  of nothing but light.
                </p>
                <div className="row row--wrap">
                  <span className="chip">freediving</span>
                  <span className="chip">film photography</span>
                </div>
                <div className="actions">
                  <span className="btn btn--small btn--primary">Ask about this</span>
                  <span className="btn btn--small">I want to learn</span>
                  <span className="btn btn--small">See practice</span>
                </div>
              </div>
            </article>

            <p className="preview__caption faint">
              A screen from the demo build. Léa is invented — every account and post in this demo
              is.
            </p>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------ profiles */}
      <section className="section" aria-labelledby="profiles-title">
        <header className="section__head">
          <h2 id="profiles-title">A profile about what you do — not your follower résumé.</h2>
          <p className="muted">
            Practices, what you can teach, what you can help with, what you want to learn, your
            current project, your city ties. Factual activity, never a universal reputation score.
          </p>
        </header>
      </section>

      {/* ------------------------------------------------ signals */}
      <section className="section" aria-labelledby="signals-title">
        <header className="section__head">
          <h2 id="signals-title">Give people a reason to connect.</h2>
          <p className="muted">
            A Signal is structured intent, not a post with a label. Answering one is the only way a
            conversation opens — there are no cold messages here.
          </p>
        </header>
        <div className="row row--wrap">
          <span className="chip chip--accent">Ask</span>
          <span className="chip chip--accent">Offer</span>
          <span className="chip chip--accent">Join</span>
          <span className="chip chip--accent">Event</span>
          <span className="faint">The four intents in this build; the family is designed to grow.</span>
        </div>
      </section>

      {/* ------------------------------------------------ equal standing */}
      <section className="section" aria-labelledby="equal-title">
        <header className="section__head">
          <h2 id="equal-title">Same starting line.</h2>
          <p className="muted">
            Reach on QUI is earned, not bought or inherited. Being famous elsewhere buys you nothing
            here; the ranking that orders your feed is deterministic and shows its working on every
            card.
          </p>
        </header>
      </section>

      {/* ------------------------------------------------ trust */}
      <section className="section" aria-labelledby="trust-title">
        <header className="section__head">
          <h2 id="trust-title">Real humans. Minimal data.</h2>
          <p className="muted">
            Eligibility as a real person comes from an approved identity check or a trusted
            invitation — and what QUI stores is the attestation, not your documents, not your exact
            coordinates, not your date of birth.
          </p>
          <p className="faint">
            Honest status: this public demo does not run a live verification provider. The switch is
            a capability flag that is off by default, not a half-built feature.
          </p>
        </header>
      </section>

      {/* ------------------------------------------------ cities */}
      <section className="section" aria-labelledby="cities-title">
        <header className="section__head">
          <h2 id="cities-title">Local-first, worldwide.</h2>
          <p className="muted">
            QUI works in any city you can name — you can explore all of them from day one.
            Publishing somewhere as a local asks for a legitimate tie to that place, and QUI never
            needs or exposes a trail of where people physically are.
          </p>
        </header>
      </section>

      {/* ------------------------------------------------ open source */}
      <section className="section" aria-labelledby="oss-title">
        <header className="section__head">
          <h2 id="oss-title">Open source. Built in public.</h2>
          <p className="muted">
            QUI asks you to trust important rules about identity, reach, privacy and local
            discovery — so the code and the non-sensitive product decisions are inspectable on
            GitHub. Security secrets, private user data and active vulnerability details stay
            private by design.
          </p>
        </header>
        <div className="row row--wrap">
          <a className="btn" href="https://github.com/PetrAnto/qui" rel="noreferrer">
            View on GitHub
          </a>
          <a className="btn btn--ghost" href="https://github.com/PetrAnto/qui/commits" rel="noreferrer">
            Follow the build
          </a>
        </div>
      </section>

      {/* ------------------------------------------------ final CTA */}
      <section className="section section--final" aria-labelledby="final-title">
        <h2 id="final-title">Find out who&apos;s around — and what you could do together.</h2>
        <div className="row row--wrap">
          <a className="btn btn--primary" href="#get-access">
            Get early access
          </a>
          <a className="btn" href="https://github.com/PetrAnto/qui" rel="noreferrer">
            Follow the build
          </a>
        </div>
        <p className="faint">Free for ordinary users.</p>
      </section>
    </>
  );
}