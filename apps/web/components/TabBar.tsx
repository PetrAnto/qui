'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { TABS, isActiveTab } from '../lib/nav';

export function TabBar() {
  const pathname = usePathname();
  if (pathname === '/welcome' || pathname === '/welcome/') return null;
  return (
    <nav className="tabbar" aria-label="Main">
      {TABS.map((tab) => (
        <Link
          key={tab.href}
          href={tab.href}
          className="tabbar__item"
          data-active={isActiveTab(tab.href, pathname)}
          aria-current={isActiveTab(tab.href, pathname) ? 'page' : undefined}
        >
          <span className="tabbar__glyph" aria-hidden="true">
            {tab.glyph}
          </span>
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}
