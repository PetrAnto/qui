import Link from 'next/link';
import { redirect } from 'next/navigation';

import { SIGNAL_TYPES, listSignals, type SignalType } from '@indenoi/core';

import { CityBar } from '../../components/CityBar';
import { SignalRow } from '../../components/SignalRow';
import { resolveActiveCity } from '../../lib/city';
import { SIGNAL_LABELS } from '../../lib/format';
import { currentUserId } from '../../lib/session';
import { ports } from '../../lib/store';

export const dynamic = 'force-dynamic';

function parseType(value: string | undefined): SignalType | null {
  return (SIGNAL_TYPES as readonly string[]).includes(value ?? '') ? (value as SignalType) : null;
}

/**
 * Signals: the four things a person can say out loud in a place.
 *
 * Ask, Offer, Join, Event. There is no fifth intent and in particular no
 * romantic one — that is not deferred, it is out of this product surface
 * entirely (ADR-0009).
 */
export default async function SignalsPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  const viewerId = await currentUserId();
  if (viewerId === null) redirect('/welcome');

  const { type } = await searchParams;
  const active = parseType(type);
  const store = ports();
  const city = await resolveActiveCity(store, viewerId);
  const cards = await listSignals(store, { viewerId, geoScopeId: city.id, type: active });
  const now = store.now();

  return (
    <>
      <CityBar cityName={city.name} cityId={city.id} />

      <header className="pagehead">
        <h1>Signals in {city.name}</h1>
        <p className="pagehead__sub">
          Somebody needs a hand, is offering one, has a spare place, or is running something. Answer
          one and a conversation opens — never before.
        </p>
      </header>

      <div className="segmented">
        <Link className={active === null ? 'btn btn--small btn--primary' : 'btn btn--small'} href="/signals">
          All
        </Link>
        {SIGNAL_TYPES.map((value) => (
          <Link
            key={value}
            className={active === value ? 'btn btn--small btn--primary' : 'btn btn--small'}
            href={`/signals?type=${value}`}
          >
            {SIGNAL_LABELS[value]}
          </Link>
        ))}
      </div>

      <Link className="btn btn--primary btn--block" href="/signals/new">
        Put one up
      </Link>

      {cards === null || cards.length === 0 ? (
        <p className="empty">Nothing open in {city.name} right now. Yours would be the first.</p>
      ) : (
        <div className="stack">
          {cards.map((card) => (
            <SignalRow
              key={card.signal.id}
              signal={card.signal}
              eligibility={card.eligibility}
              isHost={card.isHost}
              now={now}
            />
          ))}
        </div>
      )}
    </>
  );
}
