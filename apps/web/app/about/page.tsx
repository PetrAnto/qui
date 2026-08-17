import Link from 'next/link';

import { GEO_ATTRIBUTION } from '@indenoi/geo';

import { FEATURES } from '../../lib/features';

export const dynamic = 'force-dynamic';

/**
 * What is real and what is not.
 *
 * Anybody handed this build deserves to know exactly which parts are working
 * code and which parts are a synthetic stand-in, without reading the repository.
 */
export default function AboutPage() {
  return (
    <>
      <header className="pagehead">
        <h1>What is real here</h1>
        <p className="pagehead__sub">
          This is a working product over invented data, not a mock-up and not a live service.
        </p>
      </header>

      <section className="card card--pad stack stack--tight">
        <h2>Real</h2>
        <ul className="muted" style={{ margin: 0, paddingLeft: '1.1rem' }}>
          <li>Every rule. Age bands, blocking, host powers, who can publish where.</li>
          <li>The ranking, including the score breakdown under each card.</li>
          <li>The API, its refusals, and the reason it gives for each one.</li>
          <li>The cluster analytics, computed from the events the app records.</li>
        </ul>
      </section>

      <section className="card card--pad stack stack--tight">
        <h2>Not real</h2>
        <ul className="muted" style={{ margin: 0, paddingLeft: '1.1rem' }}>
          <li>
            Every person, post, signal, conversation and number. All fourteen accounts are invented
            and none corresponds to a living person.
          </li>
          <li>
            Product photographs. Inside the app there are none — each feed image is a gradient
            generated from a seed, and it says &ldquo;generated&rdquo; on every one of them.
          </li>
          <li>
            The welcome-hero photographs. Those are licensed editorial stills of real people doing
            real things. They are not accounts, not locals, and not endorsements. Provenance lives
            in the repository under docs/assets/.
          </li>
          <li>
            Sign-in. {FEATURES.productionAuth ? 'Enabled.' : 'Not implemented; you are handed a demo persona.'}
          </li>
          <li>
            Identity verification.{' '}
            {FEATURES.liveIdentityVerification
              ? 'Live provider enabled.'
              : 'No provider contract exists, so nothing here claims a real check.'}
          </li>
          <li>
            Persistence.{' '}
            {FEATURES.persistentDatabase
              ? 'Backed by D1.'
              : 'State lives in this process and is lost when it restarts.'}
          </li>
        </ul>
      </section>

      <section className="card card--pad stack stack--tight">
        <h2>What it will never do</h2>
        <ul className="muted" style={{ margin: 0, paddingLeft: '1.1rem' }}>
          <li>Ask for your location. There is no coordinate attached to a person anywhere.</li>
          <li>Let a stranger message you out of nowhere. Contact starts from something you posted.</li>
          <li>Give you a trust score. Evidence is separate facts, never a ladder.</li>
          <li>Carry a romantic surface. That is not deferred; it is out of scope.</li>
        </ul>
      </section>

      <p className="faint">{GEO_ATTRIBUTION}</p>

      <Link className="btn btn--block" href="/">
        Back to Discover
      </Link>
    </>
  );
}
