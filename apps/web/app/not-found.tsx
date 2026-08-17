import Link from 'next/link';

/**
 * One page for "does not exist" and for "you may not see this". A viewer who
 * has been blocked must not be able to tell the two apart (INV-BLOCK-1).
 */
export default function NotFound() {
  return (
    <>
      <header className="pagehead">
        <h1>Not available</h1>
        <p className="pagehead__sub">
          This is either gone, or not something you can see. We do not say which.
        </p>
      </header>
      <Link className="btn btn--primary btn--block" href="/">
        Back to Discover
      </Link>
    </>
  );
}
