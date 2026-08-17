import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';

import { GEO_ATTRIBUTION } from '@indenoi/geo';

import { DemoBanner } from '../components/DemoBanner';
import { TabBar } from '../components/TabBar';

import './globals.css';

export const metadata: Metadata = {
  title: 'indenoi — what is happening around you',
  description:
    'A local-first social product: see what people near you actually do, and turn it into meeting them. Demo build with synthetic data.',
  // Nothing here is meant to be indexed or shared: it is a demo over invented
  // people, and a search engine result would misrepresent it as a live service.
  robots: { index: false, follow: false },
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
