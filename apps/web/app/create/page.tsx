import Link from 'next/link';
import { redirect } from 'next/navigation';

import { currentUserId } from '../../lib/session';

export const dynamic = 'force-dynamic';

/**
 * Create — the central action of the canonical IA (canon 04 §1.1).
 *
 * Publishing is one tap away from anywhere. Until a richer composer sheet
 * exists (#37 keeps that boundary), this routes to the two real composers:
 * a Post shares what you do; a Signal is the structured ask/offer/join/event
 * that gives other people a legitimate reason to respond. Both still publish
 * through the same server policy as before — nothing here bypasses the
 * local-attachment or capability rules.
 */
export default async function CreatePage() {
  const viewerId = await currentUserId();
  if (viewerId === null) redirect('/welcome');

  return (
    <>
      <header className="pagehead">
        <h1>Create</h1>
        <p className="pagehead__sub">
          Share what you actually do — or ask for the thing that would get you doing more of it.
        </p>
      </header>

      <div className="stack">
        <Link className="card card--pad stack stack--tight" href="/publish">
          <h2>Post something</h2>
          <p className="muted">
            A morning, a workshop, a Tuesday session. Posts are how people discover what you do.
          </p>
        </Link>

        <Link className="card card--pad stack stack--tight" href="/signals/new">
          <h2>Ask, offer or host</h2>
          <p className="muted">
            A Signal is a reason to connect: ask for help, offer a skill, or open an activity
            others can join.
          </p>
        </Link>
      </div>
    </>
  );
}
