'use client';

import { Menu, Search, Moon } from 'lucide-react';
import styles from './Header.module.css';

interface HeaderProps {
  onMenuClick: () => void;
}

export function Header({ onMenuClick }: HeaderProps): React.ReactNode {
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
        <button 
          className={styles.iconBtn} 
          aria-label="Toggle dark mode"
          title="Dark mode is default for AEGIS v3.0"
        >
          <Moon size={20} />
        </button>
      </div>
    </header>
  );
}
