import Link from 'next/link';

import { Logo } from '../Logo';

const SECTION_LINKS = [
  { href: '#how-it-works', label: 'How it works' },
  { href: '#principles', label: 'Principles' },
  { href: 'https://github.com/PetrAnto/qui', label: 'Open source' },
] as const;

/**
 * Landing header (canon 03 §3): symbol left, a handful of anchors and the
 * primary CTA right. On mobile the secondary links collapse into a compact
 * menu rather than disappearing; details/summary keeps that menu keyboard-
 * and reader-accessible without client code. Deliberately no large
 * navigation taxonomy — the product is a demo, not a live service.
 *
 * The header shows the standalone Q symbol only: the wordmark is a LOCKED
 * custom asset and no vector master exists in this repo yet (canon 01 §4.1),
 * so plain text names the product and the symbol carries the identity.
 */
export function LandingHeader() {
  return (
    <header className="lhead">
      <Link href="/welcome" aria-label="QUI — home" className="lhead__brand">
        <Logo size={26} />
      </Link>
      <nav className="lhead__nav" aria-label="Landing">
        {SECTION_LINKS.map((link) => (
          <a key={link.href} href={link.href} {...(link.href.startsWith('http') ? { rel: 'noreferrer' } : {})}>
            {link.label}
          </a>
        ))}
        <details className="lhead__menu">
          <summary aria-label="More links">Menu</summary>
          <div className="lhead__sheet">
            {SECTION_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                {...(link.href.startsWith('http') ? { rel: 'noreferrer' } : {})}
              >
                {link.label}
              </a>
            ))}
          </div>
        </details>
        <a className="btn btn--primary" href="#get-access">
          Get early access
        </a>
      </nav>
    </header>
  );
}
