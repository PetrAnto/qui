import Link from 'next/link';

import { Logo } from '../Logo';

/**
 * Landing header (canon 03 §3): wordmark left, a handful of anchors and the
 * primary CTA right. Deliberately no large navigation taxonomy — the product
 * is a demo, not a live service with twelve marketing pages.
 */
export function LandingHeader() {
  return (
    <header className="lhead">
      <Link href="/welcome" aria-label="QUI — home" className="lhead__brand">
        <Logo size={26} />
      </Link>
      <nav className="lhead__nav" aria-label="Landing">
        <a href="#how-it-works">How it works</a>
        <a href="#principles">Principles</a>
        <a href="https://github.com/PetrAnto/qui" rel="noreferrer">
          Open source
        </a>
        <a className="btn btn--small btn--primary" href="#get-access">
          Get early access
        </a>
      </nav>
    </header>
  );
}
