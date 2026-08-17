import Link from 'next/link';
import { redirect } from 'next/navigation';

import { listThreadsFor } from '@indenoi/core';

import { Avatar } from '../../components/Avatar';
import { SIGNAL_LABELS, relativeTime } from '../../lib/format';
import { currentUserId } from '../../lib/session';
import { ports } from '../../lib/store';

export const dynamic = 'force-dynamic';

/**
 * Threads.
 *
 * Every conversation here started because somebody answered a signal and the
 * person who put it up said yes. There is no compose button on this screen and
 * there is no API behind one: a thread is a consequence, never an origin
 * (INV-DM-1).
 */
export default async function ThreadsPage() {
  const viewerId = await currentUserId();
  if (viewerId === null) redirect('/welcome');

  const store = ports();
  const threads = await listThreadsFor(store, viewerId);
  const now = store.now();

  return (
    <>
      <header className="pagehead">
        <h1>Threads</h1>
        <p className="pagehead__sub">
          Only from signals you answered, or that somebody answered of yours. Nobody can start one
          out of nowhere — not even us.
        </p>
      </header>

      {threads === null || threads.length === 0 ? (
        <p className="empty">
          Nothing yet. Answer an Ask or an Offer and, if they say yes, it lands here.
        </p>
      ) : (
        <div className="stack">
          {threads.map((thread) => (
            <Link key={thread.id} className="card card--pad stack stack--tight" href={`/threads/${thread.id}`}>
              <div className="row">
                {thread.counterpart === null ? null : (
                  <Avatar
                    media={thread.counterpart.avatar}
                    displayName={thread.counterpart.displayName}
                  />
                )}
                <div>
                  <div style={{ fontWeight: 650 }}>
                    {thread.counterpart?.displayName ?? 'Unavailable'}
                  </div>
                  <div className="faint">
                    {SIGNAL_LABELS[thread.signalType]} · {thread.signalTitle}
                  </div>
                </div>
                <span className="faint spacer">{relativeTime(thread.lastAt, now)}</span>
              </div>
              <p className="muted">{thread.lastMessage}</p>
              {thread.state === 'closed' ? <span className="chip">closed</span> : null}
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
