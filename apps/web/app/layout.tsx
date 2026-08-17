import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';

import { GEO_ATTRIBUTION } from '@indenoi/geo';

import { DemoBanner } from '../components/DemoBanner';
import { TabBar } from '../components/TabBar';

import './globals.css';

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
  themeColor: '#0b0d12',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
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
