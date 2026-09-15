/**
 * The whole navigation surface.
 *
 * Five destinations, thumb-reachable, no hamburger and no nested menus — the
 * canonical IA (docs/canon/04_APPLICATION_UX_SYSTEM.md §1.1): Discover,
 * Signals, Create, Activity, Me. City is a global context, not a tab, so
 * Places lives under Me/city context; Threads semantics feed Activity without
 * weakening the scoped-contact rule (a thread is still only ever a
 * consequence of a Signal, INV-DM-1).
 */
export interface Tab {
  readonly href: string;
  readonly label: string;
  readonly glyph: string;
}

export const TABS: readonly Tab[] = [
  { href: '/', label: 'Discover', glyph: '◎' },
  { href: '/signals', label: 'Signals', glyph: '↯' },
  { href: '/create', label: 'Create', glyph: '+' },
  { href: '/activity', label: 'Activity', glyph: '❝' },
  { href: '/me', label: 'Me', glyph: '☺' },
];

/** Legacy groupings: thread detail pages answer to Activity now. */
const TAB_ALIASES: Readonly<Record<string, readonly string[]>> = {
  '/activity': ['/threads'],
};

export function isActiveTab(href: string, pathname: string): boolean {
  if (href === '/') return pathname === '/';
  if (pathname.startsWith(href)) return true;
  return (TAB_ALIASES[href] ?? []).some((alias) => pathname.startsWith(alias));
}
