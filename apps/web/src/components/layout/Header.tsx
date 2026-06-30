'use client';

import { Menu, Search, Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { Breadcrumbs } from './Breadcrumbs';
import { useEffect, useState } from 'react';
import styles from './Header.module.css';

interface HeaderProps {
  onMenuClick: () => void;
}

export function Header({ onMenuClick }: HeaderProps): React.ReactNode {
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
          onClick={onMenuClick}
          aria-label="Toggle menu"
        >
          <Menu />
        </button>
        
        <div className={styles.breadcrumbsContainer}>
          <Breadcrumbs />
        </div>
        
        <div className={styles.searchContainer}>
          <Search className={styles.searchIcon} />
          <input 
            type="text" 
            placeholder="Search protocols, incidents..." 
            className={styles.searchInput}
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
