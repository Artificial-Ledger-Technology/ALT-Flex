'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Shield, BrainCircuit, ScanSearch, Microscope } from 'lucide-react';
import styles from './Sidebar.module.css';

const NAV_ITEMS = [
  {
    name: 'Hacks Dashboard',
    href: '/hacks',
    icon: Shield,
    disabled: false,
  },
  {
    name: 'AI Skills Explorer',
    href: '/skills',
    icon: BrainCircuit,
    disabled: false,
  },
  {
    name: 'Safety Dashboard',
    href: '/safety',
    icon: ScanSearch,
    disabled: false,
  },
  {
    name: 'Forensics',
    href: '#',
    icon: Microscope,
    disabled: true,
  },
];

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export function Sidebar({ isOpen = false, onClose }: SidebarProps): React.ReactNode {
  const pathname = usePathname();

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && <div className="fixed inset-0 bg-black/50 z-30 lg:hidden" onClick={onClose} />}

      <aside className={`${styles.sidebar} ${isOpen ? styles.sidebarOpen : ''}`}>
        <div className={styles.logoContainer}>
          <Shield className="w-8 h-8 text-cyan-400" style={{ color: 'var(--accent-cyan)' }} />
          <span className={styles.logoText}>
            ALTFlex <span className={styles.logoAccent}>AEGIS</span>
          </span>
        </div>

        <nav className={styles.nav} aria-label="Main Navigation">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = pathname.startsWith(item.href) && item.href !== '#';

            if (item.disabled) {
              return (
                <div
                  key={item.name}
                  className={`${styles.navLink} ${styles.navLinkDisabled}`}
                  title="Coming Soon"
                  aria-disabled="true"
                  tabIndex={-1}
                >
                  <Icon className={styles.navIcon} aria-hidden="true" />
                  <span>{item.name}</span>
                </div>
              );
            }

            return (
              <Link
                key={item.name}
                href={item.href}
                className={`${styles.navLink} ${isActive ? styles.navLinkActive : ''}`}
                onClick={onClose ? (): void => onClose() : (): void => {}}
                aria-current={isActive ? 'page' : undefined}
              >
                <Icon className={styles.navIcon} aria-hidden="true" />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>
      </aside>
    </>
  );
}
