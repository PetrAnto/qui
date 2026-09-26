import type { Post, Report, ModerationCase, Signal } from '../types';
import { canSeeAudience, isAdult, isMinor } from './age';
import { ALLOW, all, deny, requireActive, type ActorView, type Decision } from './decision';
import type { SafetyGraph } from './graph';

/**
 * INV-BLOCK-1. A block removes the other account from view in both directions.
 * Every read path funnels through here.
 */
export function canViewProfile(viewer: ActorView, subject: ActorView, graph: SafetyGraph): Decision {
  if (viewer.id === subject.id) return ALLOW;
  if (graph.isBlockedBetween(viewer.id, subject.id)) return deny('blocked');
  if (subject.accountState === 'suspended') return deny('author_suspended');
  return ALLOW;
}

/**
 * INV-AGE-3. People discovery is the surface where an adult browses strangers.
 * Minors are not in it. They remain reachable through the content they publish
 * in their own city, which is a passive surface, not a people catalogue.
 */
export function canDiscoverUser(viewer: ActorView, subject: ActorView, graph: SafetyGraph): Decision {
  if (viewer.id === subject.id) return deny('self');
  const visible = canViewProfile(viewer, subject, graph);
  if (!visible.allowed) return visible;
  if (!subject.capabilities.has('appear_in_people_discovery')) return deny('missing_capability');
  if (isMinor(subject) && isAdult(viewer)) return deny('minor_not_discoverable');
  return ALLOW;
}

export function canViewPost(
  viewer: ActorView,
  post: Post,
  author: ActorView,
  graph: SafetyGraph,
): Decision {
  if (post.state === 'removed') return deny('content_removed');
  if (viewer.id === author.id) return ALLOW;
  if (graph.isBlockedBetween(viewer.id, author.id)) return deny('blocked');
  if (author.accountState === 'suspended') return deny('author_suspended');
  if (post.state === 'distribution_restricted') return deny('distribution_restricted');
  return canSeeAudience(viewer, post.audience);
}

/**
 * Whether a viewer may read a signal at all — including by direct link. This
 * is the floor every surface applies before loading or projecting anything
 * about the signal:
 *
 *  - removed content is gone for everybody;
 *  - INV-BLOCK-1: a blocked pair never sees each other's signals;
 *  - INV-SUSPEND-1: a suspended author's content disappears for everyone
 *    else, while the author keeps read access to their own state;
 *  - INV-AGE-4: adult-audience signals never reach a minor.
 *
 * A distribution-restricted author is *not* hidden here: restriction removes
 * amplification, not the content, so a direct link still works.
 */
export function canReadSignal(
  viewer: ActorView,
  signal: Signal,
  author: ActorView,
  graph: SafetyGraph,
): Decision {
  if (signal.state === 'removed') return deny('content_removed');
  if (viewer.id === author.id) return ALLOW;
  if (graph.isBlockedBetween(viewer.id, author.id)) return deny('blocked');
  if (author.accountState === 'suspended') return deny('author_suspended');
  return canSeeAudience(viewer, signal.audience);
}

/**
 * Whether a signal may be *distributed* to a viewer — listed in Signals,
 * returned by activity search, or anywhere else it is offered for discovery.
 * Everything `canReadSignal` refuses, plus a distribution-restricted author's
 * signals for anyone but the author (INV-SUSPEND-1: the account keeps its
 * voice but loses amplification). Applied before projection, ranking or
 * matching, so hidden signals are removed, not demoted or counted.
 */
export function canViewSignal(
  viewer: ActorView,
  signal: Signal,
  author: ActorView,
  graph: SafetyGraph,
): Decision {
  const readable = canReadSignal(viewer, signal, author, graph);
  if (!readable.allowed) return readable;
  if (viewer.id !== author.id && author.accountState === 'distribution_restricted') {
    return deny('distribution_restricted');
  }
  return ALLOW;
}

/** Media never has a looser rule than the post carrying it. */
export function canViewMedia(
  viewer: ActorView,
  post: Post,
  author: ActorView,
  graph: SafetyGraph,
): Decision {
  return canViewPost(viewer, post, author, graph);
}

/**
 * Appreciation is a feedback primitive on a piece of content. It is not a
 * rating of a human being, so it is not available on a profile.
 */
export function canAppreciate(
  viewer: ActorView,
  post: Post,
  author: ActorView,
  graph: SafetyGraph,
): Decision {
  if (viewer.id === author.id) return deny('self');
  return all(requireActive(viewer), canViewPost(viewer, post, author, graph));
}

/**
 * INV-MOD-1. A moderation case is private to the moderation function. The
 * reported person never learns who reported them, and a reporter only ever
 * sees their own report.
 */
export function canViewModerationCase(viewer: ActorView, _case: ModerationCase): Decision {
  return viewer.role === 'moderator' ? ALLOW : deny('moderation_private');
}

export function canViewReport(viewer: ActorView, report: Report): Decision {
  if (viewer.role === 'moderator') return ALLOW;
  return viewer.id === report.reporterId ? ALLOW : deny('moderation_private');
}
