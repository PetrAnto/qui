import Link from 'next/link';

import type { DiscoverCard, PublicProfile } from '@indenoi/core';

import type { CityAccess } from '../lib/city';
import { Avatar } from './Avatar';
import { CityBar } from './CityBar';
import { LogoSymbol } from './Logo';
import { PostCard } from './PostCard';

/**
 * Dark Discover — a reviewable visual variant, reached only at `/?theme=dark`.
 *
 * Owner-approved experiment (docs/design/DISCOVER_DARK_PREVIEW.md), status
 * HYPOTHESIS: it restyles this one screen and its navigation shell and
 * nothing else. The `.discover-dark` marker scopes every dark token in
 * globals.css, so no other screen changes and the light Discover is untouched.
 *
 * Same data, same order, same actions as the light Discover: the feed is the
 * policy-checked `getDiscoverFeed` result. The people strip is a preview of the
 * existing People mode — `getPeopleInCity`, so the same discovery rules apply
 * (`canDiscoverUser`: blocks, restricted accounts, and minors never surfaced
 * to adults, INV-AGE-3). Nothing here is a new claim about anyone.
 */
export function DiscoverDarkPreview({
  city,
  access,
  cards,
  people,
  now,
}: {
  city: { readonly id: string; readonly name: string };
  access: CityAccess;
  cards: readonly DiscoverCard[] | null;
  people: readonly PublicProfile[] | null;
  now: string;
}) {
  return (
    <div className="discover-dark">
      <div className="dd-top">
        <LogoSymbol size={34} surface="dark" title="QUI" />
        <p className="dd-preview">
          <span>Dark preview</span>
          <Link href="/">Switch to light</Link>
        </p>
      </div>

      <CityBar cityName={city.name} cityId={city.id} access={access} />

      <nav className="segmented" aria-label="Discover modes">
        <Link className="btn btn--small btn--primary" href="/?theme=dark" aria-current="page">
          For you
        </Link>
        <Link className="btn btn--small" href="/people">
          People
        </Link>
      </nav>

      <header className="pagehead dd-hero">
        <h1>
          What people here <em>actually do</em>
        </h1>
        <p className="pagehead__sub">
          Not opinions about the news. Somebody&apos;s morning, their workshop, their Tuesday
          session — and a way to be part of it.
        </p>
      </header>

      {people !== null && people.length > 0 ? (
        <section className="dd-people" aria-labelledby="dd-people-title">
          <div className="dd-people__head">
            <h2 id="dd-people-title">People in {city.name}</h2>
            <Link href="/people">See everyone</Link>
          </div>
          <ul className="dd-people__list">
            {people.map((person) => (
              <li key={person.id}>
                <Link className="dd-person" href={`/p/${person.handle}`}>
                  <Avatar media={person.avatar} displayName={person.displayName} large />
                  <span className="dd-person__name">{person.displayName}</span>
                  {person.practices[0] !== undefined ? (
                    <span className="dd-person__practice">{person.practices[0]}</span>
                  ) : null}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <div className="row row--wrap dd-create">
        <Link className="btn btn--small btn--primary" href="/publish">
          Post something
        </Link>
        <Link className="btn btn--small" href="/signals/new">
          Ask, offer or host
        </Link>
      </div>

      {cards === null || cards.length === 0 ? (
        <p className="empty">
          Nothing in {city.name} yet. Post the first thing, or switch to a city where something is
          already happening.
        </p>
      ) : (
        <div className="dd-feed">
          {cards.map((card) => (
            <PostCard
              key={card.post.id}
              post={card.post}
              actions={card.actions}
              breakdown={card.breakdown}
              now={now}
              layout="person-first"
            />
          ))}
        </div>
      )}
    </div>
  );
}
