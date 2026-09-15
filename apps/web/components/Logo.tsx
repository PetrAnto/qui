/**
 * QUI identity — the single asset boundary for the brand mark.
 *
 * Direction (docs/canon/01_BRAND_SYSTEM.md §2.1, LOCKED): a coral Q ring with
 * a dark lower-right tail, plus three short signal/radiance strokes above the
 * upper-right of the Q in expressive contexts.
 *
 * Provenance honesty (canon §2.5): the owner-supplied brand board is a visual
 * reference, not a production vector master. The symbol geometry below is an
 * interim clean-room SVG drawn only from the locked textual description —
 * ring, tail, three strokes — and nothing else.
 *
 * The wordmark is deliberately absent: canon §4.1 LOCKs it as a custom asset
 * that must not be recreated from the product typeface, and no vector master
 * exists in this repository. Until the owner supplies one, surfaces use the
 * standalone symbol (canon §2.3 form 2) and plain UI text names the product —
 * never a styled pseudo-wordmark. Do not invent a different logo.
 *
 * Approved forms (canon §2.3): symbol and the app icon (`app/icon.svg`, kept
 * in sync with `LogoSymbol`) are the forms this repo can support honestly.
 */

type Mono = 'dark' | 'light';

interface SymbolProps {
  /** Rendered height in px; width follows the square viewBox. */
  readonly size?: number;
  /** The three radiance strokes are for expressive contexts (canon §2.1). */
  readonly expressive?: boolean;
  /** One-color variant: Ink for light surfaces, Ivory for dark ones. */
  readonly mono?: Mono;
  readonly title?: string;
}

const CORAL = 'var(--color-brand)';
const INK = '#0f1b2b';
const IVORY = '#faf8f4';

export function LogoSymbol({ size = 28, expressive = true, mono, title }: SymbolProps) {
  const ring = mono === 'dark' ? INK : mono === 'light' ? IVORY : CORAL;
  const tail = mono === 'light' ? IVORY : INK;
  return (
    <svg
      viewBox="0 0 64 64"
      width={size}
      height={size}
      role={title === undefined ? 'presentation' : 'img'}
      aria-label={title}
      focusable="false"
    >
      {expressive ? (
        <g stroke={ring} strokeWidth={4} strokeLinecap="round">
          <line x1="38.9" y1="7.6" x2="37.2" y2="12.3" />
          <line x1="46.7" y1="12.1" x2="43.5" y2="15.9" />
          <line x1="52.5" y1="19" x2="48.2" y2="21.5" />
        </g>
      ) : null}
      <circle cx="30" cy="32" r="17" fill="none" stroke={ring} strokeWidth="7" />
      <line x1="41" y1="43" x2="52" y2="54" stroke={tail} strokeWidth="7" strokeLinecap="round" />
    </svg>
  );
}

/** The only lockup this repo may ship until the wordmark master exists. */
export function Logo({
  size = 28,
  mono,
  expressive = true,
}: {
  readonly size?: number;
  readonly mono?: Mono;
  readonly expressive?: boolean;
}) {
  return (
    <span className={mono === 'light' ? 'logo logo--on-dark' : 'logo'}>
      <LogoSymbol size={size} expressive={expressive} mono={mono} title="QUI" />
    </span>
  );
}
