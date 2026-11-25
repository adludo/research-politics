'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import styles from './SiteNavigation.module.css';

const links = [
  { href: '/', label: 'Overview' },
  { href: '/verification/', label: 'Verification' },
];

export default function SiteNavigation() {
  const pathname = usePathname();

  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <Link className={styles.brand} href="/" aria-label="Research Politics home">
          <svg viewBox="0 0 32 32" width="32" height="32" fill="none" aria-hidden="true">
            <rect width="32" height="32" rx="9" fill="currentColor" />
            <path d="M10 22V10h5a4 4 0 0 1 0 8h-5m7 0 5 4" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span>Research Politics</span>
        </Link>
        <nav className={styles.links} aria-label="Main navigation">
          {links.map(link => {
            const isCurrentPage = pathname?.replace(/\/$/, '') === link.href.replace(/\/$/, '');
            const isElectionOverview = link.href === '/' && pathname?.startsWith('/elections/');
            const current = isCurrentPage ? 'page' : isElectionOverview ? 'true' : undefined;
            return <Link key={link.href} href={link.href} aria-current={current}>{link.label}</Link>;
          })}
        </nav>
      </div>
    </header>
  );
}
