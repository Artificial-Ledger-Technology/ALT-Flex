'use client';

import { Menu, Search, Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { Breadcrumbs } from './Breadcrumbs';
import { useEffect, useState } from 'react';
import styles from './Header.module.css';

interface HeaderProps {
  onMenuAction: () => void;
  isMenuOpen: boolean;
}

export function Header({ onMenuAction, isMenuOpen }: HeaderProps): React.ReactNode {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Avoid hydration mismatch by only rendering theme toggle after mount
  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <header className={styles.header}>
      <div className={styles.leftSection}>
        <button
          className={styles.mobileMenuBtn}
          onClick={onMenuAction}
          aria-label="Toggle menu"
          aria-expanded={isMenuOpen}
          aria-controls="sidebar-nav"
        >
          <Menu />
        </button>

        <div className={styles.breadcrumbsContainer}>
          <Breadcrumbs />
        </div>

        <div className={styles.searchContainer}>
          <Search className={styles.searchIcon} aria-hidden="true" />
          <input
            type="text"
            placeholder="Search protocols, incidents..."
            className={styles.searchInput}
            aria-label="Search"
          />
        </div>
      </div>

      <div className={styles.rightSection}>
        {mounted && (
          <button
            className={styles.iconBtn}
            aria-label="Toggle theme"
            title="Toggle light/dark theme"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          >
            {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
          </button>
        )}
      </div>
    </header>
  );
}
