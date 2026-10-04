'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import type { ContextualAction, PublicPost } from '@indenoi/core';

import { api } from '../lib/client';
import { relativeTime, whyLabel } from '../lib/format';
import { Art } from './Art';
import { Avatar } from './Avatar';
import { SafetyMenu } from './SafetyMenu';

/**
 * A Discover card.
 *
 * The card is not the point — the row of actions under it is. Every one of them
 * has already been checked against policy on the server, so what is offered
 * here is exactly what this viewer is allowed to do, and each one turns looking
 * at something into a reason to talk to the person who made it.
 *
 * The score breakdown is deliberately visible. A feed that cannot explain
 * itself is a feed nobody can argue with (ADR-0008).
 */
export function PostCard({
  post,
  actions,
  breakdown,
  now,
  layout = 'default',
}: {
  post: PublicPost;
  actions: readonly ContextualAction[];
  breakdown?: Readonly<Record<string, number>>;
  now: string;
  /**
   * `person-first` leads with who made it and gives the first available action
   * the primary style. Used only by the dark Discover preview; the default
   * card is unchanged.
   */
  layout?: 'default' | 'person-first';
}) {
  const router = useRouter();
  const [appreciated, setAppreciated] = useState(post.viewerAppreciated);
  const [count, setCount] = useState(post.appreciations);
  const [error, setError] = useState<string | null>(null);

  async function appreciate(): Promise<void> {
    const result = await api.post<{ appreciated: boolean; count: number }>('/api/appreciations', {
      postId: post.id,
    });
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setAppreciated(result.value.appreciated);
    setCount(result.value.count);
    router.refresh();
  }

  const compose = (type: string): string =>
    `/signals/new?type=${type}&city=${encodeURIComponent(post.geoScopeId)}&post=${encodeURIComponent(
      post.id,
    )}${post.practice === null ? '' : `&practice=${encodeURIComponent(post.practice)}`}`;

  const personFirst = layout === 'person-first';
  const leadAction = personFirst ? actions.find((action) => action.enabled)?.kind : undefined;
  const author = (
    <div className={personFirst ? 'row postcard__person' : 'row'}>
      <Avatar media={post.author.avatar} displayName={post.author.displayName} />
      <div>
        <Link href={`/p/${post.author.handle}`} className="postcard__name">
          {post.author.displayName}
        </Link>
        <div className="faint">
          {post.cityName} · {relativeTime(post.createdAt, now)}
        </div>
      </div>
    </div>
  );

  return (
    <article className={personFirst ? 'card postcard--person' : 'card'}>
      {personFirst ? author : null}
      {personFirst ? null : <Art media={post.media} />}
      <div className="postcard__body">
        {personFirst ? null : author}

        {personFirst ? (
          // The caption leads; the generated artwork, still labelled, sits
          // beside it as a thumbnail instead of filling the card.
          <div className="postcard__lead">
            <p className="postcard__caption">{post.caption}</p>
            <Art media={post.media} className="art postcard__thumb" />
          </div>
        ) : (
          <p>{post.caption}</p>
        )}

        <div className="row row--wrap">
          {post.practice !== null ? <span className="chip chip--context">{post.practice}</span> : null}
          {/* A heart is a thank-you, not a scoreboard: present, quiet, and
              never the primary affordance on the card (canon 04 §3.3). */}
          <button
            type="button"
            className={appreciated ? 'btn btn--small btn--primary' : 'btn btn--small btn--ghost'}
            onClick={() => void appreciate()}
            aria-pressed={appreciated}
            aria-label={appreciated ? `Appreciated — ${count} in total` : `Appreciate — ${count} so far`}
          >
            ♥ {count}
          </button>
        </div>

        {error !== null ? <p className="notice notice--warn">{error}</p> : null}

        <div className="actions">
          {actions.map((action) =>
            action.kind === 'see_activity' ? (
              <Link
                key={action.kind}
                className={action.kind === leadAction ? 'btn btn--small btn--primary' : 'btn btn--small'}
                href={`/p/${post.author.handle}`}
                aria-disabled={!action.enabled}
              >
                {action.label}
              </Link>
            ) : (
              <Link
                key={action.kind}
                className={action.kind === leadAction ? 'btn btn--small btn--primary' : 'btn btn--small'}
                href={action.enabled ? compose(action.signalType ?? 'ask') : '#'}
                aria-disabled={!action.enabled}
                data-disabled={!action.enabled}
              >
                {action.label}
              </Link>
            ),
          )}
        </div>

        {breakdown === undefined ? null : (
          <details className="why">
            <summary>Why am I seeing this?</summary>
            <dl>
              {Object.entries(breakdown).map(([term, value]) => (
                <div key={term} style={{ display: 'contents' }}>
                  <dt>{whyLabel(term)}</dt>
                  <dd>{value.toFixed(3)}</dd>
                </div>
              ))}
            </dl>
          </details>
        )}

        <SafetyMenu
          targetType="post"
          targetId={post.id}
          personId={post.author.id}
          personName={post.author.displayName}
        />
      </div>
    </article>
  );
}
