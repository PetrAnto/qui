/**
 * The whole navigation surface.
 *
 * Five destinations, thumb-reachable, no hamburger and no nested menus. Every
 * one of them is a place a person has a reason to return to; anything that is
 * only reached once (onboarding, a composer, the internal insights view) is
 * deliberately not a tab.
 */
export interface Tab {
  readonly href: string;
  readonly label: string;
  readonly glyph: string;
}

export const TABS: readonly Tab[] = [
  { href: '/', label: 'Discover', glyph: '◎' },
  { href: '/signals', label: 'Signals', glyph: '↯' },
  { href: '/threads', label: 'Threads', glyph: '❝' },
  { href: '/places', label: 'Places', glyph: '⌖' },
  { href: '/me', label: 'You', glyph: '☺' },
];

export function isActiveTab(href: string, pathname: string): boolean {
  return href === '/' ? pathname === '/' : pathname.startsWith(href);
}
