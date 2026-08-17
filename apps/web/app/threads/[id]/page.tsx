import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';

import { getThreadView } from '@indenoi/core';

import { MessageComposer } from '../../../components/MessageComposer';
import { SafetyMenu } from '../../../components/SafetyMenu';
import { explain, relativeTime } from '../../../lib/format';
import { currentUserId } from '../../../lib/session';
import { ports } from '../../../lib/store';

export const dynamic = 'force-dynamic';

export default async function ThreadPage({ params }: { params: Promise<{ id: string }> }) {
  const viewerId = await currentUserId();
  if (viewerId === null) redirect('/welcome');

  const { id } = await params;
  const store = ports();
  const view = await getThreadView(store, { viewerId, threadId: id });
  if (view === null) notFound();

  const now = store.now();

  return (
    <>
      <header className="pagehead">
        <h1>{view.counterpart?.displayName ?? 'Unavailable'}</h1>
        <p className="pagehead__sub">
          From{' '}
          <Link href={`/signals/${view.signalId}`} style={{ textDecoration: 'underline' }}>
            {view.signalTitle}
          </Link>{' '}
          · {view.cityName}
        </p>
      </header>

      <div className="messages">
        {view.messages.map((message) => (
          <div
            key={message.id}
            className={message.authorId === viewerId ? 'bubble bubble--mine' : 'bubble'}
          >
            <p>{message.body}</p>
            <span className="faint">{relativeTime(message.createdAt, now)}</span>
          </div>
        ))}
      </div>

      {view.canSend.allowed ? (
        <MessageComposer threadId={view.id} />
      ) : (
        <p className="notice notice--warn">{explain(view.canSend.reason)}</p>
      )}

      {view.counterpart === null ? null : (
        <SafetyMenu
          targetType="message"
          targetId={view.id}
          personId={view.counterpart.id}
          personName={view.counterpart.displayName}
        />
      )}
    </>
  );
}
