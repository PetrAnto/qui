import type { Metadata, Viewport } from 'next';
import localFont from 'next/font/local';
import type { ReactNode } from 'react';

import { GEO_ATTRIBUTION } from '@indenoi/geo';

import { DemoBanner } from '../components/DemoBanner';
import { TabBar } from '../components/TabBar';

import './globals.css';

/**
 * Geist Sans, the canon's product typeface (01_BRAND_SYSTEM.md §4.2), served
 * from this repository (app/fonts/geist — provenance and OFL licence there).
 * One variable file covers every weight the UI uses, 600 headings included.
 */
const geist = localFont({
  src: './fonts/geist/Geist-Variable.woff2',
  weight: '100 900',
  style: 'normal',
  display: 'swap',
  variable: '--font-geist',
});

export const metadata: Metadata = {
  title: 'QUI — the people around you',
  description:
    'QUI is a local social world: see the people, practices and opportunities close enough to matter. Synthetic demo — not a live service.',
  // Demo over invented people; do not let a search engine treat it as live.
  robots: { index: false, follow: false },
  openGraph: {
    title: 'QUI',
    description: 'Make the people around us visible again.',
    siteName: 'QUI',
    type: 'website',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#faf8f4',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={geist.variable}>
      <body>
        <a className="skip-link" href="#main">
          Skip to content
        </a>
        <div className="app">
          <DemoBanner />
          <main id="main" className="app__main" tabIndex={-1}>
            {children}
          </main>
          <footer className="faint site-footer">
            {GEO_ATTRIBUTION}
          </footer>
          <TabBar />
        </div>
      </body>
    </html>
  );
}
