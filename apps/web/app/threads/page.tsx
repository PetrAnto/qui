import { redirect } from 'next/navigation';

/**
 * Backwards-compatible route: Threads consolidated into Activity in the
 * canonical IA (#37). Thread detail pages keep their `/threads/[id]` URLs;
 * only the list moved.
 */
export default function ThreadsRedirect() {
  redirect('/activity');
}
