'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronRight } from 'lucide-react';
import React from 'react';
import styles from './Breadcrumbs.module.css';

export function Breadcrumbs(): React.ReactNode {
  const pathname = usePathname();
  
  if (pathname === '/') return null;

  const pathSegments = pathname.split('/').filter((segment: string) => segment !== '');

  const formatSegment = (segment: string) => {
    return segment
      .replace(/-/g, ' ')
      .replace(/\b\w/g, (char) => char.toUpperCase());
  };

  return (
    <nav aria-label="Breadcrumb" className={styles.nav}>
      <ol className={styles.list}>
        <li>
          <Link href="/" className={styles.link}>
            Home
          </Link>
        </li>
        {pathSegments.map((segment: string, index: number) => {
          const isLast = index === pathSegments.length - 1;
          const href = `/${pathSegments.slice(0, index + 1).join('/')}`;

          return (
            <React.Fragment key={segment}>
              <ChevronRight size={16} className={styles.separator} />
              <li>
                {isLast ? (
                  <span className={styles.active} aria-current="page">
                    {formatSegment(segment)}
                  </span>
                ) : (
                  <Link href={href} className={styles.link}>
                    {formatSegment(segment)}
                  </Link>
                )}
              </li>
            </React.Fragment>
          );
        })}
      </ol>
    </nav>
  );
}
