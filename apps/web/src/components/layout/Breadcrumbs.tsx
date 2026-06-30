'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronRight } from 'lucide-react';
import React from 'react';

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
    <nav aria-label="Breadcrumb" className="flex items-center text-sm" style={{ display: 'flex', alignItems: 'center', fontSize: 'var(--font-size-sm)', color: 'var(--text-muted)' }}>
      <ol style={{ display: 'flex', alignItems: 'center', margin: 0, padding: 0, listStyle: 'none' }}>
        <li>
          <Link href="/" style={{ color: 'var(--text-muted)' }} className="hover:text-primary transition-colors">
            Home
          </Link>
        </li>
        {pathSegments.map((segment: string, index: number) => {
          const isLast = index === pathSegments.length - 1;
          const href = `/${pathSegments.slice(0, index + 1).join('/')}`;

          return (
            <React.Fragment key={segment}>
              <ChevronRight size={16} style={{ margin: '0 var(--space-1)', opacity: 0.5 }} />
              <li>
                {isLast ? (
                  <span style={{ color: 'var(--text-primary)', fontWeight: 500 }} aria-current="page">
                    {formatSegment(segment)}
                  </span>
                ) : (
                  <Link href={href} style={{ color: 'var(--text-muted)' }} className="hover:text-primary transition-colors">
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
